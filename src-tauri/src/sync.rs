use crate::{get_cloud_url, get_db_path, get_hwid_internal};
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

#[derive(Serialize, Debug)]
pub struct AcademicYearPush {
    pub localId: i64,
    pub name: String,
    pub startDate: String,
    pub endDate: String,
    pub isCurrent: bool,
    pub last_modified_at: String,
}
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
#[derive(Serialize, Debug)]
pub struct DomainPush {
    pub localId: i64,
    pub name: String,
    pub displayOrder: i64,
    pub last_modified_at: String,
}
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
#[derive(Serialize, Debug)]
pub struct GradePush {
    pub localId: i64,
    pub studentId: i64,
    pub subjectId: i64,
    pub period: String,
    pub points: f64,
    pub last_modified_at: String,
}
#[derive(Serialize, Debug)]
pub struct NotePush {
    pub localId: i64,
    pub title: String,
    pub content: String,
    pub academicYearLocalId: Option<i64>,
    pub last_modified_at: String,
}
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
#[derive(Deserialize, Debug)]
pub struct PushResults {
    pub academicYears: Option<Vec<ResultItem>>,
    pub classes: Option<Vec<ResultItem>>,
    pub domains: Option<Vec<ResultItem>>,
    pub students: Option<Vec<ResultItem>>,
    pub subjects: Option<Vec<ResultItem>>,
    pub deletions: Option<Vec<DeletionResultItem>>,
}
#[derive(Deserialize, Debug)]
pub struct ResultItem {
    pub localId: i64,
    pub serverId: String,
}
#[derive(Deserialize, Debug)]
pub struct DeletionResultItem {
    pub tableName: String,
    pub localId: i64,
    pub success: bool,
}

async fn perform_push(conn: &Connection, school_id: &str, token: &str) -> Result<(), String> {
    let ay_dirty: Vec<AcademicYearPush> = conn.prepare("SELECT id, name, start_date, end_date, is_active, last_modified_at FROM academic_years WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(AcademicYearPush { localId: row.get(0)?, name: row.get(1)?, startDate: row.get(2)?, endDate: row.get(3)?, isCurrent: row.get(4)?, last_modified_at: row.get(5)? }))?.collect())
        .map_err(|e| e.to_string())?.into_iter().filter_map(|x| x.ok()).collect();

    let classes_dirty: Vec<ClassPush> = conn.prepare("SELECT id, name, level, option, section, academic_year_id, last_modified_at FROM classes WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(ClassPush { localId: row.get(0)?, name: row.get(1)?, level: row.get(2)?, option: row.get(3)?, section: row.get(4)?, academicYearLocalId: row.get(5)?, last_modified_at: row.get(6)? }))?.collect())
        .map_err(|e| e.to_string())?.into_iter().filter_map(|x| x.ok()).collect();

    let students_dirty: Vec<StudentPush> = conn.prepare("SELECT id, first_name, last_name, post_name, gender, birth_date, birthplace, conduite, conduite_p1, conduite_p2, conduite_p3, conduite_p4, is_abandoned, abandon_reason, class_id, last_modified_at FROM students WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(StudentPush { localId: row.get(0)?, firstName: row.get(1)?, lastName: row.get(2)?, postName: row.get(3)?, gender: row.get(4)?, birthDate: row.get(5)?, birthplace: row.get(6)?, conduite: row.get(7)?, conduiteP1: row.get(8)?, conduiteP2: row.get(9)?, conduiteP3: row.get(10)?, conduiteP4: row.get(11)?, isAbandoned: row.get::<_, i32>(12)? != 0, abandonReason: row.get(13)?, classLocalId: row.get(14)?, last_modified_at: row.get(15)? }))?.collect())
        .map_err(|e| e.to_string())?.into_iter().filter_map(|x| x.ok()).collect();

    let deletions: Vec<DeletionPush> = conn
        .prepare("SELECT table_name, local_id FROM sync_deletions")
        .and_then(|mut stmt| {
            stmt.query_map([], |row| {
                Ok(DeletionPush {
                    tableName: row.get(0)?,
                    localId: row.get(1)?,
                })
            })?
            .collect()
        })
        .map_err(|e| e.to_string())?
        .into_iter()
        .filter_map(|x| x.ok())
        .collect();

    let sync_data = SyncData {
        academic_years: ay_dirty,
        classes: classes_dirty,
        domains: vec![], // Add later
        students: students_dirty,
        subjects: vec![], // Add later
        grades: vec![],   // Add later
        notes: vec![],    // Add later
        deletions,
    };

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
        let response: PushResponse = res.json().await.map_err(|e| e.to_string())?;
        if response.success {
            // Update items to clean in local DB (simplified)
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
    }
    Ok(())
}

#[tauri::command]
pub async fn sync_start(app_handle: tauri::AppHandle) -> Result<SyncResult, String> {
    let conn = Connection::open(get_db_path(&app_handle)).map_err(|e| e.to_string())?;
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

    perform_push(&conn, &school_id, &token).await?;

    Ok(SyncResult {
        success: true,
        error: None,
    })
}
