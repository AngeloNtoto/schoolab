use crate::{get_cloud_url, get_db_path, get_hwid_internal, SchoolInfo};
use log::{error, info};
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
    pub repechages: Vec<RepechagePush>,
    pub notes: Vec<NotePush>,
}

// La struct SchoolInfo est désormais importée depuis crate::SchoolInfo (définie dans lib.rs)
// pour éviter la duplication et les avertissements de code mort.

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Debug)]
pub struct AcademicYearPush {
    pub localId: i64,
    #[serde(alias = "id")]
    pub serverId: Option<String>,
    pub name: String,
    pub startDate: String,
    pub endDate: String,
    pub isCurrent: bool,
    #[serde(alias = "lastModifiedAt")]
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Debug)]
pub struct ClassPush {
    pub localId: i64,
    #[serde(alias = "id")]
    pub serverId: Option<String>,
    pub name: String,
    pub level: String,
    pub option: String,
    pub section: String,
    pub academicYearLocalId: i64,
    #[serde(alias = "lastModifiedAt")]
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Debug)]
pub struct DomainPush {
    pub localId: i64,
    #[serde(alias = "id")]
    pub serverId: Option<String>,
    pub name: String,
    pub displayOrder: i64,
    #[serde(alias = "lastModifiedAt")]
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Debug)]
pub struct StudentPush {
    pub localId: i64,
    #[serde(alias = "id")]
    pub serverId: Option<String>,
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
    #[serde(alias = "lastModifiedAt")]
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Debug)]
pub struct SubjectPush {
    pub localId: i64,
    #[serde(alias = "id")]
    pub serverId: Option<String>,
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
    #[serde(alias = "lastModifiedAt")]
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Debug)]
pub struct GradePush {
    pub localId: i64,
    #[serde(alias = "id")]
    pub serverId: Option<String>,
    pub studentLocalId: i64,
    pub subjectLocalId: i64,
    pub period: String,
    pub points: f64,
    #[serde(alias = "lastModifiedAt")]
    pub last_modified_at: String,
}
#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Debug)]
pub struct NotePush {
    pub localId: i64,
    #[serde(alias = "id")]
    pub serverId: Option<String>,
    pub title: String,
    pub content: String,
    pub academicYearLocalId: Option<i64>,
    #[serde(alias = "lastModifiedAt")]
    pub last_modified_at: String,
}

#[allow(non_snake_case)]
#[derive(Serialize, Deserialize, Debug)]
pub struct RepechagePush {
    pub localId: i64,
    #[serde(alias = "id")]
    pub serverId: Option<String>,
    pub studentLocalId: i64,
    pub subjectLocalId: i64,
    pub value: f64,
    pub percentage: f64,
    #[serde(alias = "lastModifiedAt")]
    pub last_modified_at: String,
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
    pub grades: Option<Vec<ResultItem>>,
    pub repechages: Option<Vec<ResultItem>>,
    pub notes: Option<Vec<ResultItem>>,
}
#[allow(non_snake_case)]
#[derive(Deserialize, Debug)]
pub struct ResultItem {
    pub localId: i64,
    pub serverId: String,
}

