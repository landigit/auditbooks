// src-tauri/src/db.rs
// ---------------------------------------------------------------------------
// Rust SQLite manager — libsql-rusqlite (turso libSQL fork, rusqlite-compatible).
//
// All SQL runs here in Rust. The JS side (fyo/demux/dbTauri.ts) sends SQL
// and args via invoke(), receives back JSON rows.
// ---------------------------------------------------------------------------

// libsql-rusqlite is a drop-in replacement for rusqlite and is exposed as rusqlite
use rusqlite::{types::ValueRef, Connection, OpenFlags};
use serde_json::{Map, Number, Value};
use std::sync::{Arc, Mutex};

// ---------------------------------------------------------------------------
// State — held by Tauri's managed state system
// ---------------------------------------------------------------------------

pub struct DbState {
    pub conn: Arc<Mutex<Option<Connection>>>,
}

impl DbState {
    pub fn new() -> Self {
        Self {
            conn: Arc::new(Mutex::new(None)),
        }
    }
}

// ---------------------------------------------------------------------------
// Helpers — convert between rusqlite and serde_json
// ---------------------------------------------------------------------------

/// Convert a rusqlite ValueRef to a serde_json Value.
pub fn sqlite_val_to_json(v: ValueRef<'_>) -> Value {
    match v {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(i) => Value::Number(i.into()),
        ValueRef::Real(f) => Number::from_f64(f)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        ValueRef::Text(t) => {
            Value::String(String::from_utf8_lossy(t).into_owned())
        }
        ValueRef::Blob(b) => {
            // Return blobs as hex strings so JSON stays text-safe
            Value::String(hex::encode(b))
        }
    }
}

/// Convert a serde_json Value into a boxed rusqlite ToSql param.
/// Returns a dyn ToSql-compatible enum value stored inline.
pub enum SqlParam {
    Null,
    Int(i64),
    Float(f64),
    Text(String),
}

impl rusqlite::ToSql for SqlParam {
    fn to_sql(&self) -> rusqlite::Result<rusqlite::types::ToSqlOutput<'_>> {
        use rusqlite::types::ToSqlOutput;
        match self {
            SqlParam::Null => Ok(ToSqlOutput::Owned(rusqlite::types::Value::Null)),
            SqlParam::Int(i) => Ok(ToSqlOutput::Owned(rusqlite::types::Value::Integer(*i))),
            SqlParam::Float(f) => Ok(ToSqlOutput::Owned(rusqlite::types::Value::Real(*f))),
            SqlParam::Text(s) => Ok(ToSqlOutput::Owned(rusqlite::types::Value::Text(s.clone()))),
        }
    }
}

pub fn json_val_to_param(v: &Value) -> SqlParam {
    match v {
        Value::Null => SqlParam::Null,
        Value::Bool(b) => SqlParam::Int(if *b { 1 } else { 0 }),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                SqlParam::Int(i)
            } else if let Some(f) = n.as_f64() {
                SqlParam::Float(f)
            } else {
                SqlParam::Null
            }
        }
        Value::String(s) => SqlParam::Text(s.clone()),
        _ => SqlParam::Null,
    }
}

// ---------------------------------------------------------------------------
// Core open helper — called from db_open command
// ---------------------------------------------------------------------------

pub fn open_connection(path: &str) -> Result<Connection, String> {
    let conn = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_WRITE
            | OpenFlags::SQLITE_OPEN_CREATE
            | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|e| format!("rusqlite open error: {e}"))?;

    // Configure for performance and safety
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA synchronous=NORMAL;
         PRAGMA foreign_keys=ON;
         PRAGMA busy_timeout=5000;",
    )
    .map_err(|e| format!("rusqlite pragma error: {e}"))?;

    Ok(conn)
}
