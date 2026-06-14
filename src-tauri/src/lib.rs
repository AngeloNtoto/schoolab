mod db;
mod server;
mod sync;

use chrono::{DateTime, Duration, Utc};
use log::{error, info};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
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
    // Sur Linux, on lit /etc/machine-id
    // Pour les autres OS, on pourrait utiliser des commandes système ou d'autres fichiers
    if cfg!(target_os = "linux") {
        std::fs::read_to_string("/etc/machine-id")
            .map(|s| s.trim().to_string())
            .unwrap_or_else(|_| {
                // Fallback si machine-id n'est pas lisible
                std::fs::read_to_string("/var/lib/dbus/machine-id")
                    .map(|s| s.trim().to_string())
                    .unwrap_or_else(|_| "UNKNOWN-LINUX-DEVICE".to_string())
            })
    } else if cfg!(target_os = "windows") {
        // Sur Windows, on peut utiliser une commande via PowerShell ou lire le registre
        // Pour rester simple et éviter des dépendances lourdes:
        "WINDOWS-DEVICE".to_string() // À améliorer si nécessaire
    } else {
        "UNKNOWN-DEVICE".to_string()
    }
}

pub fn get_cloud_url() -> String {
    let url = dotenv_codegen::dotenv!("CLOUD_URL").to_string();
    // Note: On loggue la variable locale 'url' et non l'appel de fonction pour éviter la récursion infinie
    log::info!("Cloud URL: {}", url);
    url
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

        // Mise à jour des informations de l'école (Nouveau)
        if let Some(school) = result["school"].as_object() {
            if let Some(name) = school.get("name").and_then(|v| v.as_str()) {
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES ('school_name', ?)",
                    params![name],
                )
                .ok();
            }
            if let Some(city) = school.get("city").and_then(|v| v.as_str()) {
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES ('school_city', ?)",
                    params![city],
                )
                .ok();
            }
            if let Some(pobox) = school.get("pobox").and_then(|v| v.as_str()) {
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES ('school_pobox', ?)",
                    params![pobox],
                )
                .ok();
            }
        }

        let info = get_license_info(app_handle).await?;
        Ok(serde_json::json!({ "success": true, "info": info }))
    } else {
        Ok(serde_json::json!({ "success": false, "error": "Invalid server response" }))
    }
}

#[tauri::command]
async fn start_web_server(app_handle: tauri::AppHandle) -> Result<server::ServerInfo, String> {
    // En mode dev, on remonte d'un niveau depuis src-tauri pour atteindre dist-mobile
    // En production, dist-mobile sera dans le bundle Tauri
    // NB: tiny-server resolve logic is in server.rs, we just passed db_path

    // We need db_path here.
    let db_path = get_db_path(&app_handle);

    server::start_web_server(app_handle.clone(), db_path)
}

#[tauri::command]
fn get_web_server_info() -> Option<server::ServerInfo> {
    server::get_server_info()
}

