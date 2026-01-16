// Module serveur web pour le Marking Board
// Ce serveur Axum permet aux appareils mobiles de saisir les notes

use axum::response::sse::{Event, Sse};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use futures::stream::Stream;
use local_ip_address::local_ip;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::Emitter;
use tokio::sync::broadcast;
use tokio_stream::wrappers::BroadcastStream;
use tokio_stream::StreamExt;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

// Structure d'information du serveur
#[derive(Clone, Serialize, Debug)]
pub struct ServerInfo {
    pub ip: String,
    pub port: u16,
    pub running: bool,
}

// État global du serveur
pub static SERVER_INFO: Mutex<Option<ServerInfo>> = Mutex::new(None);

// État partagé entre les routes
pub struct AppState {
    pub db_path: PathBuf,
    pub tx: broadcast::Sender<serde_json::Value>,
    pub app_handle: tauri::AppHandle,
}

// Types de données pour l'API
#[derive(Serialize)]
struct ClassResponse {
    id: i64,
    name: String,
    level: String,
    option: String,
    section: String,
}

#[derive(Serialize)]
struct StudentResponse {
    id: i64,
    first_name: String,
    last_name: String,
    post_name: String,
}

#[derive(Serialize)]
struct SubjectResponse {
    id: i64,
    name: String,
    code: String,
    max_p1: f64,
    max_p2: f64,
    max_exam1: f64,
    max_p3: f64,
    max_p4: f64,
    max_exam2: f64,
}

#[derive(Serialize)]
struct GradeResponse {
    student_id: i64,
    subject_id: i64,
    period: String,
    value: f64,
}

#[derive(Serialize)]
struct ClassFullResponse {
    students: Vec<StudentResponse>,
    subjects: Vec<SubjectResponse>,
    grades: Vec<GradeResponse>,
}

#[derive(Serialize, Deserialize)]
struct GradeUpdate {
    student_id: i64,
    subject_id: i64,
    period: String,
    value: f64,
}

#[derive(Deserialize)]
struct BatchGradeRequest {
    updates: Vec<GradeUpdate>,
    #[serde(rename = "senderId")]
    sender_id: Option<String>,
}

