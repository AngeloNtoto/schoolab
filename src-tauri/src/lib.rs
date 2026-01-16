mod db;
mod server;
mod sync;

use chrono::{DateTime, Duration, Utc};
use log::{error, info};
use machine_uid;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug)]
pub struct LicenseInfo {
    pub active: bool,
    pub is_trial: bool,
    pub days_remaining: i64,
    pub expires_at: String,
    pub is_expired: bool,
    pub is_blocked: bool,
    pub clock_tampered: bool,
    pub key: Option<String>,
    pub hwid: String,
    pub plan: String,
}

#[derive(Serialize, Deserialize)]
pub struct ActivationResult {
    pub success: bool,
    pub error: Option<String>,
    pub token: Option<String>,
    pub expires_at: Option<String>,
    pub plan: Option<String>,
    pub school: Option<SchoolInfo>,
}

#[derive(Serialize, Deserialize)]
pub struct SchoolInfo {
    pub id: String,
    pub name: String,
    pub city: String,
    pub pobox: Option<String>,
}

// Global utilities for internal use
pub fn get_db_path(app_handle: &tauri::AppHandle) -> PathBuf {
    let db_name = if cfg!(debug_assertions) {
        "dev.db"
    } else {
        "ecole.db"
    };
    let mut path = app_handle.path().app_data_dir().unwrap();
    std::fs::create_dir_all(&path).ok();
    path.push(db_name);
    path
}

pub fn get_hwid_internal() -> String {
    machine_uid::get().unwrap_or_else(|_| "UNKNOWN-DEVICE".to_string())
}

pub fn get_cloud_url() -> String {
    dotenvy::dotenv().ok();
    std::env::var("CLOUD_URL").unwrap_or_else(|_| "http://localhost:3000".to_string())
}

/// Migrates the database from the old Electron userData directory to the new Tauri appData directory.
fn migrate_from_electron(app_handle: &tauri::AppHandle) -> Result<(), String> {
    info!("Migration: Checking for Electron database to migrate...");
    let new_db_path = get_db_path(app_handle);

    // If the new database already exists, we only migrate if it's "fresh" (no school name set)
    if new_db_path.exists() {
        if let Ok(conn) = Connection::open(&new_db_path) {
            let school_name: Option<String> = conn
                .query_row(
                    "SELECT value FROM settings WHERE key = 'school_name'",
                    [],
                    |row| row.get(0),
                )
                .ok();

            if school_name.is_some() {
                info!("Migration: New database already has data, skipping migration.");
                return Ok(());
            }
            info!("Migration: New database exists but is empty, proceeding with migration check.");
        }
    }

    // Determine the old Electron userData directory based on the OS.
    let old_user_data_dir = if cfg!(target_os = "linux") {
        app_handle
            .path()
            .config_dir()
            .ok()
            .map(|p| p.join("Schoolab"))
    } else if cfg!(target_os = "macos") {
        // Electron on macOS: ~/Library/Application Support/Schoolab
        app_handle
            .path()
            .data_dir()
            .ok()
            .map(|p| p.join("Application Support").join("Schoolab"))
    } else if cfg!(target_os = "windows") {
        app_handle
            .path()
            .config_dir()
            .ok()
            .map(|p| p.join("Schoolab"))
    } else {
        None
    };

    if let Some(old_dir) = old_user_data_dir {
        if !old_dir.exists() {
            info!(
                "Migration: Old Electron directory not found at {:?}",
                old_dir
            );
            return Ok(());
        }

        // Check for ecole.db (production) or dev.db (development)
        let db_names = ["ecole.db", "dev.db"];
        let mut found_db = None;

        for name in db_names {
            let path = old_dir.join(name);
            if path.exists() {
                found_db = Some(path);
                break;
            }
        }

        if let Some(old_path) = found_db {
            info!("Migration: Old Electron database found at {:?}", old_path);
            info!("Migration: Copying to {:?}", new_db_path);

            // Ensure parent directory exists for the new path
            if let Some(parent) = new_db_path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create new app data dir: {}", e))?;
            }

            // In Tauri, we use dev.db in debug and ecole.db in release.
            // But if we are migrating, we might want to respect the source name?
            // Actually, the user wants dev.db in dev and ecole.db in prod.
            // So we copy WHATEVER we found to the CURRENT new_db_path.
            std::fs::copy(&old_path, &new_db_path)
                .map_err(|e| format!("Failed to copy database: {}", e))?;

            info!("Migration: Database migrated successfully.");
        } else {
            info!(
                "Migration: No old Electron database (ecole.db or dev.db) found in {:?}",
                old_dir
            );
        }
    } else {
        info!("Migration: Could not determine old Electron directory for this OS.");
    }

    Ok(())
}

