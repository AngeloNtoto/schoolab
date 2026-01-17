// Module serveur web pour le Marking Board (Version Optimisée tiny-http)
// Ce serveur permet aux appareils mobiles de saisir les notes

use std::fs::File;
use std::io::{self, Write};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use lazy_static::lazy_static;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{Emitter, Manager};
use tiny_http::{Header, Method, Response, Server, StatusCode};

// Structure d'information du serveur
#[derive(Clone, Serialize, Debug)]
pub struct ServerInfo {
    pub ip: String,
    pub port: u16,
    pub running: bool,
}

// État global du serveur (IP/Port)
lazy_static! {
    pub static ref SERVER_INFO: Mutex<Option<ServerInfo>> = Mutex::new(None);
    // Canal de diffusion global pour SSE
    static ref SSE_CHANNEL: Mutex<Vec<std::sync::mpsc::Sender<serde_json::Value>>> = Mutex::new(Vec::new());
}

// État partagé passé au thread de gestion
pub struct AppState {
    pub db_path: PathBuf,
    pub app_handle: tauri::AppHandle,
}

// Helper to broadcast to SSE
pub fn broadcast_msg(msg: serde_json::Value) {
    let mut channels = SSE_CHANNEL.lock().unwrap();
    let count_before = channels.len();
    channels.retain(|tx| tx.send(msg.clone()).is_ok());
    println!(
        "[SSE] Broadcast to {} clients (was {}): {:?}",
        channels.len(),
        count_before,
        msg
    );
}

// --- Fonctions Utilitaires ---

fn get_local_ip() -> Option<std::net::IpAddr> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|addr| addr.ip())
}

fn cors_headers() -> Vec<Header> {
    vec![
        Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"*"[..]).unwrap(),
        Header::from_bytes(
            &b"Access-Control-Allow-Methods"[..],
            &b"GET, POST, OPTIONS"[..],
        )
        .unwrap(),
        Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type"[..]).unwrap(),
    ]
}

fn json_response<T: Serialize>(data: T) -> Response<io::Cursor<Vec<u8>>> {
    let json_data = serde_json::to_vec(&data).unwrap_or_else(|_| b"{}".to_vec());
    let mut response = Response::from_data(json_data);
    for header in cors_headers() {
        response.add_header(header);
    }
    response
        .add_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
    response
}