// Handler: Liste des classes
async fn get_classes(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<ClassResponse>>, StatusCode> {
    let conn = Connection::open(&state.db_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 1. Récupérer d'abord l'année académique active
    let active_year_id: Option<i64> = conn
        .query_row(
            "SELECT id FROM academic_years WHERE is_active = 1",
            [],
            |row| row.get(0),
        )
        .ok();

    // 2. Préparer la requête filtrée par année active (ou toutes si aucune année active)
    let (query, params): (&str, Vec<i64>) = if let Some(year_id) = active_year_id {
        (
            "SELECT id, name, level, option, section FROM classes WHERE academic_year_id = ?",
            vec![year_id],
        )
    } else {
        (
            "SELECT id, name, level, option, section FROM classes",
            vec![],
        )
    };

    let mut stmt = conn
        .prepare(query)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let params_refs: Vec<&dyn rusqlite::ToSql> =
        params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();

    let classes: Vec<ClassResponse> = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(ClassResponse {
                id: row.get(0)?,
                name: row.get(1)?,
                level: row.get(2)?,
                option: row.get(3)?,
                section: row.get(4)?,
            })
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Json(classes))
}

// Handler: Données complètes d'une classe
async fn get_class_full(
    Path(class_id): Path<i64>,
    State(state): State<Arc<AppState>>,
) -> Result<Json<ClassFullResponse>, StatusCode> {
    let conn = Connection::open(&state.db_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Récupérer les élèves de la classe
    let mut stmt = conn
        .prepare("SELECT id, first_name, last_name, post_name FROM students WHERE class_id = ? ORDER BY last_name, post_name, first_name")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let students: Vec<StudentResponse> = stmt
        .query_map([class_id], |row| {
            Ok(StudentResponse {
                id: row.get(0)?,
                first_name: row.get(1)?,
                last_name: row.get(2)?,
                post_name: row.get(3)?,
            })
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .filter_map(|r| r.ok())
        .collect();

    // Récupérer les matières de la classe
    let mut stmt = conn
        .prepare("SELECT id, name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2 FROM subjects WHERE class_id = ?")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let subjects: Vec<SubjectResponse> = stmt
        .query_map([class_id], |row| {
            Ok(SubjectResponse {
                id: row.get(0)?,
                name: row.get(1)?,
                code: row.get(2)?,
                max_p1: row.get(3)?,
                max_p2: row.get(4)?,
                max_exam1: row.get(5)?,
                max_p3: row.get(6)?,
                max_p4: row.get(7)?,
                max_exam2: row.get(8)?,
            })
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .filter_map(|r| r.ok())
        .collect();

    // Récupérer les notes pour les élèves et matières de cette classe
    let student_ids: Vec<i64> = students.iter().map(|s| s.id).collect();
    let subject_ids: Vec<i64> = subjects.iter().map(|s| s.id).collect();

    let mut grades: Vec<GradeResponse> = Vec::new();

    if !student_ids.is_empty() && !subject_ids.is_empty() {
        // Construire la requête dynamiquement
        let placeholders_students: String = student_ids
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(",");
        let placeholders_subjects: String = subject_ids
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(",");

        let query = format!(
            "SELECT student_id, subject_id, period, value FROM grades WHERE student_id IN ({}) AND subject_id IN ({})",
            placeholders_students, placeholders_subjects
        );

        let mut stmt = conn
            .prepare(&query)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Créer les paramètres
        let mut params: Vec<i64> = Vec::new();
        params.extend(&student_ids);
        params.extend(&subject_ids);

        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();

        grades = stmt
            .query_map(params_refs.as_slice(), |row| {
                Ok(GradeResponse {
                    student_id: row.get(0)?,
                    subject_id: row.get(1)?,
                    period: row.get(2)?,
                    value: row.get(3)?,
                })
            })
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .filter_map(|r| r.ok())
            .collect();
    }

    Ok(Json(ClassFullResponse {
        students,
        subjects,
        grades,
    }))
}

// Handler: Événements temps réel (SSE)
async fn sse_handler(
    State(state): State<Arc<AppState>>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let rx = state.tx.subscribe();

    let stream = BroadcastStream::new(rx).map(|msg| {
        match msg {
            Ok(data) => {
                // Ensure we return Result<Event, Infallible>
                match Event::default().json_data(data) {
                    Ok(ev) => Ok(ev),
                    Err(_) => Ok(Event::default().comment("json-error")),
                }
            }
            Err(_) => {
                // Return a keep-alive comment on broadcast error
                Ok(Event::default().comment("keep-alive"))
            }
        }
    });

    Sse::new(stream).keep_alive(
        axum::response::sse::KeepAlive::new()
            .interval(Duration::from_secs(15))
            .text("keep-alive"),
    )
}

// Handler: Enregistrer les notes
async fn save_grades(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<BatchGradeRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let conn = Connection::open(&state.db_path).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    for update in &payload.updates {
        // Upsert: insérer ou mettre à jour
        conn.execute(
            "INSERT INTO grades (student_id, subject_id, period, value, is_dirty, last_modified_at)
             VALUES (?1, ?2, ?3, ?4, 1, datetime('now'))
             ON CONFLICT(student_id, subject_id, period)
             DO UPDATE SET value = ?4, is_dirty = 1, last_modified_at = datetime('now')",
            rusqlite::params![
                update.student_id,
                update.subject_id,
                update.period,
                update.value
            ],
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Notifier tous les clients connectés via SSE (Web/Mobile)
    let _ = state.tx.send(serde_json::json!({
        "event": "db:changed",
        "senderId": payload.sender_id,
        "type": "grade_update",
        "updates": &payload.updates
    }));

    // Notifier l'application Desktop (Tauri)
    let _ = state.app_handle.emit(
        "db:changed",
        serde_json::json!({
            "senderId": payload.sender_id,
            "type": "grade_update",
            "updates": &payload.updates
        }),
    );

    Ok(Json(serde_json::json!({ "success": true })))
}

// Démarre le serveur web
// Le paramètre port est utilisé comme port préféré, mais si non disponible,
// le système tentera de trouver un port libre automatiquement
pub async fn start_server(
    state: Arc<AppState>,
    web_dist_path: PathBuf,
    preferred_port: u16,
) -> Result<ServerInfo, String> {
    // Récupérer l'IP locale
    let ip = local_ip().map_err(|e| format!("Impossible de récupérer l'IP locale: {}", e))?;

    // L'IP et le canal broadcast sont déjà gérés ou injectés via l'état state

    // Création du routeur
    let app = Router::new()
        .route("/api/classes", get(get_classes))
        .route("/api/classes/:id/full", get(get_class_full))
        .route("/api/grades/batch", post(save_grades))
        .route("/api/events", get(sse_handler))
        .nest_service("/", ServeDir::new(&web_dist_path))
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Tenter de lier le port préféré, sinon utiliser le port 0 (aléatoire)
    let addr = SocketAddr::from((ip, preferred_port));
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(_) => {
            // Le port préféré n'est pas disponible, on utilise le port 0
            // qui laisse le système choisir un port libre
            log::warn!(
                "Port {} non disponible, recherche d'un port libre...",
                preferred_port
            );
            let fallback_addr = SocketAddr::from((ip, 0u16));
            tokio::net::TcpListener::bind(fallback_addr)
                .await
                .map_err(|e| format!("Impossible de trouver un port disponible: {}", e))?
        }
    };

    // Récupérer le port réellement attribué (important si on a utilisé port 0)
    let actual_port = listener
        .local_addr()
        .map_err(|e| format!("Impossible de récupérer l'adresse locale: {}", e))?
        .port();

    let actual_addr = listener.local_addr().unwrap();
    log::info!("Serveur Marking Board démarré sur http://{}", actual_addr);

    // Lancer le serveur en arrière-plan
    tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .expect("Erreur serveur Marking Board");
    });

    let info = ServerInfo {
        ip: ip.to_string(),
        port: actual_port,
        running: true,
    };

    *SERVER_INFO.lock().unwrap() = Some(info.clone());

    Ok(info)
}

// Diffuse un changement de base de données aux clients web (appelé par le renderer desktop)
#[tauri::command]
pub async fn broadcast_db_change(
    state: tauri::State<'_, Arc<AppState>>,
    payload: serde_json::Value,
) -> Result<(), String> {
    let mut msg = payload.clone();
    if msg.get("event").is_none() {
        if let Some(obj) = msg.as_object_mut() {
            obj.insert("event".to_string(), serde_json::json!("db:changed"));
        }
    }

    let _ = state.tx.send(msg);
    Ok(())
}

// Récupère les informations du serveur
pub fn get_server_info() -> Option<ServerInfo> {
    SERVER_INFO.lock().unwrap().clone()
}