#[tauri::command]
fn get_hwid() -> String {
    get_hwid_internal()
}

#[tauri::command]
async fn get_license_info(app_handle: tauri::AppHandle) -> Result<LicenseInfo, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let get_setting = |key: &str| -> Option<String> {
        conn.query_row(
            "SELECT value FROM settings WHERE key = ?",
            params![key],
            |row| row.get(0),
        )
        .ok()
    };

    let license_key = get_setting("license_key");
    let expires_at_str = get_setting("license_expires_at");
    let trial_start_str = get_setting("trial_start_date");
    let last_seen_str = get_setting("license_last_seen_date");
    let plan = get_setting("license_plan").unwrap_or_else(|| "TRIAL".to_string());

    let now = Utc::now();
    let mut clock_tampered = false;

    if let Some(last_seen_val) = last_seen_str {
        if let Ok(last_seen) = DateTime::parse_from_rfc3339(&last_seen_val) {
            let last_seen_utc = last_seen.with_timezone(&Utc);
            if now < last_seen_utc - Duration::minutes(5) {
                clock_tampered = true;
            }
        }
    }

    if !clock_tampered {
        let _ = conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('license_last_seen_date', ?)",
            params![now.to_rfc3339()],
        );
    }

    let expires_at: DateTime<Utc>;
    let is_trial: bool;

    if let (Some(_), Some(expires_val)) = (license_key.as_ref(), expires_at_str.as_ref()) {
        expires_at = DateTime::parse_from_rfc3339(expires_val)
            .map(|d| d.with_timezone(&Utc))
            .unwrap_or(now);
        is_trial = false;
    } else {
        is_trial = true;
        let start_str = trial_start_str.unwrap_or_else(|| now.to_rfc3339());
        let start = DateTime::parse_from_rfc3339(&start_str)
            .map(|d| d.with_timezone(&Utc))
            .unwrap_or(now);
        expires_at = start + Duration::days(14);
    }

    let diff = expires_at - now;
    let days_remaining = diff.num_days().max(0);
    let is_expired = diff.num_milliseconds() <= 0;

    Ok(LicenseInfo {
        active: license_key.is_some() && !is_expired && !clock_tampered,
        is_trial,
        days_remaining,
        expires_at: expires_at.to_rfc3339(),
        is_expired,
        is_blocked: is_expired || clock_tampered,
        clock_tampered,
        key: license_key,
        hwid: get_hwid_internal(),
        plan,
    })
}

// Local authentication utilities
fn simple_hash(s: &str) -> String {
    let mut hash: i32 = 0;
    for c in s.chars() {
        let char_code = c as i32;
        hash = hash
            .wrapping_shl(5)
            .wrapping_sub(hash)
            .wrapping_add(char_code);
    }
    format!("{:x}", hash)
}

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct AuthCheckResult {
    pub hasPassword: bool,
}

#[derive(Serialize)]
pub struct AuthResult {
    pub success: bool,
    pub valid: bool,
}

#[tauri::command]
async fn auth_check(app_handle: tauri::AppHandle) -> Result<AuthCheckResult, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let hash: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'local_password_hash'",
            [],
            |r| r.get(0),
        )
        .ok();

    Ok(AuthCheckResult {
        hasPassword: hash.is_some(),
    })
}

