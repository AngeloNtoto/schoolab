mod db;
mod sync;

use chrono::{DateTime, Duration, Utc};
use machine_id_lib::get_id;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
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
    let mut path = app_handle.path().app_data_dir().unwrap();
    std::fs::create_dir_all(&path).ok();
    path.push("ecole.db");
    path
}

pub fn get_hwid_internal() -> String {
    get_id().unwrap_or_else(|_| "UNKNOWN-DEVICE".to_string())
}

pub fn get_cloud_url() -> String {
    dotenvy::dotenv().ok();
    std::env::var("CLOUD_URL").unwrap_or_else(|_| "http://localhost:3000".to_string())
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

#[tauri::command]
async fn activate_license(
    app_handle: tauri::AppHandle,
    key: String,
    password: Option<String>,
) -> Result<ActivationResult, String> {
    let hwid = get_hwid_internal();
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
        .map_err(|e| e.to_string())?;

    let result: ActivationResult = res.json().await.map_err(|e| e.to_string())?;

    if result.success {
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
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;

    let get_setting = |key: &str| -> Option<String> {
        conn.query_row(
            "SELECT value FROM settings WHERE key = ?",
            params![key],
            |row| row.get(0),
        )
        .ok()
    };

    let school_id = get_setting("school_id").ok_or("NOT_LINKED")?;
    let token = get_setting("license_token").ok_or("NOT_LINKED")?;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let db_path = get_db_path(app.handle());
            db::initialize_db(&db_path).expect("Failed to initialize database");

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_hwid,
            get_license_info,
            activate_license,
            refresh_remote_license,
            sync::sync_start
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
