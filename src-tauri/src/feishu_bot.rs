use std::sync::{Arc, Mutex, OnceLock};
use std::net::SocketAddr;
use axum::{
    routing::post,
    Router,
    extract::{State, Request},
    response::IntoResponse,
    http::{StatusCode, HeaderMap},
    body::Bytes,
};
use tokio::sync::oneshot;
use tauri::AppHandle;
use chrono::Utc;
use std::collections::HashMap;

// We will need to call the implementation details from lib.rs
// Since they are currently in lib.rs, we can either make them public or we can pass a closure/callback.
// To avoid big refactoring of lib.rs, we can define the Axum server here, and call crate::process_feishu_webhook_payload_impl
// Actually, it's easier to expose a public function in lib.rs for processing payload.

pub struct AxumWebhookRuntime {
    pub bind: String,
    pub port: u16,
    pub shutdown_tx: Option<oneshot::Sender<()>>,
}

static AXUM_WEBHOOK_RUNTIME: OnceLock<Mutex<Option<AxumWebhookRuntime>>> = OnceLock::new();

pub fn axum_webhook_runtime() -> &'static Mutex<Option<AxumWebhookRuntime>> {
    AXUM_WEBHOOK_RUNTIME.get_or_init(|| Mutex::new(None))
}

#[derive(Clone)]
struct AppState {
    app_handle: AppHandle,
}

pub async fn start_server(app: AppHandle, bind_host: String, port: u16) -> Result<(), String> {
    {
        let guard = axum_webhook_runtime()
            .lock()
            .map_err(|_| "webhook runtime lock poisoned".to_string())?;
        if guard.is_some() {
            return Ok(()); // Already running
        }
    }

    let state = AppState { app_handle: app.clone() };
    
    let app_router = Router::new()
        .route("/webhook/feishu", post(feishu_webhook_handler))
        .route("/", post(feishu_webhook_handler)) // Fallback
        .with_state(state);

    let addr: SocketAddr = format!("{}:{}", bind_host, port)
        .parse()
        .map_err(|e| format!("Invalid address: {}", e))?;

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Failed to bind to {}: {}", addr, e))?;

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    tauri::async_runtime::spawn(async move {
        let _ = axum::serve(listener, app_router)
            .with_graceful_shutdown(async move {
                let _ = shutdown_rx.await;
            })
            .await;
    });

    let mut guard = axum_webhook_runtime()
        .lock()
        .map_err(|_| "webhook runtime lock poisoned".to_string())?;
    if guard.is_some() {
        return Ok(());
    }
    *guard = Some(AxumWebhookRuntime {
        bind: bind_host,
        port,
        shutdown_tx: Some(shutdown_tx),
    });

    Ok(())
}

pub fn stop_server() -> Result<(), String> {
    let mut guard = axum_webhook_runtime()
        .lock()
        .map_err(|_| "webhook runtime lock poisoned".to_string())?;
    
    if let Some(mut runtime) = guard.take() {
        if let Some(tx) = runtime.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
    
    Ok(())
}

pub fn get_status() -> Result<(bool, String, Option<u16>), String> {
    let guard = axum_webhook_runtime()
        .lock()
        .map_err(|_| "webhook runtime lock poisoned".to_string())?;
    
    if let Some(runtime) = guard.as_ref() {
        Ok((true, runtime.bind.clone(), Some(runtime.port)))
    } else {
        Ok((false, "127.0.0.1".to_string(), None))
    }
}

async fn feishu_webhook_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> impl IntoResponse {
    let body_str = match String::from_utf8(body.to_vec()) {
        Ok(s) => s,
        Err(_) => return (StatusCode::BAD_REQUEST, axum::Json(serde_json::json!({"error": "invalid utf-8"}))).into_response(),
    };

    let mut headers_map = HashMap::new();
    for (key, value) in headers.iter() {
        if let Ok(v) = value.to_str() {
            headers_map.insert(key.as_str().to_ascii_lowercase(), v.to_string());
        }
    }

    // Call the synchronous processing function using spawn_blocking to not block the axum runtime
    let result = tokio::task::spawn_blocking(move || {
        crate::handle_feishu_webhook_request(&state.app_handle, headers_map, body_str)
    }).await.unwrap_or_else(|e| Err(format!("Task panic: {}", e)));

    match result {
        Ok(response_json) => (StatusCode::OK, axum::Json(response_json)).into_response(),
        Err(e) => (StatusCode::FORBIDDEN, axum::Json(serde_json::json!({
            "ok": false,
            "errorCode": "WEBHOOK_SECURITY_FAILED",
            "errorMessage": e
        }))).into_response()
    }
}