// Grade prediction structures and functions
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PredictionResult {
    pub student_id: i32,
    pub student_name: String,
    pub subject_id: i32,
    pub subject_name: String,
    pub period: String,
    pub predicted_grade: f64,
    pub max_grade: f64,
    pub confidence: u8,
    pub reasoning: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PredictionParams {
    pub class_id: i32,
    pub student_ids: Option<Vec<i32>>,
    pub subject_ids: Option<Vec<i32>>,
    pub periods: Option<Vec<String>>,
    pub confidence_threshold: u8,
}

fn calculate_student_performance(
    conn: &Connection,
    student_id: i32,
    excluded_subject_id: i32,
    period: &str,
) -> Result<f64, String> {
    info!("  [student_perf] student_id={}, excluded_subject={}, period={}", student_id, excluded_subject_id, period);

    let max_col = match period {
        "P1" => "max_p1",
        "P2" => "max_p2",
        "EXAM1" => "max_exam1",
        "P3" => "max_p3",
        "P4" => "max_p4",
        "EXAM2" => "max_exam2",
        _ => "max_p1",
    };

    let query = format!(
        "SELECT g.value, s.{} as max_val
         FROM grades g
         JOIN subjects s ON g.subject_id = s.id
         WHERE g.student_id = ? AND g.subject_id != ? AND g.period = ?
         AND g.value IS NOT NULL AND g.value >= 0",
        max_col
    );

    let mut stmt = conn.prepare(&query).map_err(|e| {
        error!("  [student_perf] Failed to prepare: {}", e);
        e.to_string()
    })?;

    let grades_iter = stmt
        .query_map(rusqlite::params![student_id, excluded_subject_id, period], |row| {
            let value: f64 = row.get(0)?;
            let max: f64 = row.get(1)?;
            Ok((value, max))
        })
        .map_err(|e| {
            error!("  [student_perf] Failed to query: {}", e);
            e.to_string()
        })?;

    let mut percentages = Vec::new();
    for grade_result in grades_iter {
        let (value, max) = grade_result.map_err(|e| {
            error!("  [student_perf] Failed to get row: {}", e);
            e.to_string()
        })?;
        if max > 0.0 {
            percentages.push(value / max);
        }
    }

    if percentages.is_empty() {
        info!("  [student_perf] No grades found, returning 0.5");
        return Ok(0.5);
    }

    let avg = percentages.iter().sum::<f64>() / percentages.len() as f64;
    info!("  [student_perf] Found {} grades, avg: {:.4}", percentages.len(), avg);
    Ok(avg.min(1.0).max(0.0))
}

fn calculate_class_performance(
    conn: &Connection,
    class_id: i32,
    subject_id: i32,
    period: &str,
) -> Result<f64, String> {
    info!("  [class_perf] class_id={}, subject_id={}, period={}", class_id, subject_id, period);

    let max_col = match period {
        "P1" => "max_p1",
        "P2" => "max_p2",
        "EXAM1" => "max_exam1",
        "P3" => "max_p3",
        "P4" => "max_p4",
        "EXAM2" => "max_exam2",
        _ => "max_p1",
    };

    let query = format!(
        "SELECT AVG(CAST(g.value AS FLOAT) / s.{}) as avg_percentage
         FROM grades g
         JOIN subjects s ON g.subject_id = s.id
         JOIN students st ON g.student_id = st.id
         WHERE st.class_id = ? AND g.subject_id = ? AND g.period = ?
         AND g.value IS NOT NULL AND g.value >= 0",
        max_col
    );

    let mut stmt = conn.prepare(&query).map_err(|e| {
        error!("  [class_perf] Failed to prepare: {}", e);
        e.to_string()
    })?;

    let avg_percentage: f64 = stmt
        .query_row(rusqlite::params![class_id, subject_id, period], |row| {
            row.get(0)
        })
        .unwrap_or_else(|e| {
            info!("  [class_perf] Query returned no rows or error: {}, using 0.5", e);
            0.5
        });

    info!("  [class_perf] Result: {:.4}", avg_percentage);
    Ok(avg_percentage.min(1.0).max(0.0))
}

fn get_max_for_period(conn: &Connection, subject_id: i32, period: &str) -> Result<f64, String> {
    info!("  [max_for_period] subject_id={}, period={}", subject_id, period);

    let column = match period {
        "P1" => "max_p1",
        "P2" => "max_p2",
        "EXAM1" => "max_exam1",
        "P3" => "max_p3",
        "P4" => "max_p4",
        "EXAM2" => "max_exam2",
        _ => "max_p1",
    };

    let query = format!("SELECT {} FROM subjects WHERE id = ?", column);
    let mut stmt = conn.prepare(&query).map_err(|e| {
        error!("  [max_for_period] Failed to prepare: {}", e);
        e.to_string()
    })?;

    let max: f64 = stmt
        .query_row(rusqlite::params![subject_id], |row| row.get(0))
        .map_err(|e| {
            error!("  [max_for_period] Failed to query: {}", e);
            e.to_string()
        })?;

    info!("  [max_for_period] Result: {:.0}", max);
    Ok(max)
}

#[tauri::command]
async fn predict_missing_grades(
    app_handle: tauri::AppHandle,
    params: PredictionParams,
) -> Result<Vec<PredictionResult>, String> {
    info!("=== PREDICT_MISSING_GRADES START ===");
    info!("Params: class_id={}, confidence_threshold={}", params.class_id, params.confidence_threshold);

    let db_path = get_db_path(&app_handle);
    let conn = Connection::open(db_path).map_err(|e| {
        error!("Failed to open DB: {}", e);
        e.to_string()
    })?;

    let mut results = Vec::new();
    let periods = params.periods.unwrap_or_else(|| {
        vec![
            "P1".to_string(),
            "P2".to_string(),
            "EXAM1".to_string(),
            "P3".to_string(),
            "P4".to_string(),
            "EXAM2".to_string(),
        ]
    });

    info!("Periods: {:?}", periods);

    // Get all students in class
    let mut student_stmt = conn
        .prepare("SELECT id, first_name, last_name FROM students WHERE class_id = ?")
        .map_err(|e| {
            error!("Failed to prepare student query: {}", e);
            e.to_string()
        })?;

    let students_iter = student_stmt
        .query_map(rusqlite::params![params.class_id], |row| {
            Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?))
        })
        .map_err(|e| {
            error!("Failed to query students: {}", e);
            e.to_string()
        })?;

    for student_result in students_iter {
        let (student_id, first_name, last_name) = student_result.map_err(|e| {
            error!("Failed to get student row: {}", e);
            e.to_string()
        })?;

        info!("Processing student: {} {} (id={})", first_name, last_name, student_id);

        if let Some(ref student_ids) = params.student_ids {
            if !student_ids.contains(&student_id) {
                continue;
            }
        }

        // Get all subjects for this class
        let mut subject_stmt = conn
            .prepare("SELECT id, name FROM subjects WHERE class_id = ?")
            .map_err(|e| {
                error!("Failed to prepare subject query: {}", e);
                e.to_string()
            })?;

        let subjects_iter = subject_stmt
            .query_map(rusqlite::params![params.class_id], |row| {
                Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| {
                error!("Failed to query subjects: {}", e);
                e.to_string()
            })?;

        for subject_result in subjects_iter {
            let (subject_id, subject_name) = subject_result.map_err(|e| {
                error!("Failed to get subject row: {}", e);
                e.to_string()
            })?;

            if let Some(ref subject_ids) = params.subject_ids {
                if !subject_ids.contains(&subject_id) {
                    continue;
                }
            }

            for period in &periods {
                // Check if grade exists
                let existing: Option<f64> = conn
                    .query_row(
                        "SELECT value FROM grades WHERE student_id = ? AND subject_id = ? AND period = ?",
                        rusqlite::params![student_id, subject_id, period],
                        |row| row.get(0),
                    )
                    .ok();

                if existing.is_some() {
                    continue;
                }

                // Log pour déboguer : on utilise first_name et last_name (pas de variable student_name)
                info!("Calculating prediction for {} {} / {} / {}", first_name, last_name, subject_name, period);

                // Calculate prediction
                let student_perf = match calculate_student_performance(&conn, student_id, subject_id, period) {
                    Ok(perf) => {
                        info!("  Student perf: {:.2}", perf);
                        perf
                    },
                    Err(e) => {
                        error!("  Failed to calculate student perf: {}", e);
                        continue;
                    }
                };

                let class_perf = match calculate_class_performance(&conn, params.class_id, subject_id, period) {
                    Ok(perf) => {
                        info!("  Class perf: {:.2}", perf);
                        perf
                    },
                    Err(e) => {
                        error!("  Failed to calculate class perf: {}", e);
                        continue;
                    }
                };

                let max_grade = match get_max_for_period(&conn, subject_id, period) {
                    Ok(max) => {
                        info!("  Max grade: {:.2}", max);
                        max
                    },
                    Err(e) => {
                        error!("  Failed to get max grade: {}", e);
                        continue;
                    }
                };

                let ecart = student_perf - class_perf;
                let predicted_percentage = if ecart > 0.15 {
                    class_perf.min(0.95)
                } else if ecart < -0.15 {
                    (class_perf - 0.1).max(0.0)
                } else {
                    (class_perf * 0.7 + student_perf * 0.3).min(1.0)
                };

                let predicted_grade = predicted_percentage * max_grade;

                let mut confidence = 80u8;
                if (ecart.abs()) > 0.25 {
                    confidence = confidence.saturating_sub(20);
                }
                if student_perf < 0.3 {
                    confidence = confidence.saturating_sub(15);
                }
                if predicted_percentage < 0.3 {
                    confidence = confidence.saturating_sub(10);
                }

                info!("  Predicted: {:.2}/{:.0} (conf: {}%)", predicted_grade, max_grade, confidence);

                if confidence >= params.confidence_threshold {
                    results.push(PredictionResult {
                        student_id,
                        student_name: format!("{} {}", first_name, last_name),
                        subject_id,
                        subject_name: subject_name.clone(),
                        period: period.clone(),
                        predicted_grade: (predicted_grade * 100.0).round() / 100.0,
                        max_grade,
                        confidence,
                        reasoning: format!(
                            "Perf élève: {:.0}% vs classe: {:.0}% (écart: {:.0}%)",
                            student_perf * 100.0,
                            class_perf * 100.0,
                            ecart * 100.0
                        ),
                    });
                }
            }
        }
    }

    info!("=== PREDICT_MISSING_GRADES END: {} results ===", results.len());
    Ok(results)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .build(),
        )
        .setup(|app| {
            let _app_handle = app.handle().clone();

            let db_path = get_db_path(app.handle());
            info!("Initializing application...");
            info!("Database path: {:?}", db_path);
            db::initialize_db(&db_path).expect("Failed to initialize database");

            // Pas besoin d'initialiser AppState serveur ici, tiny-http gère le sien

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_hwid,
            get_license_info,
            activate_license,
            refresh_remote_license,
            sync::sync_start,
            sync::sync_push,
            sync::sync_pull,
            auth_check,
            auth_create,
            auth_verify,
            check_sync_status,
            start_web_server,
            get_web_server_info,
            server::broadcast_db_change,
            predict_missing_grades
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