#[tauri::command]
async fn auth_create(app_handle: tauri::AppHandle, password: String) -> Result<AuthResult, String> {
    info!("Creating local password...");
    let db_path = get_db_path(&app_handle);
    info!("Database path: {:?}", db_path);
    let conn = Connection::open(db_path).map_err(|e| {
        error!("Failed to open DB for auth_create: {}", e);
        e.to_string()
    })?;

    let hash = simple_hash(&password);
    info!("Hashing password and saving to settings...");
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('local_password_hash', ?)",
        params![hash],
    )
    .map_err(|e| {
        error!("SQL error in auth_create: {}", e);
        e.to_string()
    })?;

    info!("Local password created successfully.");
    Ok(AuthResult {
        success: true,
        valid: true,
    })
}

#[tauri::command]
async fn auth_verify(app_handle: tauri::AppHandle, password: String) -> Result<AuthResult, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let stored_hash: String = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'local_password_hash'",
            [],
            |r| r.get(0),
        )
        .map_err(|_| "NO_PASSWORD_SET".to_string())?;

    let input_hash = simple_hash(&password);

    Ok(AuthResult {
        success: true,
        valid: stored_hash == input_hash,
    })
}

#[allow(non_snake_case)]
#[derive(Serialize)]
pub struct SyncStatusResult {
    pub overdue: bool,
    pub dirtyCount: i32,
}

#[tauri::command]
async fn check_sync_status(app_handle: tauri::AppHandle) -> Result<SyncStatusResult, String> {
    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let tables = vec![
        "academic_years",
        "classes",
        "students",
        "subjects",
        "grades",
        "notes",
        "domains",
    ];
    let mut dirty_count: i32 = 0;
    let mut overdue = false;

    for table in tables {
        let count: i32 = conn
            .query_row(
                &format!("SELECT COUNT(*) FROM {} WHERE is_dirty = 1", table),
                [],
                |r| r.get(0),
            )
            .unwrap_or(0);
        dirty_count += count;

        if !overdue {
            let is_overdue: bool = conn.query_row(
                &format!("SELECT EXISTS(SELECT 1 FROM {} WHERE is_dirty = 1 AND (julianday('now') - julianday(last_modified_at)) * 24 > 24)", table),
                [],
                |r| r.get(0),
            ).unwrap_or(false);
            if is_overdue {
                overdue = true;
            }
        }
    }

    Ok(SyncStatusResult {
        overdue,
        dirtyCount: dirty_count,
    })
}

#[tauri::command]
async fn activate_license(
    app_handle: tauri::AppHandle,
    key: String,
    password: Option<String>,
) -> Result<ActivationResult, String> {
    let hwid = get_hwid_internal();
    info!(
        "Attempting to activate license. Key: {}, HWID: {}",
        key, hwid
    );
    let client = reqwest::Client::new();
    let url = format!("{}/api/license/activate", get_cloud_url());

    let payload = serde_json::json!({
        "key": key,
        "hwid": hwid,
        "password": password
    });

    let res = client
        .post(&url)
        .header(CONTENT_TYPE, "application/json")
        .json(&payload)
        .send()
        .await
        .map_err(|e| {
            error!("Network error during activation: {}", e);
            e.to_string()
        })?;

    let result: ActivationResult = res.json().await.map_err(|e| {
        error!("Failed to parse activation response: {}", e);
        e.to_string()
    })?;

    if result.success {
        info!("License activated successfully!");
        let db_path = get_db_path(&app_handle);
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('license_key', ?)",
            params![key],
        )
        .ok();
        if let Some(token) = &result.token {
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('license_token', ?)",
                params![token],
            )
            .ok();
        }
        if let Some(exp) = &result.expires_at {
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('license_expires_at', ?)",
                params![exp],
            )
            .ok();
        }
        if let Some(plan) = &result.plan {
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('license_plan', ?)",
                params![plan],
            )
            .ok();
        }
        if let Some(school) = &result.school {
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('school_id', ?)",
                params![school.id],
            )
            .ok();
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('school_name', ?)",
                params![school.name],
            )
            .ok();
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('school_city', ?)",
                params![school.city],
            )
            .ok();
            if let Some(pobox) = &school.pobox {
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES ('school_pobox', ?)",
                    params![pobox],
                )
                .ok();
            }
        }
    }

    Ok(result)
}