fn collect_push_data(conn: &Connection) -> Result<SyncData, String> {
    info!("Collecting data to push...");
    let ay_dirty: Vec<AcademicYearPush> = conn.prepare("SELECT id, name, start_date, end_date, is_active, server_id, last_modified_at FROM academic_years WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(AcademicYearPush { localId: row.get(0)?, serverId: row.get(5)?, name: row.get(1)?, startDate: row.get(2)?, endDate: row.get(3)?, isCurrent: row.get(4)?, last_modified_at: row.get(6)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let classes_dirty: Vec<ClassPush> = conn.prepare("SELECT id, name, level, option, section, academic_year_id, server_id, last_modified_at FROM classes WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(ClassPush { localId: row.get(0)?, serverId: row.get(6)?, name: row.get(1)?, level: row.get(2)?, option: row.get(3)?, section: row.get(4)?, academicYearLocalId: row.get(5)?, last_modified_at: row.get(7)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let students_dirty: Vec<StudentPush> = conn.prepare("SELECT id, first_name, last_name, post_name, gender, birth_date, birthplace, conduite, conduite_p1, conduite_p2, conduite_p3, conduite_p4, is_abandoned, abandon_reason, class_id, server_id, last_modified_at FROM students WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(StudentPush { localId: row.get(0)?, serverId: row.get(15)?, firstName: row.get(1)?, lastName: row.get(2)?, postName: row.get(3)?, gender: row.get(4)?, birthDate: row.get(5)?, birthplace: row.get(6)?, conduite: row.get(7)?, conduiteP1: row.get(8)?, conduiteP2: row.get(9)?, conduiteP3: row.get(10)?, conduiteP4: row.get(11)?, isAbandoned: row.get::<_, i32>(12)? != 0, abandonReason: row.get(13)?, classLocalId: row.get(14)?, last_modified_at: row.get(16)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let domains_dirty: Vec<DomainPush> = conn
        .prepare("SELECT id, name, display_order, server_id, last_modified_at FROM domains WHERE is_dirty = 1")
        .and_then(|mut stmt| {
            stmt.query_map([], |row| {
                Ok(DomainPush {
                    localId: row.get(0)?,
                    serverId: row.get(3)?,
                    name: row.get(1)?,
                    displayOrder: row.get(2)?,
                    last_modified_at: row.get(4)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()
        })
        .map_err(|e| e.to_string())?;

    let subjects_dirty: Vec<SubjectPush> = conn.prepare("SELECT id, name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, category, sub_domain, domain_id, class_id, server_id, last_modified_at FROM subjects WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(SubjectPush { localId: row.get(0)?, serverId: row.get(13)?, name: row.get(1)?, code: row.get(2)?, maxP1: row.get(3)?, maxP2: row.get(4)?, maxExam1: row.get(5)?, maxP3: row.get(6)?, maxP4: row.get(7)?, maxExam2: row.get(8)?, category: row.get(9)?, subDomain: row.get(10)?, domainLocalId: row.get(11)?, classLocalId: row.get(12)?, last_modified_at: row.get(14)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let grades_dirty: Vec<GradePush> = conn.prepare("SELECT id, student_id, subject_id, period, value, server_id, last_modified_at FROM grades WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(GradePush { localId: row.get(0)?, serverId: row.get(5)?, studentLocalId: row.get(1)?, subjectLocalId: row.get(2)?, period: row.get(3)?, points: row.get(4)?, last_modified_at: row.get(6)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let repechages_dirty: Vec<RepechagePush> = conn.prepare("SELECT id, student_id, subject_id, value, percentage, server_id, last_modified_at FROM repechages WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(RepechagePush { localId: row.get(0)?, serverId: row.get(5)?, studentLocalId: row.get(1)?, subjectLocalId: row.get(2)?, value: row.get(3)?, percentage: row.get(4)?, last_modified_at: row.get(6)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let notes_dirty: Vec<NotePush> = conn.prepare("SELECT id, title, content, academic_year_id, server_id, last_modified_at FROM notes WHERE is_dirty = 1")
        .and_then(|mut stmt| stmt.query_map([], |row| Ok(NotePush { localId: row.get(0)?, serverId: row.get(4)?, title: row.get(1)?, content: row.get(2)?, academicYearLocalId: row.get(3)?, last_modified_at: row.get(5)? }))?.collect::<Result<Vec<_>, _>>())
        .map_err(|e| e.to_string())?;

    let data = SyncData {
        academic_years: ay_dirty,
        classes: classes_dirty,
        domains: domains_dirty,
        students: students_dirty,
        subjects: subjects_dirty,
        grades: grades_dirty,
        repechages: repechages_dirty,
        notes: notes_dirty,
    };

    info!("Collected push data stats:");
    info!("- AcademicYears: {}", data.academic_years.len());

    // Debug: Log total counts to verify DB state
    let total_ay: i64 = conn
        .query_row("SELECT COUNT(*) FROM academic_years", [], |r| r.get(0))
        .unwrap_or(0);
    let total_classes: i64 = conn
        .query_row("SELECT COUNT(*) FROM classes", [], |r| r.get(0))
        .unwrap_or(0);
    let total_students: i64 = conn
        .query_row("SELECT COUNT(*) FROM students", [], |r| r.get(0))
        .unwrap_or(0);
    info!(
        "DEBUG DB STATE: Total AY: {}, Total Classes: {}, Total Students: {}",
        total_ay, total_classes, total_students
    );

    info!("- Classes: {}", data.classes.len());
    info!("- Domains: {}", data.domains.len());
    info!("- Students: {}", data.students.len());
    info!("- Subjects: {}", data.subjects.len());

    Ok(data)
}

async fn send_push_data(
    school_id: &str,
    token: &str,
    sync_data: SyncData,
    school_info: SchoolInfo,
) -> Result<PushResponse, String> {
    info!("Sending push data to cloud...");
    let payload = serde_json::json!({
        "schoolId": school_id,
        "data": sync_data,
        "schoolInfo": school_info
    });
    let url = format!("{}/api/sync/push", get_cloud_url());
    info!("Sending POST request to: {}", url);
    info!(
        "Payload size (approx): {} bytes",
        serde_json::to_string(&payload).unwrap_or_default().len()
    );

    let client = reqwest::Client::new();
    let res = client
        .post(&url)
        .header(CONTENT_TYPE, "application/json")
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("x-hwid", get_hwid_internal())
        .json(&payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let text = res.text().await.unwrap_or_default();

    info!("Cloud status: {}", status);
    info!("Cloud response (first 1000): {:.1000}", text);

    if !status.is_success() {
        if let Ok(err_json) = serde_json::from_str::<serde_json::Value>(&text) {
            let msg = err_json["error"]
                .as_str()
                .unwrap_or("Erreur serveur inconnue");
            let code = err_json["code"].as_str().unwrap_or("SERVER_ERROR");
            return Err(format!("{} ({})", msg, code));
        }
        return Err(format!("Erreur Serveur ({}): {:.500}", status, text));
    }

    let response: PushResponse = serde_json::from_str(&text)
        .map_err(|e| format!("JSON Parse Error: {} | body: {:.200}", e, text))?;

    Ok(response)
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
        if let Some(gr_res) = response.results.grades {
            for item in gr_res {
                let _ = conn.execute(
                    "UPDATE grades SET server_id = ?, is_dirty = 0 WHERE id = ?",
                    params![item.serverId, item.localId],
                );
            }
        }
        if let Some(rep_res) = response.results.repechages {
            for item in rep_res {
                let _ = conn.execute(
                    "UPDATE repechages SET server_id = ?, is_dirty = 0 WHERE id = ?",
                    params![item.serverId, item.localId],
                );
            }
        }
        if let Some(nt_res) = response.results.notes {
            for item in nt_res {
                let _ = conn.execute(
                    "UPDATE notes SET server_id = ?, is_dirty = 0 WHERE id = ?",
                    params![item.serverId, item.localId],
                );
            }
        }
    }
    Ok(())
}

#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct PullResponse {
    pub success: bool,
    pub data: PullData,
}

#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
pub struct PullData {
    pub academicYears: Vec<AcademicYearPush>,
    pub classes: Vec<ClassPush>,
    pub domains: Vec<DomainPush>,
    pub students: Vec<StudentPush>,
    pub subjects: Vec<SubjectPush>,
    pub grades: Vec<GradePush>,
    pub repechages: Vec<RepechagePush>,
    pub notes: Vec<NotePush>,
}

async fn pull_from_cloud(school_id: &str, token: &str) -> Result<PullData, String> {
    info!("Pulling data from cloud...");
    let url = format!("{}/api/sync/pull?schoolId={}", get_cloud_url(), school_id);
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .header(AUTHORIZATION, format!("Bearer {}", token))
        .header("x-hwid", get_hwid_internal())
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.unwrap_or_default();
    let response: PullResponse = serde_json::from_str(&text)
        .map_err(|e| format!("Pull JSON Error: {} | body: {:.500}", e, text))?;

    if !response.success {
        return Err("Server reported failure during pull".to_string());
    }

    info!("Pulled Data Stats:");
    info!("- AcademicYears: {}", response.data.academicYears.len());
    info!("- Classes: {}", response.data.classes.len());
    info!("- Students: {}", response.data.students.len());
    info!("- Grades: {}", response.data.grades.len());
    info!("- Repechages: {}", response.data.repechages.len());
    info!("- Subjects: {}", response.data.subjects.len());
    info!("- Notes: {}", response.data.notes.len());

    Ok(response.data)
}

fn process_pull_data(mut conn: Connection, data: PullData) -> Result<(), String> {
    info!("Processing pulled data into local database...");

    // Set busy timeout to handle contention
    let _ = conn.execute("PRAGMA busy_timeout = 5000", []);

    let tx = conn
        .transaction()
        .map_err(|e| format!("Transaction Error: {}", e))?;

    let mut ay_count = 0;
    // Academic Years
    for ay in data.academicYears {
        match tx.execute(
            "INSERT OR REPLACE INTO academic_years (id, name, start_date, end_date, is_active, server_id, is_dirty) VALUES (?, ?, ?, ?, ?, ?, 0)",
            params![ay.localId, ay.name, ay.startDate, ay.endDate, ay.isCurrent as i32, ay.serverId],
        ) {
            Ok(_) => ay_count += 1,
            Err(e) => error!("Failed to insert AY {}: {}", ay.localId, e),
        }
    }
    info!("Successfully processed {} academic years", ay_count);

    // Classes
    let mut class_count = 0;
    for c in data.classes {
        match conn.execute(
            "INSERT OR REPLACE INTO classes (id, name, level, option, section, academic_year_id, server_id, is_dirty) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
            params![c.localId, c.name, c.level, c.option, c.section, c.academicYearLocalId, c.serverId],
        ) {
            Ok(_) => class_count += 1,
            Err(e) => error!("Failed to insert Class {}: {}", c.localId, e),
        }
    }
    info!("Successfully processed {} classes", class_count);

    // Domains
    let mut domain_count = 0;
    for d in data.domains {
        match tx.execute(
            "INSERT OR REPLACE INTO domains (id, name, display_order, server_id, is_dirty) VALUES (?, ?, ?, ?, 0)",
            params![d.localId, d.name, d.displayOrder, d.serverId],
        ) {
            Ok(_) => domain_count += 1,
            Err(e) => error!("Failed to insert Domain {}: {}", d.localId, e),
        }
    }
    info!("Successfully processed {} domains", domain_count);

    // Students
    let mut student_count = 0;
    for s in data.students {
        match tx.execute(
            "INSERT OR REPLACE INTO students (id, first_name, last_name, post_name, gender, birth_date, birthplace, conduite, conduite_p1, conduite_p2, conduite_p3, conduite_p4, is_abandoned, abandon_reason, class_id, server_id, is_dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            params![s.localId, s.firstName, s.lastName, s.postName, s.gender, s.birthDate, s.birthplace, s.conduite, s.conduiteP1, s.conduiteP2, s.conduiteP3, s.conduiteP4, s.isAbandoned as i32, s.abandonReason, s.classLocalId, s.serverId],
        ) {
            Ok(_) => student_count += 1,
            Err(e) => error!("Failed to insert Student {}: {}", s.localId, e),
        }
    }
    info!("Successfully processed {} students", student_count);

    // Subjects
    let mut subject_count = 0;
    for sub in data.subjects {
        match tx.execute(
            "INSERT OR REPLACE INTO subjects (id, name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, category, sub_domain, domain_id, class_id, server_id, is_dirty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
            params![sub.localId, sub.name, sub.code, sub.maxP1, sub.maxP2, sub.maxExam1, sub.maxP3, sub.maxP4, sub.maxExam2, sub.category, sub.subDomain, sub.domainLocalId, sub.classLocalId, sub.serverId],
        ) {
            Ok(_) => subject_count += 1,
            Err(e) => error!("Failed to insert Subject {}: {}", sub.localId, e),
        }
    }
    info!("Successfully processed {} subjects", subject_count);

    // Grades
    let mut grade_count = 0;
    for g in data.grades {
        match tx.execute(
            "INSERT OR REPLACE INTO grades (id, student_id, subject_id, period, value, server_id, is_dirty) VALUES (?, ?, ?, ?, ?, ?, 0)",
            params![g.localId, g.studentLocalId, g.subjectLocalId, g.period, g.points, g.serverId],
        ) {
            Ok(_) => grade_count += 1,
            Err(e) => error!("Failed to insert Grade {}: {}", g.localId, e),
        }
    }
    info!("Successfully processed {} grades", grade_count);

    // Repechages
    let mut rep_count = 0;
    for r in data.repechages {
        match tx.execute(
            "INSERT OR REPLACE INTO repechages (id, student_id, subject_id, value, percentage, server_id, is_dirty) VALUES (?, ?, ?, ?, ?, ?, 0)",
            params![r.localId, r.studentLocalId, r.subjectLocalId, r.value, r.percentage, r.serverId],
        ) {
            Ok(_) => rep_count += 1,
            Err(e) => error!("Failed to insert Repechage {}: {}", r.localId, e),
        }
    }
    info!("Successfully processed {} repechages", rep_count);

    // Notes
    let mut note_count = 0;
    for n in data.notes {
        match tx.execute(
            "INSERT OR REPLACE INTO notes (id, title, content, academic_year_id, server_id, is_dirty) VALUES (?, ?, ?, ?, ?, 0)",
            params![n.localId, n.title, n.content, n.academicYearLocalId, n.serverId],
        ) {
            Ok(_) => note_count += 1,
            Err(e) => error!("Failed to insert Note {}: {}", n.localId, e),
        }
    }
    info!("Successfully processed {} notes", note_count);

    tx.commit().map_err(|e| format!("Commit Error: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn sync_start(app_handle: tauri::AppHandle) -> Result<SyncResult, String> {
    info!("Starting sync process...");
    let db_path = get_db_path(&app_handle);

    // 1. Fetch credentials
    let (school_id, token) = {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        let s_id: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'school_id'",
                [],
                |r| r.get(0),
            )
            .map_err(|_| "NOT_LINKED")?;
        let tok: String = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'license_token'",
                [],
                |r| r.get(0),
            )
            .map_err(|_| "NOT_LINKED")?;
        (s_id, tok)
    };

    // 2. Perform Pull
    let pull_data = pull_from_cloud(&school_id, &token).await?;
    {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        process_pull_data(conn, pull_data)?;
    }

    // 3. Perform Push
    let (sync_data, school_info) = {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        let s_name = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'school_name'",
                [],
                |r| r.get::<_, String>(0),
            )
            .unwrap_or_else(|_| "Unknown School".to_string());
        let s_city = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'school_city'",
                [],
                |r| r.get::<_, String>(0),
            )
            .unwrap_or_else(|_| "Unknown City".to_string());
        let s_pobox = conn
            .query_row(
                "SELECT value FROM settings WHERE key = 'school_pobox'",
                [],
                |r| r.get::<_, String>(0),
            )
            .ok();

        let s_info = SchoolInfo {
            id: school_id.clone(),
            name: s_name,
            city: s_city,
            pobox: s_pobox,
        };

        let data = collect_push_data(&conn)?;
        (data, s_info)
    };

    let response = send_push_data(&school_id, &token, sync_data, school_info).await?;

    // 4. Finalize Push
    {
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        process_push_response(&conn, response)?;
    }

    Ok(SyncResult {
        success: true,
        error: None,
    })
}
