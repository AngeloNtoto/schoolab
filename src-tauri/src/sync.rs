use crate::{get_cloud_url, get_db_path, get_hwid_internal};
use log::info;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct SyncResult {
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Debug)]
pub struct SyncData {
    pub academic_years: Vec<AcademicYearPush>,
    pub classes: Vec<ClassPush>,
    pub domains: Vec<DomainPush>,
    pub students: Vec<StudentPush>,
    pub subjects: Vec<SubjectPush>,
    pub grades: Vec<GradePush>,
    pub notes: Vec<NotePush>,
    pub deletions: Vec<DeletionPush>,
}

#[derive(Serialize, Debug)]
pub struct SchoolInfo {
    pub name: String,
    pub city: String,
    pub pobox: String,
}

#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
pub struct AcademicYearPush {
    pub localId: i64,
    pub name: String,
    pub startDate: String,
    pub endDate: String,
    pub isCurrent: bool,
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
pub struct ClassPush {
    pub localId: i64,
    pub name: String,
    pub level: String,
    pub option: String,
    pub section: String,
    pub academicYearLocalId: i64,
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
pub struct DomainPush {
    pub localId: i64,
    pub name: String,
    pub displayOrder: i64,
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
pub struct StudentPush {
    pub localId: i64,
    pub firstName: String,
    pub lastName: String,
    pub postName: String,
    pub gender: String,
    pub birthDate: Option<String>,
    pub birthplace: String,
    pub conduite: String,
    pub conduiteP1: String,
    pub conduiteP2: String,
    pub conduiteP3: String,
    pub conduiteP4: String,
    pub isAbandoned: bool,
    pub abandonReason: String,
    pub classLocalId: i64,
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
pub struct SubjectPush {
    pub localId: i64,
    pub name: String,
    pub code: String,
    pub maxP1: i64,
    pub maxP2: i64,
    pub maxExam1: i64,
    pub maxP3: i64,
    pub maxP4: i64,
    pub maxExam2: i64,
    pub category: String,
    pub subDomain: String,
    pub domainLocalId: Option<i64>,
    pub classLocalId: i64,
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
pub struct GradePush {
    pub localId: i64,
    pub studentId: i64,
    pub subjectId: i64,
    pub period: String,
    pub points: f64,
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
pub struct NotePush {
    pub localId: i64,
    pub title: String,
    pub content: String,
    pub academicYearLocalId: Option<i64>,
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Debug)]
pub struct DeletionPush {
    pub tableName: String,
    pub localId: i64,
}

#[derive(Deserialize, Debug)]
pub struct PushResponse {
    pub success: bool,
    pub results: PushResults,
}
#[allow(non_snake_case)]
#[derive(Deserialize, Debug)]
pub struct PushResults {
    pub academicYears: Option<Vec<ResultItem>>,
    pub classes: Option<Vec<ResultItem>>,
    pub domains: Option<Vec<ResultItem>>,
    pub students: Option<Vec<ResultItem>>,
    pub subjects: Option<Vec<ResultItem>>,
    pub deletions: Option<Vec<DeletionResultItem>>,
}
#[allow(non_snake_case)]
#[derive(Deserialize, Debug)]
pub struct ResultItem {
    pub localId: i64,
    pub serverId: String,
}
#[allow(non_snake_case)]
#[derive(Deserialize, Debug)]
pub struct DeletionResultItem {
    pub tableName: String,
    pub localId: i64,
    pub success: bool,
}

fn collect_push_data(conn: &Connection) -> Result<SyncData, String> {
    info!("Collecting data to push...");
    let ay_dirty: Vec<AcademicYearPush> = conn.prepare("SELECT id, name, start_date, end_date, is_active, last_modified_at FROM academic_years WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(AcademicYearPush { localId: row.get(0)?, name: row.get(1)?, startDate: row.get(2)?, endDate: row.get(3)?, isCurrent: row.get(4)?, last_modified_at: row.get(5)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let classes_dirty: Vec<ClassPush> = conn.prepare("SELECT id, name, level, option, section, academic_year_id, last_modified_at FROM classes WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(ClassPush { localId: row.get(0)?, name: row.get(1)?, level: row.get(2)?, option: row.get(3)?, section: row.get(4)?, academicYearLocalId: row.get(5)?, last_modified_at: row.get(6)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let students_dirty: Vec<StudentPush> = conn.prepare("SELECT id, first_name, last_name, post_name, gender, birth_date, birthplace, conduite, conduite_p1, conduite_p2, conduite_p3, conduite_p4, is_abandoned, abandon_reason, class_id, last_modified_at FROM students WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(StudentPush { localId: row.get(0)?, firstName: row.get(1)?, lastName: row.get(2)?, postName: row.get(3)?, gender: row.get(4)?, birthDate: row.get(5)?, birthplace: row.get(6)?, conduite: row.get(7)?, conduiteP1: row.get(8)?, conduiteP2: row.get(9)?, conduiteP3: row.get(10)?, conduiteP4: row.get(11)?, isAbandoned: row.get::<_, i32>(12)? != 0, abandonReason: row.get(13)?, classLocalId: row.get(14)?, last_modified_at: row.get(15)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let domains_dirty: Vec<DomainPush> = conn
        .prepare("SELECT id, name, display_order, last_modified_at FROM domains WHERE is_dirty = 1")
        .and_then(|mut stmt| {
            stmt.query_map([], |row| {
                Ok(DomainPush {
                    localId: row.get(0)?,
                    name: row.get(1)?,
                    displayOrder: row.get(2)?,
                    last_modified_at: row.get(3)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
        })
        .map_err(|e| e.to_string())?;

    let subjects_dirty: Vec<SubjectPush> = conn.prepare("SELECT id, name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, category, sub_domain, domain_id, class_id, last_modified_at FROM subjects WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(SubjectPush { localId: row.get(0)?, name: row.get(1)?, code: row.get(2)?, maxP1: row.get(3)?, maxP2: row.get(4)?, maxExam1: row.get(5)?, maxP3: row.get(6)?, maxP4: row.get(7)?, maxExam2: row.get(8)?, category: row.get(9)?, subDomain: row.get(10)?, domainLocalId: row.get(11)?, classLocalId: row.get(12)?, last_modified_at: row.get(13)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let deletions: Vec<DeletionPush> = conn
        .prepare("SELECT table_name, local_id FROM sync_deletions")
        .and_then(|mut stmt| {
            stmt.query_map([], |row| {
                Ok(DeletionPush {
                    tableName: row.get(0)?,
                    localId: row.get(1)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
        })
        .map_err(|e| e.to_string())?;

    Ok(SyncData {
        academic_years: ay_dirty,
        classes: classes_dirty,
        domains: domains_dirty,
        students: students_dirty,
        subjects: subjects_dirty,
        grades: vec![],
        notes: vec![],
        deletions,
    })
}

async fn send_push_data(
    school_id: &str,
    token: &str,
    sync_data: SyncData,
) -> Result<PushResponse, String> {
    info!("Sending push data to cloud...");
    let payload = serde_json::json!({ "schoolId": school_id, "data": sync_data, "schoolInfo": { "name": "SchoolName", "city": "City", "pobox": "" } });
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/api/sync/push", get_cloud_url()))
        .header(CONTENT_TYPE, "application/json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("x-hwid", get_hwid_internal())
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status().is_success() {
        res.json().await.map_err(|e| e.to_string())
    } else {
        Err(format!("Server error: {}", res.status()))
    }
}

fn process_push_response(conn: &Connection, response: PushResponse) -> Result<(), String> {
    if response.success {
        if let Some(ay_res) = response.results.academicYears {
            for item in ay_res {
                let _ = conn.execute(
                    "UPDATE academic_years SET server_id = ?, is_dirty = 0 WHERE id = ?",
                    params![item.serverId, item.localId],
                );
            }
        }
        if let Some(cl_res) = response.results.classes {
            for item in cl_res {
                let _ = conn.execute(
                    "UPDATE classes SET server_id = ?, is_dirty = 0 WHERE id = ?",
                    params![item.serverId, item.localId],
                );
            }
        }
        if let Some(st_res) = response.results.students {
            for item in st_res {
                let _ = conn.execute(
                    "UPDATE students SET server_id = ?, is_dirty = 0 WHERE id = ?",
                    params![item.serverId, item.localId],
                );
            }
        }
        if let Some(dom_res) = response.results.domains {
            for item in dom_res {
                let _ = conn.execute(
                    "UPDATE domains SET server_id = ?, is_dirty = 0 WHERE id = ?",
                    params![item.serverId, item.localId],
                );
            }
        }
        if let Some(sub_res) = response.results.subjects {
            for item in sub_res {
                let _ = conn.execute(
                    "UPDATE subjects SET server_id = ?, is_dirty = 0 WHERE id = ?",
                    params![item.serverId, item.localId],
                );
            }
        }
        if let Some(del_res) = response.results.deletions {
            for del in del_res {
                if del.success {
                    let _ = conn.execute(
                        "DELETE FROM sync_deletions WHERE table_name = ? AND local_id = ?",
                        params![del.tableName, del.localId],
                    );
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn sync_start(app_handle: tauri::AppHandle) -> Result<SyncResult, String> {
    info!("Starting sync process...");
    let db_path = get_db_path(&app_handle);

    // 1. Collect Data (Sync)
    let (sync_data, school_id, token) = {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        let school_id: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'school_id'",
                [],
                |r| r.get(0),
            )
            .map_err(|_| "NOT_LINKED")?;
        let token: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'license_token'",
                [],
                |r| r.get(0),
            )
            .map_err(|_| "NOT_LINKED")?;
        let data = collect_push_data(&conn)?;
        (data, school_id, token)
    };

    // 2. Send Data (Async, no db lock held)
    let response = send_push_data(&school_id, &token, sync_data).await?;

    // 3. Process Response (Sync)
    {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        process_push_response(&conn, response)?;
    }

    Ok(SyncResult {
        success: true,
        error: None,
    })
}