#[tauri::command]
async fn refresh_remote_license(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let db_path = get_db_path(&app_handle);

    let (school_id, token) = {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        let sid = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'school_id'",
                [],
                |row| row.get::<_, String>(0),
            )
            .map_err(|_| "NOT_LINKED")?;
        let tok = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'license_token'",
                [],
                |row| row.get::<_, String>(0),
            )
            .map_err(|_| "NOT_LINKED")?;
        (sid, tok)
    };

    let client = reqwest::Client::new();
    let url = format!(
        "{}/api/license/status?schoolId={}",
        get_cloud_url(),
        school_id
    );

    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("X-HWID", get_hwid_internal())
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let result: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

    if result["success"].as_bool().unwrap_or(false) {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        if result["license"]["active"].as_bool().unwrap_or(false) {
            if let Some(exp) = result["license"]["expiresAt"].as_str() {
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES ('license_expires_at', ?)",
                    params![exp],
                )
                .ok();
            }
            if let Some(plan) = result["license"]["plan"].as_str() {
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES ('license_plan', ?)",
                    params![plan],
                )
                .ok();
            }
        } else {
            let past_date = Utc::now() - Duration::days(1);
            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('license_expires_at', ?)",
                params![past_date.to_rfc3339()],
            )
            .ok();
        }

        let info = get_license_info(app_handle).await?;
        Ok(serde_json::json!({ "success": true, "info": info }))
    } else {
        Ok(serde_json::json!({ "success": false, "error": "Invalid server response" }))
    }
}

#[tauri::command]
async fn start_web_server(
    state: tauri::State<'_, Arc<server::AppState>>,
) -> Result<server::ServerInfo, String> {
    // En mode dev, on remonte d'un niveau depuis src-tauri pour atteindre dist-mobile
    // En production, dist-mobile sera dans le bundle Tauri
    let web_dist = std::env::current_dir()
        .unwrap_or_default()
        .parent()
        .map(|p| p.join("dist-mobile"))
        .unwrap_or_else(|| {
            std::env::current_dir()
                .unwrap_or_default()
                .join("dist-mobile")
        });

    log::info!("Chemin dist-mobile: {:?}", web_dist);
    server::start_server(state.inner().clone(), web_dist, 3030).await
}

#[tauri::command]
fn get_web_server_info() -> Option<server::ServerInfo> {
    server::get_server_info()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            #[cfg(debug_assertions)]
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;
            #[cfg(not(debug_assertions))]
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Warn)
                    .build(),
            )?;

            // Migrate from Electron if necessary
            if let Err(e) = migrate_from_electron(app.handle()) {
                error!("Migration error: {}", e);
            }

            let db_path = get_db_path(app.handle());
            info!("Initializing application...");
            info!("Database path: {:?}", db_path);
            db::initialize_db(&db_path).expect("Failed to initialize database");

            // Initialiser l'état partagé pour le serveur Marking Board
            let (tx, _) = tokio::sync::broadcast::channel(100);
            let state = Arc::new(server::AppState {
                db_path: db_path.clone(),
                tx,
                app_handle: app.handle().clone(),
            });

            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_hwid,
            get_license_info,
            activate_license,
            refresh_remote_license,
            sync::sync_start,
            auth_check,
            auth_create,
            auth_verify,
            check_sync_status,
            start_web_server,
            get_web_server_info,
            server::broadcast_db_change
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