fn error_response(code: u16, message: &str) -> Response<io::Cursor<Vec<u8>>> {
    let json_data = serde_json::to_vec(&json!({ "error": message })).unwrap();
    let mut response = Response::from_data(json_data).with_status_code(StatusCode(code));
    for header in cors_headers() {
        response.add_header(header);
    }
    response
        .add_header(Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
    response
}

// --- Serveur Statique ---

fn serve_static_file(
    path_str: &str,
    app_handle: &tauri::AppHandle,
) -> Response<Box<dyn io::Read + Send>> {
    let resource_path = app_handle
        .path()
        .resolve("dist-web", tauri::path::BaseDirectory::Resource)
        .unwrap_or_else(|_| PathBuf::from("dist-web"));

    let root_path = if resource_path.exists() {
        resource_path
    } else {
        PathBuf::from("../dist-web")
    };

    // Gestion du path et assets
    let clean_path = if path_str.starts_with("/mobile/") {
        &path_str[8..]
    } else if path_str == "/mobile" {
        ""
    } else {
        path_str.trim_start_matches('/')
    };

    let mut file_path = root_path.join(clean_path);
    if file_path.is_dir() {
        file_path = file_path.join("index.html");
    }

    match File::open(&file_path) {
        Ok(file) => {
            let mime_type = match file_path.extension().and_then(|e| e.to_str()) {
                Some("html") => "text/html",
                Some("js") => "application/javascript",
                Some("css") => "text/css",
                Some("png") => "image/png",
                Some("jpg") | Some("jpeg") => "image/jpeg",
                Some("svg") => "image/svg+xml",
                Some("json") => "application/json",
                _ => "application/octet-stream",
            };

            let len = file.metadata().map(|m| m.len() as usize).unwrap_or(0);

            // Reconstruct manually
            Response::new(
                StatusCode(200),
                vec![
                    Header::from_bytes(&b"Content-Type"[..], mime_type.as_bytes()).unwrap(),
                    Header::from_bytes(&b"Cache-Control"[..], &b"public, max-age=3600"[..])
                        .unwrap(),
                ],
                Box::new(file) as Box<dyn io::Read + Send>,
                Some(len),
                None,
            )
        }
        Err(_) => {
            // SPA Fallback: retourner index.html si fichier non trouvé (sauf pour assets clairs)
            if !path_str.contains('.') {
                if let Ok(file) = File::open(root_path.join("index.html")) {
                    let len = file.metadata().map(|m| m.len() as usize).unwrap_or(0);
                    return Response::new(
                        StatusCode(200),
                        vec![Header::from_bytes(&b"Content-Type"[..], &b"text/html"[..]).unwrap()],
                        Box::new(file) as Box<dyn io::Read + Send>,
                        Some(len),
                        None,
                    );
                }
            }

            let data = io::Cursor::new(b"Not Found".to_vec());
            Response::new(
                StatusCode(404),
                vec![],
                Box::new(data) as Box<dyn io::Read + Send>,
                Some(9),
                None,
            )
        }
    }
}

// --- Gestionnaires d'API ---

// GET /api/classes
fn handle_get_classes(state: &AppState) -> Response<io::Cursor<Vec<u8>>> {
    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(_) => return error_response(500, "Database connection failed"),
    };

    // 1. Année active
    let active_year_id: Option<i64> = conn
        .query_row(
            "SELECT id FROM academic_years WHERE is_active = 1",
            [],
            |row| row.get(0),
        )
        .ok();

    // 2. Query execution and collection
    // We explicitly collect into Vec<ClassResponse> inside each branch
    let classes: Vec<ClassResponse> = if let Some(year_id) = active_year_id {
        let mut stmt = match conn.prepare(
            "SELECT id, name, level, option, section FROM classes WHERE academic_year_id = ?",
        ) {
            Ok(s) => s,
            Err(_) => return error_response(500, "Failed query prep Active"),
        };

        let iter = match stmt.query_map([year_id], |row| {
            Ok(ClassResponse {
                id: row.get(0)?,
                name: row.get(1)?,
                level: row.get(2)?,
                option: row.get(3)?,
                section: row.get(4)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return error_response(500, "Failed to query classes"),
        };

        iter.filter_map(Result::ok).collect()
    } else {
        let mut stmt = match conn.prepare("SELECT id, name, level, option, section FROM classes") {
            Ok(s) => s,
            Err(_) => return error_response(500, "Failed query prep All"),
        };

        let iter = match stmt.query_map([], |row| {
            Ok(ClassResponse {
                id: row.get(0)?,
                name: row.get(1)?,
                level: row.get(2)?,
                option: row.get(3)?,
                section: row.get(4)?,
            })
        }) {
            Ok(iter) => iter,
            Err(_) => return error_response(500, "Failed to query classes"),
        };

        iter.filter_map(Result::ok).collect()
    };

    json_response(classes)
}

// GET /api/classes/:id/full
fn handle_get_class_full(id: i64, state: &AppState) -> Response<io::Cursor<Vec<u8>>> {
    let conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(_) => return error_response(500, "Database connection failed"),
    };

    // Students
    let mut stmt = match conn.prepare(
        "SELECT id, first_name, last_name, post_name FROM students WHERE class_id = ? AND (is_abandoned = 0 OR is_abandoned IS NULL) ORDER BY last_name, first_name"
    ) { Ok(s) => s, Err(_) => return error_response(500, "Failed prep students") };

    let students: Vec<StudentResponse> = match stmt.query_map([id], |row| {
        Ok(StudentResponse {
            id: row.get(0)?,
            first_name: row.get(1)?,
            last_name: row.get(2)?,
            post_name: row.get(3)?,
        })
    }) {
        Ok(iter) => iter.filter_map(Result::ok).collect(),
        Err(_) => Vec::new(),
    };

    // Subjects
    let mut stmt = match conn.prepare(
        "SELECT id, name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2 FROM subjects WHERE class_id = ?"
    ) { Ok(s) => s, Err(_) => return error_response(500, "Failed prep subjects") };

    let subjects: Vec<SubjectResponse> = match stmt.query_map([id], |row| {
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
    }) {
        Ok(iter) => iter.filter_map(Result::ok).collect(),
        Err(_) => Vec::new(),
    };

    // Grades
    // Build efficient query for this class
    let mut stmt = match conn.prepare(
        "SELECT g.student_id, g.subject_id, g.period, g.value FROM grades g JOIN students s ON g.student_id = s.id WHERE s.class_id = ?"
    ) { Ok(s) => s, Err(_) => return error_response(500, "Failed prep grades") };

    let grades: Vec<GradeResponse> = match stmt.query_map([id], |row| {
        Ok(GradeResponse {
            student_id: row.get(0)?,
            subject_id: row.get(1)?,
            period: row.get(2)?,
            value: row.get(3)?,
        })
    }) {
        Ok(iter) => iter.filter_map(Result::ok).collect(),
        Err(_) => Vec::new(),
    };

    json_response(ClassFullResponse {
        students,
        subjects,
        grades,
    })
}

// POST /api/grades/batch
fn handle_save_grades(
    request: &mut tiny_http::Request,
    state: &AppState,
) -> Response<io::Cursor<Vec<u8>>> {
    let mut content = String::new();
    if request.as_reader().read_to_string(&mut content).is_err() {
        return error_response(400, "Failed to read body");
    }

    let payload: BatchGradeRequest = match serde_json::from_str(&content) {
        Ok(p) => p,
        Err(_) => return error_response(400, "Invalid JSON"),
    };

    let mut conn = match Connection::open(&state.db_path) {
        Ok(c) => c,
        Err(_) => return error_response(500, "DB connection failed"),
    };

    let tx = match conn.transaction() {
        Ok(t) => t,
        Err(_) => return error_response(500, "Failed to start tx"),
    };

    for update in &payload.updates {
        // Upsert
        let res = tx.execute(
            "INSERT INTO grades (student_id, subject_id, period, value, is_dirty, last_modified_at)
             VALUES (?1, ?2, ?3, ?4, 1, datetime('now'))
             ON CONFLICT(student_id, subject_id, period)
             DO UPDATE SET value = ?4, is_dirty = 1, last_modified_at = datetime('now')",
            params![
                update.student_id,
                update.subject_id,
                update.period,
                update.value
            ],
        );
        if res.is_err() {
            let _ = tx.rollback();
            return error_response(500, "Failed to update grades");
        }
    }

    if tx.commit().is_err() {
        return error_response(500, "Failed to commit tx");
    }

    // Notify Desktop (Batch granular update)
    let event_payload = json!({
        "type": "grade_update",
        "updates": payload.updates
    });
    let _ = state.app_handle.emit("db:changed", &event_payload);

    // Broadcast to Mobile Clients (Keep individual updates if that's what they expect, or batch if supported)
    // For safety, let's just broadcast individual updates as per previous logic which likely works for mobile sync
    for update in payload.updates {
        let msg = serde_json::to_value(&update).unwrap();
        broadcast_msg(msg);
    }

    json_response(json!({"success": true}))
}

// --- Main Server Function ---

// --- Main Server Function ---

pub fn start_web_server(
    app_handle: tauri::AppHandle,
    db_path: PathBuf,
) -> Result<ServerInfo, String> {
    // Guard: Don't start if already running
    {
        let existing = SERVER_INFO.lock().unwrap();
        if let Some(info) = existing.as_ref() {
            if info.running {
                println!(
                    "[Server] Already running at http://{}:{}",
                    info.ip, info.port
                );
                return Ok(info.clone());
            }
        }
    }

    let ip = get_local_ip().unwrap_or(std::net::IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1)));

    // Bind synchronously to ensure we catch errors and get port immediately
    let server = match Server::http(format!("{}:3000", ip)) {
        Ok(s) => s,
        Err(_) => Server::http(format!("{}:0", ip)).map_err(|e| e.to_string())?,
    };

    let port_val = match server.server_addr() {
        tiny_http::ListenAddr::IP(addr) => addr.port(),
        _ => 3000,
    };

    let info = ServerInfo {
        ip: ip.to_string(),
        port: port_val,
        running: true,
    };

    {
        let mut global_info = SERVER_INFO.lock().unwrap();
        *global_info = Some(info.clone());
    }

    let _ = app_handle.emit("server-ready", ());
    println!("Tiny Server running at http://{}:{}", ip, port_val);

    let app_state = Arc::new(AppState {
        db_path,
        app_handle,
    });

    // Spawn the request handling loop
    std::thread::spawn(move || {
        for mut request in server.incoming_requests() {
            let state = app_state.clone();

            std::thread::spawn(move || {
                let url = request.url().to_string();
                let method = request.method().clone();
                let path = url.split('?').next().unwrap_or(&url);

                // API Routes
                if method == Method::Get && path == "/api/status" {
                    let _ = request.respond(json_response(json!({"status": "running"})));
                    return;
                }

                // GET /api/classes
                if method == Method::Get && path == "/api/classes" {
                    let _ = request.respond(handle_get_classes(&state));
                    return;
                }

                // GET /api/classes/:id/full
                if method == Method::Get
                    && path.starts_with("/api/classes/")
                    && path.ends_with("/full")
                {
                    let parts: Vec<&str> = path.split('/').collect();
                    if let Some(id_str) = parts.get(3) {
                        // /api/classes/123/full -> parts[3] is 123
                        if let Ok(id) = id_str.parse::<i64>() {
                            let _ = request.respond(handle_get_class_full(id, &state));
                            return;
                        }
                    }
                }

                // POST /api/grades/batch
                if method == Method::Post && path == "/api/grades/batch" {
                    let response = handle_save_grades(&mut request, &state);
                    let _ = request.respond(response);
                    return;
                }

                // SSE /api/events - Use raw socket for proper streaming
                if method == Method::Get && path == "/api/events" {
                    let (tx, rx) = std::sync::mpsc::channel::<serde_json::Value>();
                    {
                        let mut channels = SSE_CHANNEL.lock().unwrap();
                        channels.push(tx);
                    }

                    // Get raw writer to stream SSE properly
                    let mut writer = request.into_writer();

                    // Write HTTP headers manually
                    let headers = "HTTP/1.1 200 OK\r\n\
                        Content-Type: text/event-stream\r\n\
                        Cache-Control: no-cache\r\n\
                        Connection: keep-alive\r\n\
                        Access-Control-Allow-Origin: *\r\n\
                        \r\n";

                    if writer.write_all(headers.as_bytes()).is_err() {
                        return;
                    }
                    let _ = writer.flush();

                    // Stream SSE messages
                    loop {
                        match rx.recv_timeout(Duration::from_secs(15)) {
                            Ok(msg) => {
                                let data = format!("data: {}\n\n", msg);
                                if writer.write_all(data.as_bytes()).is_err() {
                                    break;
                                }
                                let _ = writer.flush();
                            }
                            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                                // Send keep-alive comment
                                if writer.write_all(b": keep-alive\n\n").is_err() {
                                    break;
                                }
                                let _ = writer.flush();
                            }
                            Err(_) => break, // Channel disconnected
                        }
                    }
                    return;
                }

                // Static Files (Mobile UI + assets) - Match Order matters!
                if method == Method::Get
                    && (path == "/"
                        || path.starts_with("/mobile")
                        || path.starts_with("/assets/")
                        || path.starts_with("/icons/"))
                {
                    if path == "/" {
                        let response = Response::empty(302).with_header(
                            Header::from_bytes(&b"Location"[..], &b"/mobile/"[..]).unwrap(),
                        );
                        let _ = request.respond(response);
                        return;
                    }

                    let _ = request.respond(serve_static_file(path, &state.app_handle));
                    return;
                }

                // Options handling for CORS
                if method == Method::Options {
                    let mut response = Response::empty(200);
                    for header in cors_headers() {
                        response.add_header(header);
                    }
                    let _ = request.respond(response);
                    return;
                }

                // 404
                let _ = request.respond(error_response(404, "Not Found"));
            });
        }
    });

    Ok(info)
}

// --- Exported Tauri Commands ---

pub fn get_server_info() -> Option<ServerInfo> {
    let info = SERVER_INFO.lock().unwrap();
    info.clone()
}

#[tauri::command]
pub fn broadcast_db_change(_payload: serde_json::Value) {
    // Le mobile attend { "event": "db:changed", "senderId": "..." }
    broadcast_msg(json!({
        "event": "db:changed",
        "senderId": "desktop"
    }));
}

// Data Types
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

#[derive(Serialize, Deserialize, Debug, Clone)]
struct GradeUpdate {
    student_id: i64,
    subject_id: i64,
    period: String,
    value: f64,
}

#[derive(Deserialize, Debug)]
struct BatchGradeRequest {
    updates: Vec<GradeUpdate>,
}
