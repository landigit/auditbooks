// src-tauri/src/commands.rs
// ---------------------------------------------------------------------------
// All Tauri commands exposed to the JS frontend.
//
// Database section: db_open, db_close, db_query, db_execute
// All SQL runs in Rust (libsql-rusqlite). JS calls invoke() for every query.
// ---------------------------------------------------------------------------

// libsql-rusqlite is a drop-in replacement for rusqlite and is exposed as rusqlite

use crate::db::{json_val_to_param, open_connection, sqlite_val_to_json, DbState};
use serde_json::{Map, Value};
use std::fs;
use std::path::Path;
use tauri::State;

// ============================================================================
// Database commands
// ============================================================================

/// Open (or create) a SQLite database at the given path.
/// Configures WAL, foreign_keys, etc. Replaces any existing connection.
#[tauri::command]
pub fn db_open(state: State<'_, DbState>, path: String) -> Result<(), String> {
    let conn = open_connection(&path)?;
    let mut guard = state.conn.lock().map_err(|e| e.to_string())?;
    // Close old connection before replacing
    if let Some(old) = guard.take() {
        drop(old);
    }
    *guard = Some(conn);
    Ok(())
}

/// Close the current database connection.
#[tauri::command]
pub fn db_close(state: State<'_, DbState>) -> Result<(), String> {
    let mut guard = state.conn.lock().map_err(|e| e.to_string())?;
    if let Some(conn) = guard.take() {
        drop(conn); // rusqlite closes on drop
    }
    Ok(())
}

#[derive(serde::Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Value>>,
}

/// Execute a SELECT (or PRAGMA / EXPLAIN) and return all rows as JSON.
#[tauri::command]
pub fn db_query(
    state: State<'_, DbState>,
    sql: String,
    args: Vec<Value>,
) -> Result<QueryResult, String> {
    let guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not open")?;

    let params: Vec<_> = args.iter().map(json_val_to_param).collect();
    let params_refs: Vec<&dyn rusqlite::ToSql> =
        params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("prepare error: {e}\nSQL: {sql}"))?;

    let col_names: Vec<String> = stmt
        .column_names()
        .iter()
        .map(|s| s.to_string())
        .collect();

    let rows = stmt
        .query_map(params_refs.as_slice(), |row| {
            let mut values = Vec::new();
            for i in 0..col_names.len() {
                let val = sqlite_val_to_json(row.get_ref(i)?);
                values.push(val);
            }
            Ok(values)
        })
        .map_err(|e| format!("query error: {e}"))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("row error: {e}"))?);
    }
    Ok(QueryResult {
        columns: col_names,
        rows: result,
    })
}

/// Execute an INSERT / UPDATE / DELETE / CREATE / PRAGMA (non-SELECT).
/// Returns the number of rows affected.
#[tauri::command]
pub fn db_execute(
    state: State<'_, DbState>,
    sql: String,
    args: Vec<Value>,
) -> Result<u64, String> {
    let guard = state.conn.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("Database not open")?;

    let params: Vec<_> = args.iter().map(json_val_to_param).collect();
    let params_refs: Vec<&dyn rusqlite::ToSql> =
        params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();

    let affected = conn
        .execute(&sql, params_refs.as_slice())
        .map_err(|e| format!("execute error: {e}\nSQL: {sql}"))?;

    Ok(affected as u64)
}

// ============================================================================
// Utility commands
// ============================================================================

/// Returns environment information for the frontend.
#[tauri::command]
pub fn get_env() -> Value {
    serde_json::json!({
        "isDevelopment": cfg!(debug_assertions),
        "platform": std::env::consts::OS,
        "version": env!("CARGO_PKG_VERSION")
    })
}

/// Returns the app data directory path.
#[tauri::command]
pub fn get_app_data_dir(app: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// Check if a database file exists.
#[tauri::command]
pub fn check_db_access(file_path: String) -> bool {
    Path::new(&file_path).exists()
}

/// Delete a database file.
#[tauri::command]
pub fn delete_file(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Write data to a file.
#[tauri::command]
pub fn save_data(data: String, save_path: String) -> Result<(), String> {
    let path = Path::new(&save_path);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, data).map_err(|e| e.to_string())?;
    Ok(())
}
