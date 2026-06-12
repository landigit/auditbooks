use rusqlite::{types::ValueRef, Connection, Row};
use serde_json::{Map, Value};
use std::sync::Mutex;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Field {
  pub fieldname: String,
  pub fieldtype: String,
  pub label: Option<String>,
  pub required: Option<bool>,
  pub default: Option<Value>,
  pub computed: Option<bool>,
  pub target: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Schema {
  pub name: String,
  pub label: Option<String>,
  pub fields: Vec<Field>,
  pub is_child: Option<bool>,
  pub is_single: Option<bool>,
  pub naming: Option<String>,
}

pub type SchemaMap = std::collections::HashMap<String, Schema>;

pub struct DbState {
  pub conn: Mutex<Option<Connection>>,
  pub schema_map: Mutex<Option<SchemaMap>>,
  pub current_uri: Mutex<Option<String>>,
  pub local_path: Mutex<Option<String>>,
}

#[cfg(target_os = "android")]
fn clear_jni_exception() {
  let ctx = ndk_context::android_context();
  if let Ok(vm) = unsafe { jni::JavaVM::from_raw(ctx.vm().cast()) } {
    if let Ok(env) = vm.attach_current_thread() {
      let _ = env.exception_clear();
    }
  }
}

#[cfg(target_os = "android")]
fn copy_content_uri_to_local_inner(uri_str: &str) -> Result<String, String> {
  use jni::objects::JValue;
  use std::fs::File;
  use std::io::Write;

  let ctx = ndk_context::android_context();
  let vm = unsafe { jni::JavaVM::from_raw(ctx.vm().cast()) }.map_err(|e| e.to_string())?;
  let mut env = vm.attach_current_thread().map_err(|e| e.to_string())?;
  let context = unsafe { jni::objects::JObject::from_raw(ctx.context().cast()) };

  // Parse Uri: Uri.parse(uri_str)
  let uri_class = env.find_class("android/net/Uri").map_err(|e| e.to_string())?;
  let j_uri_str = env.new_string(uri_str).map_err(|e| e.to_string())?;
  let uri = env.call_static_method(
    &uri_class,
    "parse",
    "(Ljava/lang/String;)Landroid/net/Uri;",
    &[JValue::Object(&j_uri_str)],
  ).map_err(|e| e.to_string())?.l().map_err(|e| e.to_string())?;

  // Get contentResolver: context.getContentResolver()
  let resolver = env.call_method(
    &context,
    "getContentResolver",
    "()Landroid/content/ContentResolver;",
    &[],
  ).map_err(|e| e.to_string())?.l().map_err(|e| e.to_string())?;

  // Persist permission for this URI (catch and clear SecurityException if it's not persistable)
  let persist_res = env.call_method(
    &resolver,
    "takePersistableUriPermission",
    "(Landroid/net/Uri;I)V",
    &[JValue::Object(&uri), JValue::Int(3)], // 3 = FLAG_GRANT_READ_URI_PERMISSION | FLAG_GRANT_WRITE_URI_PERMISSION
  );
  if persist_res.is_err() {
    let _ = env.exception_clear();
  }

  // Open input stream: resolver.openInputStream(uri)
  let mut bytes = Vec::new();
  let input_stream_res = env.call_method(
    &resolver,
    "openInputStream",
    "(Landroid/net/Uri;)Ljava/io/InputStream;",
    &[JValue::Object(&uri)],
  );

  if let Ok(val) = input_stream_res {
    if let Ok(input_stream) = val.l() {
      if let Ok(j_buffer) = env.new_byte_array(8192) {
        loop {
          let read_res = env.call_method(
            &input_stream,
            "read",
            "([B)I",
            &[JValue::Object(&j_buffer)],
          );
          if let Ok(read_val) = read_res {
            if let Ok(read_bytes) = read_val.i() {
              if read_bytes <= 0 {
                break;
              }
              let mut temp = vec![0i8; read_bytes as usize];
              if env.get_byte_array_region(&j_buffer, 0, &mut temp).is_ok() {
                let u8_temp = unsafe { std::mem::transmute::<Vec<i8>, Vec<u8>>(temp) };
                bytes.extend_from_slice(&u8_temp);
              } else {
                break;
              }
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }
      let _ = env.call_method(&input_stream, "close", "()V", &[]);
    }
  } else {
    let _ = env.exception_clear();
  }

  // Get cache dir: context.getCacheDir()
  let cache_dir = env.call_method(
    &context,
    "getCacheDir",
    "()Ljava/io/File;",
    &[],
  ).map_err(|e| e.to_string())?.l().map_err(|e| e.to_string())?;

  // Get cache dir absolute path
  let cache_path_jstr = env.call_method(
    &cache_dir,
    "getAbsolutePath",
    "()Ljava/lang/String;",
    &[],
  ).map_err(|e| e.to_string())?.l().map_err(|e| e.to_string())?;
  let cache_path: String = env.get_string(&cache_path_jstr.into()).map_err(|e| e.to_string())?.into();

  // Write to resolved_db.db in cache directory
  let local_path = std::path::Path::new(&cache_path).join("resolved_db.db");
  let mut file = File::create(&local_path).map_err(|e| e.to_string())?;
  file.write_all(&bytes).map_err(|e| e.to_string())?;

  Ok(local_path.to_string_lossy().to_string())
}

#[cfg(target_os = "android")]
fn copy_content_uri_to_local(uri_str: &str) -> Result<String, String> {
  let res = copy_content_uri_to_local_inner(uri_str);
  if res.is_err() {
    clear_jni_exception();
  }
  res
}

#[cfg(target_os = "android")]
fn copy_local_to_content_uri_inner(local_path: &str, uri_str: &str) -> Result<(), String> {
  use jni::objects::JValue;
  use std::fs::File;
  use std::io::Read;

  let ctx = ndk_context::android_context();
  let vm = unsafe { jni::JavaVM::from_raw(ctx.vm().cast()) }.map_err(|e| e.to_string())?;
  let mut env = vm.attach_current_thread().map_err(|e| e.to_string())?;
  let context = unsafe { jni::objects::JObject::from_raw(ctx.context().cast()) };

  // Read local file bytes
  let mut file = File::open(local_path).map_err(|e| e.to_string())?;
  let mut bytes = Vec::new();
  file.read_to_end(&mut bytes).map_err(|e| e.to_string())?;

  // Parse Uri: Uri.parse(uri_str)
  let uri_class = env.find_class("android/net/Uri").map_err(|e| e.to_string())?;
  let j_uri_str = env.new_string(uri_str).map_err(|e| e.to_string())?;
  let uri = env.call_static_method(
    &uri_class,
    "parse",
    "(Ljava/lang/String;)Landroid/net/Uri;",
    &[JValue::Object(&j_uri_str)],
  ).map_err(|e| e.to_string())?.l().map_err(|e| e.to_string())?;

  // Get contentResolver: context.getContentResolver()
  let resolver = env.call_method(
    &context,
    "getContentResolver",
    "()Landroid/content/ContentResolver;",
    &[],
  ).map_err(|e| e.to_string())?.l().map_err(|e| e.to_string())?;

  // Persist permission for this URI (catch and clear SecurityException if it's not persistable)
  let persist_res = env.call_method(
    &resolver,
    "takePersistableUriPermission",
    "(Landroid/net/Uri;I)V",
    &[JValue::Object(&uri), JValue::Int(3)], // 3 = FLAG_GRANT_READ_URI_PERMISSION | FLAG_GRANT_WRITE_URI_PERMISSION
  );
  if persist_res.is_err() {
    let _ = env.exception_clear();
  }

  // Open output stream: resolver.openOutputStream(uri, "rwt")
  let mode_jstr = env.new_string("rwt").map_err(|e| e.to_string())?;
  let output_stream = env.call_method(
    &resolver,
    "openOutputStream",
    "(Landroid/net/Uri;Ljava/lang/String;)Ljava/io/OutputStream;",
    &[JValue::Object(&uri), JValue::Object(&mode_jstr)],
  ).map_err(|e| e.to_string())?.l().map_err(|e| e.to_string())?;

  // Write bytes in chunks to OutputStream
  let output_stream_class = env.find_class("java/io/OutputStream").map_err(|e| e.to_string())?;
  let write_method = env.get_method_id(&output_stream_class, "write", "([BII)V").map_err(|e| e.to_string())?;

  let chunk_size = 8192;
  for chunk in bytes.chunks(chunk_size) {
    let j_chunk = env.new_byte_array(chunk.len() as jni::sys::jsize).map_err(|e| e.to_string())?;
    let i8_chunk = unsafe { std::mem::transmute::<&[u8], &[i8]>(chunk) };
    env.set_byte_array_region(&j_chunk, 0, i8_chunk).map_err(|e| e.to_string())?;
    
    unsafe {
      env.call_method_unchecked(
        &output_stream,
        write_method,
        jni::signature::ReturnType::Primitive(jni::signature::Primitive::Void),
        &[JValue::Object(&j_chunk).as_jni(), JValue::Int(0).as_jni(), JValue::Int(chunk.len() as i32).as_jni()],
      )
    }.map_err(|e| e.to_string())?;
  }

  // Flush and close output stream
  let _ = env.call_method(&output_stream, "flush", "()V", &[]);
  let _ = env.call_method(&output_stream, "close", "()V", &[]);

  Ok(())
}

#[cfg(target_os = "android")]
fn copy_local_to_content_uri(local_path: &str, uri_str: &str) -> Result<(), String> {
  let res = copy_local_to_content_uri_inner(local_path, uri_str);
  if res.is_err() {
    clear_jni_exception();
  }
  res
}

#[cfg(not(target_os = "android"))]
#[allow(dead_code)]
fn copy_content_uri_to_local(_uri_str: &str) -> Result<String, String> {
  Err("Content URIs are only supported on Android".to_string())
}

#[cfg(not(target_os = "android"))]
#[allow(dead_code)]
fn copy_local_to_content_uri(_local_path: &str, _uri_str: &str) -> Result<(), String> {
  Err("Content URIs are only supported on Android".to_string())
}


fn sync_db_if_needed(_state: &tauri::State<'_, DbState>) -> Result<(), String> {
  #[cfg(target_os = "android")]
  {
    let current_uri_guard = _state.current_uri.lock().map_err(|e| e.to_string())?;
    let local_path_guard = _state.local_path.lock().map_err(|e| e.to_string())?;
    if let (Some(uri), Some(path)) = (current_uri_guard.as_ref(), local_path_guard.as_ref()) {
      copy_local_to_content_uri(path, uri)?;
    }
  }
  Ok(())
}

fn table_exists(conn: &Connection, table_name: &str) -> bool {
  let mut stmt = match conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?1") {
    Ok(s) => s,
    Err(_) => return false,
  };
  stmt.exists([table_name]).unwrap_or(false)
}

fn get_sqlite_type(fieldtype: &str) -> Option<&'static str> {
  match fieldtype {
    "Int" => Some("INTEGER"),
    "Float" | "Percent" => Some("REAL"),
    "Check" => Some("INTEGER"),
    "AutoComplete" | "Currency" | "Code" | "Date" | "Datetime" | "Time" | "Text" | "Data" |
    "Secret" | "Link" | "DynamicLink" | "Password" | "Select" | "Attachment" | "AttachImage" |
    "Color" => Some("TEXT"),
    _ => None,
  }
}

fn random_string() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  let nanos = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
  static mut COUNTER: u32 = 0;
  let count = unsafe {
    COUNTER += 1;
    COUNTER
  };
  format!("{:x}{:x}", nanos & 0xFFFFFFFF, count)
}

fn row_to_json(row: &Row) -> rusqlite::Result<Value> {
  let column_names = row.as_ref().column_names();
  let mut map = Map::new();
  for (i, col_name) in column_names.iter().enumerate() {
    let val = match row.get_ref(i)? {
      ValueRef::Null => Value::Null,
      ValueRef::Integer(n) => Value::Number(n.into()),
      ValueRef::Real(f) => {
        if let Some(n) = serde_json::Number::from_f64(f) {
          Value::Number(n)
        } else {
          Value::Null
        }
      }
      ValueRef::Text(t) => {
        let s = std::str::from_utf8(t).unwrap_or("");
        Value::String(s.to_string())
      }
      ValueRef::Blob(b) => {
        let s = std::str::from_utf8(b).unwrap_or("");
        Value::String(s.to_string())
      }
    };
    map.insert(col_name.to_string(), val);
  }
  Ok(Value::Object(map))
}

#[allow(dead_code)]
pub fn row_to_type<T: serde::de::DeserializeOwned>(row: &Row) -> Result<T, String> {
  let val = row_to_json(row).map_err(|e| e.to_string())?;
  serde_json::from_value(val).map_err(|e| e.to_string())
}

#[allow(dead_code)]
pub trait ConnectionExt {
  fn query_all_typed<T: serde::de::DeserializeOwned>(&self, sql: &str, params: &[&dyn rusqlite::types::ToSql]) -> Result<Vec<T>, String>;
  fn query_one_typed<T: serde::de::DeserializeOwned>(&self, sql: &str, params: &[&dyn rusqlite::types::ToSql]) -> Result<Option<T>, String>;
}

#[allow(dead_code)]
impl ConnectionExt for Connection {
  fn query_all_typed<T: serde::de::DeserializeOwned>(&self, sql: &str, params: &[&dyn rusqlite::types::ToSql]) -> Result<Vec<T>, String> {
    let mut stmt = self.prepare(sql).map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params).map_err(|e| e.to_string())?;
    let mut results = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
      let item = row_to_type(row)?;
      results.push(item);
    }
    Ok(results)
  }

  fn query_one_typed<T: serde::de::DeserializeOwned>(&self, sql: &str, params: &[&dyn rusqlite::types::ToSql]) -> Result<Option<T>, String> {
    let mut stmt = self.prepare(sql).map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
      let item = row_to_type(row)?;
      Ok(Some(item))
    } else {
      Ok(None)
    }
  }
}

fn val_to_tosql(val: &Value) -> Result<rusqlite::types::ToSqlOutput<'static>, String> {
  match val {
    Value::Null => Ok(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Null)),
    Value::Bool(b) => Ok(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Integer(if *b { 1 } else { 0 }))),
    Value::Number(n) => {
      if let Some(i) = n.as_i64() {
        Ok(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Integer(i)))
      } else if let Some(f) = n.as_f64() {
        Ok(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Real(f)))
      } else {
        Err("Unsupported number type".to_string())
      }
    }
    Value::String(s) => Ok(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(s.clone()))),
    _ => Ok(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(val.to_string()))),
  }
}

fn apply_filters(
  query_str: &mut String,
  params: &mut Vec<rusqlite::types::ToSqlOutput<'static>>,
  filters: &Value,
) -> Result<(), String> {
  if !filters.is_object() {
    return Ok(());
  }

  let mut first = true;
  for (field, val) in filters.as_object().unwrap() {
    let mut conditions = Vec::new();

    if val.is_array() {
      let arr = val.as_array().unwrap();
      if arr.len() >= 2 {
        let op = arr[0].as_str().unwrap_or("=").to_lowercase();
        let cmp_val = &arr[1];
        conditions.push((op, cmp_val.clone()));
      }
      if arr.len() >= 4 {
        let op2 = arr[2].as_str().unwrap_or("=").to_lowercase();
        let cmp_val2 = &arr[3];
        conditions.push((op2, cmp_val2.clone()));
      }
    } else {
      conditions.push(("=".to_string(), val.clone()));
    }

    for (mut op, cmp_val) in conditions {
      if first {
        query_str.push_str(" WHERE ");
        first = false;
      } else {
        query_str.push_str(" AND ");
      }

      if op == "includes" {
        op = "like".to_string();
      }

      if cmp_val.is_null() {
        if op == "=" {
          query_str.push_str(&format!("\"{}\" IS NULL", field));
        } else {
          query_str.push_str(&format!("\"{}\" IS NOT NULL", field));
        }
      } else if op == "in" {
        if cmp_val.is_array() {
          let list = cmp_val.as_array().unwrap();
          if list.is_empty() {
            query_str.push_str("0");
          } else {
            let includes_null = list.iter().any(|item| item.is_null());
            let non_null_items: Vec<_> = list.iter().filter(|item| !item.is_null()).collect();

            if includes_null && non_null_items.is_empty() {
              query_str.push_str(&format!("\"{}\" IS NULL", field));
            } else {
              let mut in_parts = Vec::new();
              for item in non_null_items {
                in_parts.push("?");
                params.push(val_to_tosql(item)?);
              }
              let in_clause = in_parts.join(", ");
              if includes_null {
                query_str.push_str(&format!("(\"{}\" IN ({}) OR \"{}\" IS NULL)", field, in_clause, field));
              } else {
                query_str.push_str(&format!("\"{}\" IN ({})", field, in_clause));
              }
            }
          }
        } else {
          return Err("in operator requires an array value".to_string());
        }
      } else {
        let mut final_val = cmp_val.clone();
        if op == "like" {
          if let Some(s) = cmp_val.as_str() {
            if !s.contains('%') {
              final_val = Value::String(format!("%{}%", s));
            }
          }
        }
        query_str.push_str(&format!("\"{}\" {} ?", field, op));
        params.push(val_to_tosql(&final_val)?);
      }
    }
  }
  Ok(())
}

fn query_one(
  conn: &Connection,
  table_name: &str,
  name: &str,
  fields: &[String],
) -> Result<Option<Value>, String> {
  let fields_joined = fields
    .iter()
    .map(|f| format!("\"{}\"", f.replace('\"', "\\\"")))
    .collect::<Vec<_>>()
    .join(", ");
  let query_str = format!("SELECT {} FROM \"{}\" WHERE name = ?1 LIMIT 1", fields_joined, table_name);
  let mut stmt = conn.prepare(&query_str).map_err(|e| e.to_string())?;
  let mut rows = stmt.query([name]).map_err(|e| e.to_string())?;
  if let Some(row) = rows.next().map_err(|e| e.to_string())? {
    let val = row_to_json(row).map_err(|e| e.to_string())?;
    Ok(Some(val))
  } else {
    Ok(None)
  }
}

fn get_all(
  conn: &Connection,
  schema_map: &SchemaMap,
  schema_name: &str,
  options: &Value,
) -> Result<Value, String> {
  let schema = schema_map.get(schema_name).ok_or_else(|| format!("Schema {} not found", schema_name))?;
  let fields_val = options.get("fields");
  
  let mut fields_list = if let Some(fields_arr) = fields_val.and_then(|f| f.as_array()) {
    fields_arr
      .iter()
      .map(|v| v.as_str().unwrap_or("").to_string())
      .filter(|f| !f.is_empty())
      .collect::<Vec<_>>()
  } else if let Some(fields_str) = fields_val.and_then(|f| f.as_str()) {
    if fields_str.is_empty() {
      vec![]
    } else {
      vec![fields_str.to_string()]
    }
  } else {
    vec!["name".to_string()]
  };

  let mut fields_joined = fields_list
    .iter()
    .map(|f| {
      if f == "*" {
        "*".to_string()
      } else {
        format!("\"{}\"", f.replace('\"', "\\\""))
      }
    })
    .collect::<Vec<_>>()
    .join(", ");

  if fields_joined.is_empty() {
    fields_joined = "*".to_string();
  }

  let mut query_str = format!("SELECT {} FROM \"{}\"", fields_joined, schema_name);
  let mut params = Vec::new();

  if let Some(filters) = options.get("filters") {
    apply_filters(&mut query_str, &mut params, filters)?;
  }

  if let Some(group_by_val) = options.get("groupBy") {
    let group_list = if let Some(arr) = group_by_val.as_array() {
      arr.iter().map(|v| format!("\"{}\"", v.as_str().unwrap_or("").replace('\"', "\\\""))).collect::<Vec<_>>()
    } else if let Some(s) = group_by_val.as_str() {
      vec![format!("\"{}\"", s.replace('\"', "\\\""))]
    } else {
      vec![]
    };
    if !group_list.is_empty() {
      query_str.push_str(&format!(" GROUP BY {}", group_list.join(", ")));
    }
  }

  let has_created = schema.fields.iter().any(|field| field.fieldname == "created");

  let order_by_val = options.get("orderBy");
  let order_str = options.get("order").and_then(|o| o.as_str()).unwrap_or("desc");

  let order_list = if let Some(arr) = order_by_val.and_then(|v| v.as_array()) {
    arr.iter().map(|v| format!("\"{}\"", v.as_str().unwrap_or("").replace('\"', "\\\""))).collect::<Vec<_>>()
  } else if let Some(s) = order_by_val.and_then(|v| v.as_str()) {
    vec![format!("\"{}\"", s.replace('\"', "\\\""))]
  } else if has_created {
    vec!["\"created\"".to_string()]
  } else {
    vec![]
  };

  if !order_list.is_empty() {
    query_str.push_str(&format!(" ORDER BY {} {}", order_list.join(", "), order_str));
  }

  if let Some(limit) = options.get("limit").and_then(|l| l.as_i64()) {
    query_str.push_str(&format!(" LIMIT {}", limit));
  }
  if let Some(offset) = options.get("offset").and_then(|o| o.as_i64()) {
    query_str.push_str(&format!(" OFFSET {}", offset));
  }

  let mut stmt = conn.prepare(&query_str).map_err(|e| format!("Query error: {} (SQL: {})", e, query_str))?;
  let params_refs: Vec<&dyn rusqlite::types::ToSql> = params
    .iter()
    .map(|p| p as &dyn rusqlite::types::ToSql)
    .collect();

  let mut rows = stmt.query(&params_refs[..]).map_err(|e| e.to_string())?;
  let mut results = Vec::new();
  while let Some(row) = rows.next().map_err(|e| e.to_string())? {
    results.push(row_to_json(row).map_err(|e| e.to_string())?);
  }

  Ok(Value::Array(results))
}

fn update_single_value(
  conn: &Connection,
  single_schema_name: &str,
  fieldname: &str,
  value: &Value,
) -> Result<(), String> {
  let count: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM SingleValue WHERE parent = ?1 AND fieldname = ?2",
      [single_schema_name, fieldname],
      |row| row.get(0),
    )
    .map_err(|e| e.to_string())?;

  let value_str = match value {
    Value::Null => "".to_string(),
    Value::String(s) => s.clone(),
    Value::Number(n) => n.to_string(),
    Value::Bool(b) => (if *b { "1" } else { "0" }).to_string(),
    _ => value.to_string(),
  };

  if count == 0 {
    let name = random_string();
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
      "INSERT INTO SingleValue (name, parent, fieldname, value, created, modified, createdBy, modifiedBy) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
      [name.as_str(), single_schema_name, fieldname, &value_str, &now, &now, "__SYSTEM__", "__SYSTEM__"],
    ).map_err(|e| e.to_string())?;
  } else {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
      "UPDATE SingleValue SET value = ?1, modified = ?2, modifiedBy = ?3 WHERE parent = ?4 AND fieldname = ?5",
      [&value_str, &now, "__SYSTEM__", single_schema_name, fieldname],
    ).map_err(|e| e.to_string())?;
  }
  Ok(())
}

fn update_one(
  conn: &Connection,
  schema: &Schema,
  schema_name: &str,
  field_value_map: &Value,
) -> Result<(), String> {
  let name_val = field_value_map.get("name").and_then(|n| n.as_str()).ok_or("Missing name for update")?;

  let mut update_parts = Vec::new();
  let mut params = Vec::new();

  for field in &schema.fields {
    if field.fieldname == "name" || field.fieldname.is_empty() {
      continue;
    }
    if field.fieldtype == "Table" || field.computed.unwrap_or(false) {
      continue;
    }

    if let Some(val) = field_value_map.get(&field.fieldname) {
      update_parts.push(format!("\"{}\" = ?", field.fieldname));
      params.push(val_to_tosql(val)?);
    }
  }

  if update_parts.is_empty() {
    return Ok(());
  }

  let query_str = format!("UPDATE \"{}\" SET {} WHERE name = ?", schema_name, update_parts.join(", "));
  params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(name_val.to_string())));

  let params_refs: Vec<&dyn rusqlite::types::ToSql> = params
    .iter()
    .map(|p| p as &dyn rusqlite::types::ToSql)
    .collect();

  conn.execute(&query_str, &params_refs[..]).map_err(|e| e.to_string())?;
  Ok(())
}

fn insert_one(
  conn: &Connection,
  schema: &Schema,
  schema_name: &str,
  field_value_map: &mut Value,
) -> Result<(), String> {
  if field_value_map.get("name").and_then(|n| n.as_str()).unwrap_or("").is_empty() {
    let name_str = random_string();
    field_value_map.as_object_mut().unwrap().insert("name".to_string(), Value::String(name_str));
  }

  let mut columns = Vec::new();
  let mut placeholders = Vec::new();
  let mut params = Vec::new();

  for field in &schema.fields {
    if field.fieldname.is_empty() {
      continue;
    }
    if field.fieldtype == "Table" || field.computed.unwrap_or(false) {
      continue;
    }

    if let Some(val) = field_value_map.get(&field.fieldname) {
      columns.push(format!("\"{}\"", field.fieldname));
      placeholders.push("?");
      params.push(val_to_tosql(val)?);
    }
  }

  if columns.is_empty() {
    return Ok(());
  }

  let query_str = format!(
    "INSERT INTO \"{}\" ({}) VALUES ({})",
    schema_name,
    columns.join(", "),
    placeholders.join(", ")
  );

  let params_refs: Vec<&dyn rusqlite::types::ToSql> = params
    .iter()
    .map(|p| p as &dyn rusqlite::types::ToSql)
    .collect();

  conn.execute(&query_str, &params_refs[..]).map_err(|e| e.to_string())?;
  Ok(())
}

fn insert_or_update_children(
  conn: &Connection,
  schema_map: &SchemaMap,
  schema: &Schema,
  schema_name: &str,
  field_value_map: &mut Value,
  is_update: bool,
) -> Result<(), String> {
  let parent_name = if schema.is_single.unwrap_or(false) {
    schema_name.to_string()
  } else {
    field_value_map.get("name").and_then(|n| n.as_str()).ok_or("Missing name for parent")?.to_string()
  };

  for field in &schema.fields {
    if field.fieldtype != "Table" {
      continue;
    }

    let target_schema_name = field.target.as_ref().ok_or("Missing target for child table")?;
    let target_schema = schema_map.get(target_schema_name).ok_or_else(|| format!("Child schema {} not found", target_schema_name))?;

    if let Some(children_arr) = field_value_map.get_mut(&field.fieldname).and_then(|v| v.as_array_mut()) {
      let mut added = Vec::new();
      for (idx, child) in children_arr.iter_mut().enumerate() {
        if !child.is_object() {
          continue;
        }
        let child_obj = child.as_object_mut().unwrap();
        
        let child_name = if let Some(n) = child_obj.get("name").and_then(|n| n.as_str()) {
          n.to_string()
        } else {
          let name_str = random_string();
          child_obj.insert("name".to_string(), Value::String(name_str.clone()));
          name_str
        };

        child_obj.insert("parent".to_string(), Value::String(parent_name.clone()));
        child_obj.insert("parentSchemaName".to_string(), Value::String(schema_name.to_string()));
        child_obj.insert("parentFieldname".to_string(), Value::String(field.fieldname.to_string()));
        child_obj.insert("idx".to_string(), Value::Number(idx.into()));

        let exists = {
          let mut stmt = conn.prepare(&format!("SELECT 1 FROM \"{}\" WHERE name = ?1 LIMIT 1", target_schema_name)).map_err(|e| e.to_string())?;
          stmt.exists([&child_name]).map_err(|e| e.to_string())?
        };

        if is_update && exists {
          update_one(conn, target_schema, target_schema_name, child)?;
        } else {
          insert_one(conn, target_schema, target_schema_name, child)?;
        }
        added.push(child_name);
      }

      if is_update {
        let mut query_str = format!("DELETE FROM \"{}\" WHERE parent = ?1", target_schema_name);
        let mut params = vec![rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(parent_name.clone()))];
        if !added.is_empty() {
          let in_placeholders = added.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
          query_str.push_str(&format!(" AND name NOT IN ({})", in_placeholders));
          for a in added {
            params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(a)));
          }
        }
        let params_refs: Vec<&dyn rusqlite::types::ToSql> = params
          .iter()
          .map(|p| p as &dyn rusqlite::types::ToSql)
          .collect();
        conn.execute(&query_str, &params_refs[..]).map_err(|e| e.to_string())?;
      }
    }
  }
  Ok(())
}

fn delete_doc(
  conn: &Connection,
  schema_map: &SchemaMap,
  schema_name: &str,
  name: &str,
) -> Result<(), String> {
  let schema = schema_map.get(schema_name).ok_or_else(|| format!("Schema {} not found", schema_name))?;

  if schema.is_single.unwrap_or(false) {
    conn.execute(
      "DELETE FROM SingleValue WHERE parent = ?1 AND fieldname = ?2",
      [schema_name, name],
    ).map_err(|e| e.to_string())?;
  } else {
    conn.execute(
      &format!("DELETE FROM \"{}\" WHERE name = ?1", schema_name),
      [name],
    ).map_err(|e| e.to_string())?;

    for field in &schema.fields {
      if field.fieldtype == "Table" {
        let target_schema_name = field.target.as_ref().ok_or("Missing target for child table")?;
        conn.execute(
          &format!("DELETE FROM \"{}\" WHERE parent = ?1", target_schema_name),
          [name],
        ).map_err(|e| e.to_string())?;
      }
    }
  }
  Ok(())
}

fn delete_all(
  conn: &Connection,
  schema_name: &str,
  filters: &Value,
) -> Result<usize, String> {
  let mut query_str = format!("DELETE FROM \"{}\"", schema_name);
  let mut params = Vec::new();
  apply_filters(&mut query_str, &mut params, filters)?;

  let params_refs: Vec<&dyn rusqlite::types::ToSql> = params
    .iter()
    .map(|p| p as &dyn rusqlite::types::ToSql)
    .collect();

  let count = conn.execute(&query_str, &params_refs[..]).map_err(|e| e.to_string())?;
  Ok(count)
}

fn get_single_values(
  conn: &Connection,
  fieldnames: &[Value],
) -> Result<Value, String> {
  if fieldnames.is_empty() {
    return Ok(Value::Array(vec![]));
  }

  let mut query_str = "SELECT fieldname, parent, value FROM SingleValue WHERE ".to_string();
  let mut params = Vec::new();

  for (i, item) in fieldnames.iter().enumerate() {
    if i > 0 {
      query_str.push_str(" OR ");
    }

    if let Some(s) = item.as_str() {
      query_str.push_str("fieldname = ?");
      params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(s.to_string())));
    } else if let Some(obj) = item.as_object() {
      let fieldname = obj.get("fieldname").and_then(|v| v.as_str()).ok_or("Missing fieldname in SingleValue query")?;
      let parent = obj.get("parent").and_then(|v| v.as_str());

      if let Some(p) = parent {
        query_str.push_str("(fieldname = ? AND parent = ?)");
        params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(fieldname.to_string())));
        params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(p.to_string())));
      } else {
        query_str.push_str("fieldname = ?");
        params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(fieldname.to_string())));
      }
    }
  }

  let mut stmt = conn.prepare(&query_str).map_err(|e| e.to_string())?;
  let params_refs: Vec<&dyn rusqlite::types::ToSql> = params
    .iter()
    .map(|p| p as &dyn rusqlite::types::ToSql)
    .collect();

  let mut rows = stmt.query(&params_refs[..]).map_err(|e| e.to_string())?;
  let mut results = Vec::new();
  while let Some(row) = rows.next().map_err(|e| e.to_string())? {
    let fieldname: String = row.get::<_, String>(0).map_err(|e| e.to_string())?;
    let parent: String = row.get::<_, String>(1).map_err(|e| e.to_string())?;
    let value: String = row.get::<_, String>(2).map_err(|e| e.to_string())?;

    let mut item_map = Map::new();
    item_map.insert("fieldname".to_string(), Value::String(fieldname));
    item_map.insert("parent".to_string(), Value::String(parent));
    item_map.insert("value".to_string(), Value::String(value));

    results.push(Value::Object(item_map));
  }

  Ok(Value::Array(results))
}

fn rename_doc(
  conn: &Connection,
  schema_name: &str,
  old_name: &str,
  new_name: &str,
) -> Result<(), String> {
  let query = format!("UPDATE \"{}\" SET name = ?1 WHERE name = ?2", schema_name);
  conn.execute(&query, [new_name, old_name]).map_err(|e| e.to_string())?;
  Ok(())
}

fn get_last_inserted(conn: &Connection, schema_name: &str) -> Result<i64, String> {
  if !table_exists(conn, schema_name) {
    return Err(format!("Table {} does not exist", schema_name));
  }
  let query = format!("SELECT cast(name as int) as num FROM \"{}\" ORDER BY num DESC LIMIT 1", schema_name);
  let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
  let val = stmt.query_row([], |row| row.get::<_, i64>(0)).unwrap_or(0);
  Ok(val)
}

fn get_top_expenses(conn: &Connection, from_date: &str, to_date: &str) -> Result<Value, String> {
  let query = r#"
    SELECT sum(cast(debit as real) - cast(credit as real)) as total, account
    FROM AccountingLedgerEntry
    WHERE reverted = 0
      AND account IN (SELECT name FROM Account WHERE rootType = 'Expense')
      AND date BETWEEN ?1 AND ?2
    GROUP BY account
    ORDER BY total DESC
    LIMIT 5
  "#;
  let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
  let mut rows = stmt.query([from_date, to_date]).map_err(|e| e.to_string())?;
  let mut results = Vec::new();
  while let Some(row) = rows.next().map_err(|e| e.to_string())? {
    results.push(row_to_json(row).map_err(|e| e.to_string())?);
  }
  Ok(Value::Array(results))
}

fn get_total_outstanding(conn: &Connection, schema_name: &str, from_date: &str, to_date: &str) -> Result<Value, String> {
  if !table_exists(conn, schema_name) {
    return Err(format!("Table {} does not exist", schema_name));
  }
  let query = format!(
    "SELECT sum(baseGrandTotal) as total, sum(outstandingAmount) as outstanding FROM \"{}\" \
     WHERE submitted = 1 AND cancelled = 0 AND date BETWEEN ?1 AND ?2",
    schema_name
  );
  let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
  let row = stmt.query_row([from_date, to_date], |r| row_to_json(r)).map_err(|e| e.to_string())?;
  Ok(row)
}

fn get_cashflow(conn: &Connection, from_date: &str, to_date: &str) -> Result<Value, String> {
  let query = r#"
    SELECT sum(debit) as inflow, sum(credit) as outflow, strftime('%Y-%m', date) as yearmonth
    FROM AccountingLedgerEntry
    WHERE reverted = 0
      AND account IN (SELECT name FROM Account WHERE accountType IN ('Cash', 'Bank') AND isGroup = 0)
      AND date BETWEEN ?1 AND ?2
    GROUP BY strftime('%Y-%m', date)
  "#;
  let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
  let mut rows = stmt.query([from_date, to_date]).map_err(|e| e.to_string())?;
  let mut results = Vec::new();
  while let Some(row) = rows.next().map_err(|e| e.to_string())? {
    results.push(row_to_json(row).map_err(|e| e.to_string())?);
  }
  Ok(Value::Array(results))
}

fn get_income_and_expenses(conn: &Connection, from_date: &str, to_date: &str) -> Result<Value, String> {
  let income_query = r#"
    select sum(cast(credit as real) - cast(debit as real)) as balance, strftime('%Y-%m', date) as yearmonth
    from AccountingLedgerEntry
    where
      reverted = 0 and
      date between date(?1) and date(?2) and
      account in (
        select name
        from Account
        where rootType = 'Income'
      )
    group by yearmonth
  "#;
  let expense_query = r#"
    select sum(cast(debit as real) - cast(credit as real)) as balance, strftime('%Y-%m', date) as yearmonth
    from AccountingLedgerEntry
    where
      reverted = 0 and
      date between date(?1) and date(?2) and
      account in (
        select name
        from Account
        where rootType = 'Expense'
      )
    group by yearmonth
  "#;

  let mut stmt_inc = conn.prepare(income_query).map_err(|e| e.to_string())?;
  let mut rows_inc = stmt_inc.query([from_date, to_date]).map_err(|e| e.to_string())?;
  let mut income_list = Vec::new();
  while let Some(row) = rows_inc.next().map_err(|e| e.to_string())? {
    income_list.push(row_to_json(row).map_err(|e| e.to_string())?);
  }

  let mut stmt_exp = conn.prepare(expense_query).map_err(|e| e.to_string())?;
  let mut rows_exp = stmt_exp.query([from_date, to_date]).map_err(|e| e.to_string())?;
  let mut expense_list = Vec::new();
  while let Some(row) = rows_exp.next().map_err(|e| e.to_string())? {
    expense_list.push(row_to_json(row).map_err(|e| e.to_string())?);
  }

  let mut res = Map::new();
  res.insert("income".to_string(), Value::Array(income_list));
  res.insert("expense".to_string(), Value::Array(expense_list));
  Ok(Value::Object(res))
}

fn get_total_credit_and_debit(conn: &Connection) -> Result<Value, String> {
  let query = r#"
    select 
	    account, 
      sum(cast(credit as real)) as totalCredit, 
      sum(cast(debit as real)) as totalDebit
    from AccountingLedgerEntry
    group by account
  "#;
  let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
  let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
  let mut results = Vec::new();
  while let Some(row) = rows.next().map_err(|e| e.to_string())? {
    results.push(row_to_json(row).map_err(|e| e.to_string())?);
  }
  Ok(Value::Array(results))
}

fn get_stock_quantity(
  conn: &Connection,
  item: &str,
  location: Option<&str>,
  from_date: Option<&str>,
  to_date: Option<&str>,
  batch: Option<&str>,
  serial_numbers: Option<&Vec<Value>>,
) -> Result<Value, String> {
  let mut query_str = "SELECT sum(quantity) as qty FROM StockLedgerEntry WHERE item = ?1".to_string();
  let mut params = vec![rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(item.to_string()))];

  if let Some(loc) = location {
    params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(loc.to_string())));
    query_str.push_str(&format!(" AND location = ?{}", params.len()));
  }

  if let Some(b) = batch {
    params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(b.to_string())));
    query_str.push_str(&format!(" AND batch = ?{}", params.len()));
  }

  if let Some(sns) = serial_numbers {
    if !sns.is_empty() {
      let sn_placeholders = sns.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
      query_str.push_str(&format!(" AND serialNumber IN ({})", sn_placeholders));
      for sn in sns {
        let sn_str = sn.as_str().unwrap_or("").to_string();
        params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(sn_str)));
      }
    }
  }

  if let Some(fd) = from_date {
    params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(fd.to_string())));
    query_str.push_str(&format!(" AND datetime(date) > datetime(?{})", params.len()));
  }

  if let Some(td) = to_date {
    params.push(rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(td.to_string())));
    query_str.push_str(&format!(" AND datetime(date) < datetime(?{})", params.len()));
  }

  let mut stmt = conn.prepare(&query_str).map_err(|e| e.to_string())?;
  let params_refs: Vec<&dyn rusqlite::types::ToSql> = params
    .iter()
    .map(|p| p as &dyn rusqlite::types::ToSql)
    .collect();

  let qty: Option<f64> = stmt.query_row(&params_refs[..], |row| row.get(0)).unwrap_or(None);
  Ok(match qty {
    Some(q) => Value::Number(serde_json::Number::from_f64(q).unwrap_or_else(|| serde_json::Number::from(0))),
    None => Value::Null,
  })
}

fn get_return_balance_items_qty(
  conn: &Connection,
  schema_name: &str,
  doc_name: &str,
) -> Result<Value, String> {
  if !table_exists(conn, schema_name) {
    return Err(format!("Table {} does not exist", schema_name));
  }
  let query1 = format!(
    "SELECT name FROM \"{}\" WHERE returnAgainst = ?1 AND submitted = 1 AND cancelled = 0",
    schema_name
  );
  let mut stmt1 = conn.prepare(&query1).map_err(|e| e.to_string())?;
  let mut rows1 = stmt1.query([doc_name]).map_err(|e| e.to_string())?;
  let mut return_doc_names = Vec::new();
  while let Some(row) = rows1.next().map_err(|e| e.to_string())? {
    return_doc_names.push(row.get::<_, String>(0).map_err(|e| e.to_string())?);
  }

  if return_doc_names.is_empty() {
    return Ok(Value::Null);
  }

  let is_invoice = schema_name == "SalesInvoice" || schema_name == "PurchaseInvoice";
  let is_shipment = schema_name == "Shipment" || schema_name == "PurchaseReceipt";

  let (select_group_ret, select_group_doc) = if is_invoice {
    ("item, batch", "name, item, batch")
  } else if is_shipment {
    ("item, batch, serialNumber", "name, item, batch, serialNumber")
  } else {
    ("item", "name, item")
  };

  let in_placeholders = return_doc_names.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
  let query_ret = format!(
    "SELECT sum(quantity) as quantity, {} FROM \"{}Item\" WHERE parent IN ({}) GROUP BY {}",
    select_group_ret, schema_name, in_placeholders, select_group_ret
  );
  let mut stmt_ret = conn.prepare(&query_ret).map_err(|e| e.to_string())?;
  let mut ret_params = Vec::new();
  for name in &return_doc_names {
    ret_params.push(name.clone());
  }
  let ret_params_refs: Vec<&dyn rusqlite::types::ToSql> = ret_params
    .iter()
    .map(|p| p as &dyn rusqlite::types::ToSql)
    .collect();
  let mut rows_ret = stmt_ret.query(&ret_params_refs[..]).map_err(|e| e.to_string())?;
  let mut returned_items = Vec::new();
  while let Some(row) = rows_ret.next().map_err(|e| e.to_string())? {
    returned_items.push(row_to_json(row).map_err(|e| e.to_string())?);
  }

  let query_doc = format!(
    "SELECT sum(quantity) as quantity, {} FROM \"{}Item\" WHERE parent = ?1 GROUP BY {}",
    select_group_doc, schema_name, select_group_ret
  );
  let mut stmt_doc = conn.prepare(&query_doc).map_err(|e| e.to_string())?;
  let mut rows_doc = stmt_doc.query([doc_name]).map_err(|e| e.to_string())?;
  let mut doc_items = Vec::new();
  while let Some(row) = rows_doc.next().map_err(|e| e.to_string())? {
    doc_items.push(row_to_json(row).map_err(|e| e.to_string())?);
  }

  if returned_items.is_empty() {
    return Ok(Value::Null);
  }

  let mut result = Map::new();
  result.insert("returnedItems".to_string(), Value::Array(returned_items));
  result.insert("docItems".to_string(), Value::Array(doc_items));
  Ok(Value::Object(result))
}

fn get_pos_transacted_amount(
  conn: &Connection,
  from_date: &str,
  to_date: &str,
  last_shift_closing_date: Option<&str>,
) -> Result<Value, String> {
  let mut q1 = "SELECT name, returnAgainst FROM SalesInvoice WHERE isPOS = 1 AND date BETWEEN ?1 AND ?2".to_string();
  let mut params1 = vec![from_date.to_string(), to_date.to_string()];
  if let Some(ls_date) = last_shift_closing_date {
    params1.push(ls_date.to_string());
    q1.push_str(" AND created > ?3");
  }
  let mut stmt1 = conn.prepare(&q1).map_err(|e| e.to_string())?;
  let mut rows1 = stmt1.query(rusqlite::params_from_iter(params1)).map_err(|e| e.to_string())?;
  
  let mut invoices = Vec::new();
  while let Some(row) = rows1.next().map_err(|e| e.to_string())? {
    let name: String = row.get::<_, String>(0).map_err(|e| e.to_string())?;
    let return_against: Option<String> = row.get::<_, Option<String>>(1).map_err(|e| e.to_string())?;
    invoices.push((name, return_against));
  }

  if invoices.is_empty() {
    return Ok(Value::Null);
  }

  let mut invoice_sign_map = std::collections::HashMap::new();
  let mut sinv_names = Vec::new();
  for (name, ret_against) in &invoices {
    sinv_names.push(name.clone());
    let sign = if ret_against.is_some() { -1.0 } else { 1.0 };
    invoice_sign_map.insert(name.clone(), sign);
  }

  let sinv_placeholders = sinv_names.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
  let q2 = format!("SELECT parent, referenceName FROM PaymentFor WHERE referenceName IN ({})", sinv_placeholders);
  let mut stmt2 = conn.prepare(&q2).map_err(|e| e.to_string())?;
  let mut rows2 = stmt2.query(rusqlite::params_from_iter(sinv_names.clone())).map_err(|e| e.to_string())?;

  let mut payment_for_list = Vec::new();
  let mut payment_entry_names = std::collections::HashSet::new();
  while let Some(row) = rows2.next().map_err(|e| e.to_string())? {
    let parent: String = row.get::<_, String>(0).map_err(|e| e.to_string())?;
    let reference_name: String = row.get::<_, String>(1).map_err(|e| e.to_string())?;
    payment_for_list.push((parent.clone(), reference_name));
    payment_entry_names.insert(parent);
  }

  if payment_entry_names.is_empty() {
    return Ok(Value::Null);
  }

  let pe_names_vec: Vec<String> = payment_entry_names.into_iter().collect();
  let pe_placeholders = pe_names_vec.iter().map(|_| "?").collect::<Vec<_>>().join(", ");
  let q3 = format!(
    "SELECT paymentMethod, name, sum(amount) as amount FROM Payment WHERE name IN ({}) GROUP BY paymentMethod, name",
    pe_placeholders
  );
  let mut stmt3 = conn.prepare(&q3).map_err(|e| e.to_string())?;
  let mut rows3 = stmt3.query(rusqlite::params_from_iter(pe_names_vec)).map_err(|e| e.to_string())?;

  let mut grouped_amounts = Vec::new();
  while let Some(row) = rows3.next().map_err(|e| e.to_string())? {
    let payment_method: String = row.get::<_, String>(0).map_err(|e| e.to_string())?;
    let name: String = row.get::<_, String>(1).map_err(|e| e.to_string())?;
    let amount: f64 = row.get::<_, f64>(2).unwrap_or(0.0);
    grouped_amounts.push((payment_method, name, amount));
  }

  let mut transacted_amounts = std::collections::HashMap::new();

  for (payment_method, name, amount) in grouped_amounts {
    for (pf_parent, pf_ref_name) in &payment_for_list {
      if pf_parent == &name {
        let sign = invoice_sign_map.get(pf_ref_name).cloned().unwrap_or(1.0);
        let signed_amount = amount * sign;
        let entry = transacted_amounts.entry(payment_method.clone()).or_insert(0.0);
        *entry += signed_amount;
      }
    }
  }

  let mut res_map = Map::new();
  for (k, v) in transacted_amounts {
    res_map.insert(k, Value::Number(serde_json::Number::from_f64(v).unwrap_or_else(|| serde_json::Number::from(0))));
  }
  Ok(Value::Object(res_map))
}

fn run_patches(conn: &Connection, _current_version: &str) -> Result<(), String> {
  conn.execute(
    "CREATE TABLE IF NOT EXISTS PatchRun (
      name TEXT PRIMARY KEY,
      version TEXT,
      failed INTEGER,
      created TEXT,
      modified TEXT,
      createdBy TEXT,
      modifiedBy TEXT
    )",
    [],
  ).map_err(|e| e.to_string())?;

  let run_patch = |name: &str, version: &str, f: &dyn Fn(&Connection) -> Result<(), String>| -> Result<(), String> {
    let count: i64 = conn.query_row(
      "SELECT COUNT(*) FROM PatchRun WHERE name = ?1 AND failed = 0",
      [name],
      |row| row.get(0),
    ).unwrap_or(0);

    if count > 0 {
      return Ok(());
    }

    log::info!("Running database patch: {}", name);
    let now = chrono::Utc::now().to_rfc3339();
    let res = f(conn);
    let failed = if res.is_ok() { 0 } else { 1 };
    
    if let Err(ref err) = res {
      log::error!("Patch {} failed: {}", name, err);
    }

    conn.execute(
      "INSERT OR REPLACE INTO PatchRun (name, version, failed, created, modified, createdBy, modifiedBy) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
      [name, version, &failed.to_string(), &now, &now, "__SYSTEM__", "__SYSTEM__"],
    ).map_err(|e| e.to_string())?;

    res
  };

  run_patch("testPatch", "0.5.0-beta.0", &|_conn| Ok(()))?;
  run_patch("updateSchemas", "0.5.0-beta.0", &|_conn| Ok(()))?;

  run_patch("addUOMs", "0.6.0-beta.0", &|conn| {
    let uoms = vec![
      ("Unit", 1),
      ("Kg", 0),
      ("Gram", 0),
      ("Meter", 0),
      ("Hour", 0),
      ("Day", 0),
    ];
    let now = chrono::Utc::now().to_rfc3339();
    for (name, is_whole) in uoms {
      let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM UOM WHERE name = ?1",
        [name],
        |row| row.get(0),
      ).unwrap_or(0);
      if exists == 0 {
        let _id = random_string();
        conn.execute(
          "INSERT INTO UOM (name, isWhole, created, modified, createdBy, modifiedBy) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
          [name, &is_whole.to_string(), &now, &now, "__SYSTEM__", "__SYSTEM__"],
        ).map_err(|e| e.to_string())?;
      }
    }
    Ok(())
  })?;

  run_patch("fixRoundOffAccount", "0.6.3-beta.0", &|conn| {
    let exists: i64 = conn.query_row(
      "SELECT COUNT(*) FROM SingleValue WHERE parent = 'AccountingSettings' AND fieldname = 'roundOffAccount'",
      [],
      |row| row.get(0),
    ).unwrap_or(0);

    if exists == 0 {
      let has_round_off: i64 = conn.query_row(
        "SELECT COUNT(*) FROM Account WHERE name = 'Round Off'",
        [],
        |row| row.get(0),
      ).unwrap_or(0);

      let val = if has_round_off > 0 {
        "Round Off"
      } else {
        let has_rounded_off: i64 = conn.query_row(
          "SELECT COUNT(*) FROM Account WHERE name = 'Rounded Off'",
          [],
          |row| row.get(0),
        ).unwrap_or(0);
        if has_rounded_off > 0 { "Rounded Off" } else { "" }
      };

      if !val.is_empty() {
        let name = random_string();
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
          "INSERT INTO SingleValue (name, parent, fieldname, value, created, modified, createdBy, modifiedBy) VALUES (?1, 'AccountingSettings', 'roundOffAccount', ?2, ?3, ?4, ?5, ?6)",
          [&name, val, &now, &now, "__SYSTEM__", "__SYSTEM__"],
        ).map_err(|e| e.to_string())?;
      }
    }
    Ok(())
  })?;

  run_patch("createInventoryNumberSeries", "0.6.6-beta.0", &|conn| {
    let setup_complete: String = conn.query_row(
      "SELECT value FROM SingleValue WHERE fieldname = 'setupComplete'",
      [],
      |row| row.get(0),
    ).unwrap_or_else(|_| "0".to_string());

    if setup_complete != "1" {
      return Ok(());
    }

    let series = vec![
      ("SMOV-", "StockMovement"),
      ("PREC-", "PurchaseReceipt"),
      ("SHPM-", "Shipment"),
    ];
    let now = chrono::Utc::now().to_rfc3339();
    for (name, ref_type) in series {
      let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM NumberSeries WHERE name = ?1",
        [name],
        |row| row.get(0),
      ).unwrap_or(0);
      if exists == 0 {
        conn.execute(
          "INSERT INTO NumberSeries (name, start, padZeros, current, referenceType, created, modified, createdBy, modifiedBy) VALUES (?1, 1001, 4, 0, ?2, ?3, ?4, ?5, ?6)",
          [name, ref_type, &now, &now, "__SYSTEM__", "__SYSTEM__"],
        ).map_err(|e| e.to_string())?;
      }
    }
    Ok(())
  })?;

  run_patch("setPaymentReferenceType", "0.20.1", &|conn| {
    conn.execute(
      "UPDATE Payment SET referenceType = 'PurchaseInvoice' WHERE referenceType IS NULL AND paymentType = 'Pay'",
      [],
    ).map_err(|e| e.to_string())?;
    conn.execute(
      "UPDATE Payment SET referenceType = 'SalesInvoice' WHERE referenceType IS NULL AND paymentType = 'Receive'",
      [],
    ).map_err(|e| e.to_string())?;
    Ok(())
  })?;

  run_patch("fixLedgerDateTime", "0.21.2", &|conn| {
    let source_tables = vec![
      "PurchaseInvoice", 
      "SalesInvoice", 
      "JournalEntry",
      "Payment", 
      "StockMovement", 
      "StockTransfer"
    ];
    for table in source_tables {
      if table_exists(conn, table) {
        let query = format!(
          "UPDATE AccountingLedgerEntry \
           SET date = (SELECT date FROM \"{}\" WHERE \"{}\".name = AccountingLedgerEntry.referenceName) \
           WHERE EXISTS (SELECT 1 FROM \"{}\" WHERE \"{}\".name = AccountingLedgerEntry.referenceName)",
          table, table, table, table
        );
        let _ = conn.execute(&query, []);
      }
    }
    Ok(())
  })?;

  run_patch("fixItemHSNField", "0.24.0", &|_conn| {
    Ok(())
  })?;

  run_patch("createPaymentMethods", "0.25.1", &|conn| {
    let mut stmt = conn.prepare("SELECT name, accountType FROM Account WHERE accountType IN ('Bank', 'Cash', 'Payable', 'Receivable')").map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    let mut cash_accounts = Vec::new();
    let mut bank_accounts = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
      let name: String = row.get::<_, String>(0).map_err(|e| e.to_string())?;
      let acc_type: String = row.get::<_, String>(1).map_err(|e| e.to_string())?;
      if acc_type == "Cash" {
        cash_accounts.push(name);
      } else if acc_type == "Bank" {
        bank_accounts.push(name);
      }
    }

    let cash_acc = cash_accounts.first().map(|s| s.as_str()).unwrap_or("Cash");
    let bank_acc = bank_accounts.first().map(|s| s.as_str()).unwrap_or("Bank");
    
    let now = chrono::Utc::now().to_rfc3339();
    let payment_methods = vec![
      ("Cash", "Cash", cash_acc),
      ("Bank", "Bank", bank_acc),
      ("Transfer", "Bank", bank_acc),
    ];

    let mut placeholder_accounts: Vec<String> = Vec::new();

    for (name, p_type, acc) in payment_methods {
      let exists: i64 = conn.query_row(
        "SELECT COUNT(*) FROM PaymentMethod WHERE name = ?1",
        [name],
        |row| row.get(0),
      ).unwrap_or(0);
      if exists == 0 && !acc.is_empty() {
        // Ensure parent account exists in Account table to prevent FK constraint failure
        let acc_exists: i64 = conn.query_row(
          "SELECT COUNT(*) FROM Account WHERE name = ?1",
          [acc],
          |row| row.get(0),
        ).unwrap_or(0);
        if acc_exists == 0 {
          let root_type = "Asset";
          conn.execute(
            "INSERT INTO Account (name, rootType, isGroup, parentAccount, accountType, created, modified, createdBy, modifiedBy, lft, rgt) VALUES (?1, ?2, 0, NULL, ?3, ?4, ?5, ?6, ?7, 0, 0)",
            [acc, root_type, p_type, &now, &now, "__SYSTEM__", "__SYSTEM__"],
          ).map_err(|e| e.to_string())?;
          // Track this as a placeholder — it was created only to satisfy the FK
          // constraint for PaymentMethod.account. The real account will be
          // created later by the setup wizard (CreateCOA). We'll delete it
          // after all PaymentMethod inserts so the UNIQUE constraint won't fire.
          placeholder_accounts.push(acc.to_string());
        }

        conn.execute(
          "INSERT INTO PaymentMethod (name, type, account, created, modified, createdBy, modifiedBy) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
          rusqlite::params![name, p_type, acc, &now, &now, "__SYSTEM__", "__SYSTEM__"],
        ).map_err(|e| e.to_string())?;
      }
    }

    // Remove the placeholder accounts we inserted above.
    // The FK constraint on PaymentMethod.account must be temporarily disabled
    // while we delete these so the PaymentMethod rows are not orphaned.
    // We re-enable FKs immediately after; the setup wizard will insert the
    // real Account rows that satisfy the constraint.
    if !placeholder_accounts.is_empty() {
      conn.execute_batch("PRAGMA foreign_keys = OFF;").map_err(|e| e.to_string())?;
      for acc_name in &placeholder_accounts {
        conn.execute(
          "DELETE FROM Account WHERE name = ?1 AND createdBy = '__SYSTEM__'",
          [acc_name.as_str()],
        ).map_err(|e| e.to_string())?;
      }
      conn.execute_batch("PRAGMA foreign_keys = ON;").map_err(|e| e.to_string())?;
    }

    Ok(())
  })?;

  Ok(())
}

#[tauri::command]
pub fn db_connect(
  db_path: String,
  country_code: Option<String>,
  state: tauri::State<'_, DbState>,
) -> Result<Value, String> {
  #[allow(unused_mut)]
  let mut final_db_path = db_path.clone();
  #[allow(unused_mut)]
  let mut is_content_uri = false;
  
  if db_path.starts_with("content://") {
    #[cfg(target_os = "android")]
    {
      final_db_path = copy_content_uri_to_local(&db_path)?;
      is_content_uri = true;
    }
    #[cfg(not(target_os = "android"))]
    {
      return Err("Content URIs are only supported on Android".to_string());
    }
  }

  let conn = if final_db_path == ":memory:" {
    Connection::open_in_memory().map_err(|e| e.to_string())?
  } else {
    Connection::open(&final_db_path).map_err(|e| e.to_string())?
  };

  conn.execute("PRAGMA foreign_keys=ON", []).map_err(|e| e.to_string())?;

  let country = if table_exists(&conn, "SingleValue") {
    conn.query_row(
      "SELECT value FROM SingleValue WHERE fieldname = 'countryCode' AND parent = 'SystemSettings'",
      [],
      |row| row.get::<_, String>(0),
    ).unwrap_or_else(|_| country_code.unwrap_or_else(|| "in".to_string()))
  } else {
    country_code.unwrap_or_else(|| "in".to_string())
  };

  let mut custom_fields = Vec::new();
  if table_exists(&conn, "CustomField") {
    let mut stmt = conn.prepare("SELECT * FROM CustomField").map_err(|e| e.to_string())?;
    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
      custom_fields.push(row_to_json(row).map_err(|e| e.to_string())?);
    }
  }

  let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  *conn_guard = Some(conn);

  let mut uri_guard = state.current_uri.lock().map_err(|e| e.to_string())?;
  let mut path_guard = state.local_path.lock().map_err(|e| e.to_string())?;
  if is_content_uri {
    *uri_guard = Some(db_path);
    *path_guard = Some(final_db_path);
  } else {
    *uri_guard = None;
    *path_guard = None;
  }

  let mut result = Map::new();
  result.insert("countryCode".to_string(), Value::String(country));
  result.insert("rawCustomFields".to_string(), Value::Array(custom_fields));
  Ok(Value::Object(result))
}

#[tauri::command]
pub fn db_create(
  db_path: String,
  country_code: Option<String>,
  state: tauri::State<'_, DbState>,
) -> Result<Value, String> {
  if db_path != ":memory:" {
    if std::path::Path::new(&db_path).exists() {
      let _ = std::fs::remove_file(&db_path);
    }
  }
  db_connect(db_path, country_code, state)
}

#[tauri::command]
pub fn db_set_schema_map(
  schema_map: SchemaMap,
  state: tauri::State<'_, DbState>,
) -> Result<(), String> {
  let mut map_lock = state.schema_map.lock().map_err(|e| e.to_string())?;
  *map_lock = Some(schema_map);
  Ok(())
}

#[tauri::command]
pub fn db_migrate(
  state: tauri::State<'_, DbState>,
) -> Result<(), String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;

  let schema_map_guard = state.schema_map.lock().map_err(|e| e.to_string())?;
  let schema_map = schema_map_guard.as_ref().ok_or("Schema map not set")?;

  conn.execute(
    "CREATE TABLE IF NOT EXISTS SingleValue (
      name TEXT PRIMARY KEY,
      parent TEXT,
      fieldname TEXT,
      value TEXT,
      created TEXT,
      modified TEXT,
      createdBy TEXT,
      modifiedBy TEXT
    )",
    [],
  ).map_err(|e| e.to_string())?;

  for (schema_name, schema) in schema_map {
    let is_single = schema.is_single.unwrap_or(false);
    let is_child = schema.is_child.unwrap_or(false);

    if is_single {
      let has_entries: i64 = conn.query_row(
        "SELECT COUNT(*) FROM SingleValue WHERE parent = ?1",
        [schema_name],
        |row| row.get(0),
      ).unwrap_or(0);

      if has_entries == 0 {
        for field in &schema.fields {
          if field.fieldname.is_empty() || field.computed.unwrap_or(false) || field.fieldtype == "Table" {
            continue;
          }

          if let Some(def) = &field.default {
            update_single_value(conn, schema_name, &field.fieldname, def)?;
          }
        }
      } else {
        for field in &schema.fields {
          if field.fieldname.is_empty() || field.computed.unwrap_or(false) || field.fieldtype == "Table" {
            continue;
          }

          let exists: i64 = conn.query_row(
            "SELECT COUNT(*) FROM SingleValue WHERE parent = ?1 AND fieldname = ?2",
            [schema_name, &field.fieldname],
            |row| row.get(0),
          ).unwrap_or(0);

          if exists == 0 {
            if let Some(def) = &field.default {
              update_single_value(conn, schema_name, &field.fieldname, def)?;
            }
          }
        }
      }
    } else {
      let table_exists = table_exists(conn, schema_name);

      if !table_exists {
        let mut col_defs = Vec::new();
        let mut foreign_keys = Vec::new();
        let mut added_cols = std::collections::HashSet::new();

        for field in &schema.fields {
          if field.fieldname.is_empty() || field.computed.unwrap_or(false) || field.fieldtype == "Table" {
            continue;
          }

          let lower_name = field.fieldname.to_lowercase();
          if added_cols.contains(&lower_name) {
            continue;
          }
          added_cols.insert(lower_name);

          let sql_type = get_sqlite_type(&field.fieldtype).unwrap_or("TEXT");
          let mut def = format!("\"{}\" {}", field.fieldname, sql_type);

          if field.fieldname == "name" {
            def.push_str(" PRIMARY KEY");
          }

          if field.required.unwrap_or(false) {
            def.push_str(" NOT NULL");
          }

          if let Some(default_val) = &field.default {
            if default_val.is_string() {
              def.push_str(&format!(" DEFAULT '{}'", default_val.as_str().unwrap().replace('\'', "''")));
            } else if default_val.is_number() {
              def.push_str(&format!(" DEFAULT {}", default_val));
            } else if default_val.is_boolean() {
              def.push_str(&format!(" DEFAULT {}", if default_val.as_bool().unwrap() { 1 } else { 0 }));
            }
          }

          col_defs.push(def);

          if field.fieldtype == "Link" {
            if let Some(target) = &field.target {
              foreign_keys.push(format!(
                "FOREIGN KEY(\"{}\") REFERENCES \"{}\"(\"name\") ON UPDATE CASCADE ON DELETE RESTRICT",
                field.fieldname, target
              ));
            }
          }
        }

        if is_child {
          let child_cols = vec![
            ("parent", "\"parent\" TEXT"),
            ("parentSchemaName", "\"parentSchemaName\" TEXT"),
            ("parentFieldname", "\"parentFieldname\" TEXT"),
            ("idx", "\"idx\" INTEGER"),
          ];
          for (col_name, cc) in child_cols {
            if !schema.fields.iter().any(|f| f.fieldname == col_name) {
              col_defs.push(cc.to_string());
            }
          }
        }

        let mut create_query = format!("CREATE TABLE \"{}\" (", schema_name);
        create_query.push_str(&col_defs.join(", "));
        if !foreign_keys.is_empty() {
          create_query.push_str(", ");
          create_query.push_str(&foreign_keys.join(", "));
        }
        create_query.push_str(")");

        conn.execute(&create_query, []).map_err(|e| format!("Create table {} failed: {} (SQL: {})", schema_name, e, create_query))?;
      } else {
        let mut stmt = conn.prepare(&format!("PRAGMA table_info(\"{}\")", schema_name)).map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
        let mut db_columns = std::collections::HashSet::new();
        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
          let col_name: String = row.get::<_, String>(1).map_err(|e| e.to_string())?;
          db_columns.insert(col_name.to_lowercase());
        }

        for field in &schema.fields {
          if field.fieldname.is_empty() || field.computed.unwrap_or(false) || field.fieldtype == "Table" {
            continue;
          }

          let lower_name = field.fieldname.to_lowercase();
          if !db_columns.contains(&lower_name) {
            let sql_type = get_sqlite_type(&field.fieldtype).unwrap_or("TEXT");
            let mut alter_query = format!("ALTER TABLE \"{}\" ADD COLUMN \"{}\" {}", schema_name, field.fieldname, sql_type);
            
            if field.required.unwrap_or(false) {
              let default_str = if let Some(default_val) = &field.default {
                if default_val.is_string() {
                  format!("'{}'", default_val.as_str().unwrap().replace('\'', "''"))
                } else if default_val.is_number() {
                  default_val.to_string()
                } else if default_val.is_boolean() {
                  (if default_val.as_bool().unwrap() { "1" } else { "0" }).to_string()
                } else {
                  "''".to_string()
                }
              } else {
                if sql_type == "INTEGER" || sql_type == "REAL" { "0".to_string() } else { "''".to_string() }
              };
              alter_query.push_str(&format!(" NOT NULL DEFAULT {}", default_str));
            } else if let Some(default_val) = &field.default {
              let default_str = if default_val.is_string() {
                format!("'{}'", default_val.as_str().unwrap().replace('\'', "''"))
              } else if default_val.is_number() {
                default_val.to_string()
              } else if default_val.is_boolean() {
                (if default_val.as_bool().unwrap() { "1" } else { "0" }).to_string()
              } else {
                "NULL".to_string()
              };
              alter_query.push_str(&format!(" DEFAULT {}", default_str));
            }
            conn.execute(&alter_query, []).map_err(|e| format!("Alter table {} add column {} failed: {}", schema_name, field.fieldname, e))?;
            db_columns.insert(lower_name);
          }
        }

        if is_child {
          let child_cols = vec![
            ("parent", "TEXT"),
            ("parentSchemaName", "TEXT"),
            ("parentFieldname", "TEXT"),
            ("idx", "INTEGER"),
          ];
          for (col, sql_type) in child_cols {
            let lower_col = col.to_lowercase();
            if !db_columns.contains(&lower_col) {
              let alter_query = format!("ALTER TABLE \"{}\" ADD COLUMN \"{}\" {}", schema_name, col, sql_type);
              conn.execute(&alter_query, []).map_err(|e| format!("Alter table {} add child column {} failed: {}", schema_name, col, e))?;
              db_columns.insert(lower_col);
            }
          }
        }
      }
    }
  }

  let app_version = conn.query_row(
    "SELECT value FROM SingleValue WHERE fieldname = 'version' AND parent = 'SystemSettings'",
    [],
    |row| row.get::<_, String>(0),
  ).unwrap_or_else(|_| "0.0.0".to_string());

  let res = run_patches(conn, &app_version);
  drop(schema_map_guard);
  drop(conn_guard);
  res?;

  let _ = sync_db_if_needed(&state);

  Ok(())
}

#[tauri::command]
pub fn db_insert(
  schema_name: String,
  mut field_value_map: Value,
  state: tauri::State<'_, DbState>,
) -> Result<Value, String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;

  let schema_map_guard = state.schema_map.lock().map_err(|e| e.to_string())?;
  let schema_map = schema_map_guard.as_ref().ok_or("Schema map not set")?;

  let schema = schema_map.get(&schema_name).ok_or_else(|| format!("Schema {} not found", schema_name))?;
  let is_single = schema.is_single.unwrap_or(false);

  if is_single {
    for field in &schema.fields {
      if field.fieldname.is_empty() || field.computed.unwrap_or(false) || field.fieldtype == "Table" {
        continue;
      }

      if let Some(val) = field_value_map.get(&field.fieldname) {
        update_single_value(conn, &schema_name, &field.fieldname, val)?;
      }
    }
  } else {
    insert_one(conn, schema, &schema_name, &mut field_value_map)?;
  }

  let res = insert_or_update_children(conn, schema_map, schema, &schema_name, &mut field_value_map, false);
  drop(schema_map_guard);
  drop(conn_guard);
  res?;

  let _ = sync_db_if_needed(&state);

  Ok(field_value_map)
}

#[tauri::command]
pub fn db_get(
  schema_name: String,
  name: String,
  fields: Option<Value>,
  state: tauri::State<'_, DbState>,
) -> Result<Value, String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;

  let schema_map_guard = state.schema_map.lock().map_err(|e| e.to_string())?;
  let schema_map = schema_map_guard.as_ref().ok_or("Schema map not set")?;

  let schema = schema_map.get(&schema_name).ok_or_else(|| format!("Schema {} not found", schema_name))?;
  let is_single = schema.is_single.unwrap_or(false);

  if is_single {
    let mut field_value_map = Map::new();
    let stmt_str = "SELECT fieldname, value FROM SingleValue WHERE parent = ?1 ORDER BY fieldname ASC";
    let mut stmt = conn.prepare(stmt_str).map_err(|e| e.to_string())?;
    let mut rows = stmt.query([&schema_name]).map_err(|e| e.to_string())?;
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
      let fieldname: String = row.get::<_, String>(0).map_err(|e| e.to_string())?;
      let value: String = row.get::<_, String>(1).map_err(|e| e.to_string())?;
      field_value_map.insert(fieldname, Value::String(value));
    }

    for field in &schema.fields {
      if field.fieldtype == "Table" {
        let target_schema_name = field.target.as_ref().ok_or("Missing target for child table")?;
        
        let child_opts = serde_json::json!({
          "fields": ["*"],
          "filters": { "parent": schema_name },
          "orderBy": ["idx"],
          "order": "asc"
        });
        let children = get_all(conn, schema_map, target_schema_name, &child_opts)?;
        field_value_map.insert(field.fieldname.to_string(), children);
      }
    }
    Ok(Value::Object(field_value_map))
  } else {
    if name.is_empty() {
      return Err("name is mandatory".to_string());
    }

    let mut select_fields = Vec::new();
    let mut table_fields = Vec::new();

    let fields_to_query: Vec<String> = if let Some(f_val) = fields {
      if let Some(arr) = f_val.as_array() {
        arr
          .iter()
          .map(|v| v.as_str().unwrap_or("").to_string())
          .filter(|f| !f.is_empty())
          .collect()
      } else if let Some(s) = f_val.as_str() {
        if s.is_empty() {
          vec![]
        } else {
          vec![s.to_string()]
        }
      } else {
        vec![]
      }
    } else {
      vec![]
    };

    for field in &schema.fields {
      if field.computed.unwrap_or(false) || field.fieldname.is_empty() {
        continue;
      }

      if field.fieldtype == "Table" {
        let target = field.target.as_ref().unwrap_or(&"".to_string()).clone();
        if fields_to_query.is_empty() || fields_to_query.contains(&field.fieldname) {
          table_fields.push((field.fieldname.clone(), target));
        }
      } else {
        if fields_to_query.is_empty() || fields_to_query.contains(&field.fieldname) {
          select_fields.push(field.fieldname.clone());
        }
      }
    }

    let mut field_value_map = if !select_fields.is_empty() {
      match query_one(conn, &schema_name, &name, &select_fields)? {
        Some(val) => val.as_object().cloned().unwrap_or_default(),
        None => Map::new(),
      }
    } else {
      Map::new()
    };

    for (fieldname, target_schema_name) in table_fields {
      let child_opts = serde_json::json!({
        "fields": ["*"],
        "filters": { "parent": name },
        "orderBy": ["idx"],
        "order": "asc"
      });
      let children = get_all(conn, schema_map, &target_schema_name, &child_opts)?;
      field_value_map.insert(fieldname, children);
    }

    Ok(Value::Object(field_value_map))
  }
}

#[tauri::command]
pub fn db_get_all(
  schema_name: String,
  options: Option<Value>,
  state: tauri::State<'_, DbState>,
) -> Result<Value, String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;

  let schema_map_guard = state.schema_map.lock().map_err(|e| e.to_string())?;
  let schema_map = schema_map_guard.as_ref().ok_or("Schema map not set")?;

  let opts = options.unwrap_or(serde_json::json!({}));
  get_all(conn, schema_map, &schema_name, &opts)
}

#[tauri::command]
pub fn db_update(
  schema_name: String,
  mut field_value_map: Value,
  state: tauri::State<'_, DbState>,
) -> Result<(), String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;

  let schema_map_guard = state.schema_map.lock().map_err(|e| e.to_string())?;
  let schema_map = schema_map_guard.as_ref().ok_or("Schema map not set")?;

  let schema = schema_map.get(&schema_name).ok_or_else(|| format!("Schema {} not found", schema_name))?;
  let is_single = schema.is_single.unwrap_or(false);

  if is_single {
    for field in &schema.fields {
      if field.fieldname.is_empty() || field.computed.unwrap_or(false) || field.fieldtype == "Table" {
        continue;
      }

      if let Some(val) = field_value_map.get(&field.fieldname) {
        update_single_value(conn, &schema_name, &field.fieldname, val)?;
      }
    }
  } else {
    update_one(conn, schema, &schema_name, &field_value_map)?;
  }

  let res = insert_or_update_children(conn, schema_map, schema, &schema_name, &mut field_value_map, true);
  drop(schema_map_guard);
  drop(conn_guard);
  res?;

  let _ = sync_db_if_needed(&state);

  Ok(())
}

#[tauri::command]
pub fn db_delete(
  schema_name: String,
  name: String,
  state: tauri::State<'_, DbState>,
) -> Result<(), String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;

  let schema_map_guard = state.schema_map.lock().map_err(|e| e.to_string())?;
  let schema_map = schema_map_guard.as_ref().ok_or("Schema map not set")?;

  let res = delete_doc(conn, schema_map, &schema_name, &name);
  drop(schema_map_guard);
  drop(conn_guard);
  res?;

  let _ = sync_db_if_needed(&state);

  Ok(())
}

#[tauri::command]
pub fn db_delete_all(
  schema_name: String,
  filters: Value,
  state: tauri::State<'_, DbState>,
) -> Result<usize, String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;

  let res = delete_all(conn, &schema_name, &filters);
  drop(conn_guard);
  let count = res?;

  let _ = sync_db_if_needed(&state);

  Ok(count)
}

#[tauri::command]
pub fn db_exists(
  schema_name: String,
  name: Option<String>,
  state: tauri::State<'_, DbState>,
) -> Result<bool, String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;

  let schema_map_guard = state.schema_map.lock().map_err(|e| e.to_string())?;
  let schema_map = schema_map_guard.as_ref().ok_or("Schema map not set")?;

  let schema = schema_map.get(&schema_name).ok_or_else(|| format!("Schema {} not found", schema_name))?;
  let is_single = schema.is_single.unwrap_or(false);

  if is_single {
    let count: i64 = conn.query_row(
      "SELECT COUNT(*) FROM SingleValue WHERE parent = ?1",
      [&schema_name],
      |row| row.get(0),
    ).unwrap_or(0);
    Ok(count > 0)
  } else {
    let mut query_str = format!("SELECT 1 FROM \"{}\"", schema_name);
    let mut params = Vec::new();
    if let Some(n) = name {
      query_str.push_str(" WHERE name = ?1");
      params.push(n);
    }
    query_str.push_str(" LIMIT 1");
    let mut stmt = conn.prepare(&query_str).map_err(|e| e.to_string())?;
    let exists = stmt.exists(rusqlite::params_from_iter(params)).unwrap_or(false);
    Ok(exists)
  }
}

#[tauri::command]
pub fn db_get_single_values(
  fieldnames: Vec<Value>,
  state: tauri::State<'_, DbState>,
) -> Result<Value, String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;

  get_single_values(conn, &fieldnames)
}

#[tauri::command]
pub fn db_rename(
  schema_name: String,
  old_name: String,
  new_name: String,
  state: tauri::State<'_, DbState>,
) -> Result<(), String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;

  let res = rename_doc(conn, &schema_name, &old_name, &new_name);
  drop(conn_guard);
  res?;

  let _ = sync_db_if_needed(&state);

  Ok(())
}

#[tauri::command]
pub fn db_close(
  state: tauri::State<'_, DbState>,
) -> Result<(), String> {
  let _ = sync_db_if_needed(&state);
  let mut conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  *conn_guard = None;
  let mut schema_map_guard = state.schema_map.lock().map_err(|e| e.to_string())?;
  *schema_map_guard = None;
  let mut uri_guard = state.current_uri.lock().map_err(|e| e.to_string())?;
  *uri_guard = None;
  let mut path_guard = state.local_path.lock().map_err(|e| e.to_string())?;
  *path_guard = None;
  Ok(())
}

#[tauri::command]
pub fn db_call_bespoke(
  method: String,
  args: Vec<Value>,
  state: tauri::State<'_, DbState>,
) -> Result<Value, String> {
  let conn_guard = state.conn.lock().map_err(|e| e.to_string())?;
  let conn = conn_guard.as_ref().ok_or("Database connection not active")?;
  let schema_map_guard = state.schema_map.lock().map_err(|e| e.to_string())?;
  let _schema_map = schema_map_guard.as_ref().ok_or("Schema map not set")?;

  match method.as_str() {
    "getLastInserted" => {
      let schema_name = args.first().and_then(|v| v.as_str()).ok_or("Missing schema_name arg")?;
      let num = get_last_inserted(conn, schema_name)?;
      Ok(serde_json::json!(num))
    }
    "getTopExpenses" => {
      let from_date = args.get(0).and_then(|v| v.as_str()).ok_or("Missing from_date arg")?;
      let to_date = args.get(1).and_then(|v| v.as_str()).ok_or("Missing to_date arg")?;
      get_top_expenses(conn, from_date, to_date)
    }
    "getTotalOutstanding" => {
      let schema_name = args.get(0).and_then(|v| v.as_str()).ok_or("Missing schema_name arg")?;
      let from_date = args.get(1).and_then(|v| v.as_str()).ok_or("Missing from_date arg")?;
      let to_date = args.get(2).and_then(|v| v.as_str()).ok_or("Missing to_date arg")?;
      get_total_outstanding(conn, schema_name, from_date, to_date)
    }
    "getCashflow" => {
      let from_date = args.get(0).and_then(|v| v.as_str()).ok_or("Missing from_date arg")?;
      let to_date = args.get(1).and_then(|v| v.as_str()).ok_or("Missing to_date arg")?;
      get_cashflow(conn, from_date, to_date)
    }
    "getIncomeAndExpenses" => {
      let from_date = args.get(0).and_then(|v| v.as_str()).ok_or("Missing from_date arg")?;
      let to_date = args.get(1).and_then(|v| v.as_str()).ok_or("Missing to_date arg")?;
      get_income_and_expenses(conn, from_date, to_date)
    }
    "getTotalCreditAndDebit" => {
      get_total_credit_and_debit(conn)
    }
    "getStockQuantity" => {
      let item = args.get(0).and_then(|v| v.as_str()).ok_or("Missing item arg")?;
      let location = args.get(1).and_then(|v| v.as_str());
      let from_date = args.get(2).and_then(|v| v.as_str());
      let to_date = args.get(3).and_then(|v| v.as_str());
      let batch = args.get(4).and_then(|v| v.as_str());
      let serial_numbers = args.get(5).and_then(|v| v.as_array());
      get_stock_quantity(conn, item, location, from_date, to_date, batch, serial_numbers)
    }
    "getReturnBalanceItemsQty" => {
      let schema_name = args.get(0).and_then(|v| v.as_str()).ok_or("Missing schema_name arg")?;
      let doc_name = args.get(1).and_then(|v| v.as_str()).ok_or("Missing doc_name arg")?;
      get_return_balance_items_qty(conn, schema_name, doc_name)
    }
    "getPOSTransactedAmount" => {
      let from_date = args.get(0).and_then(|v| v.as_str()).ok_or("Missing from_date arg")?;
      let to_date = args.get(1).and_then(|v| v.as_str()).ok_or("Missing to_date arg")?;
      let last_shift_closing_date = args.get(2).and_then(|v| v.as_str());
      get_pos_transacted_amount(conn, from_date, to_date, last_shift_closing_date)
    }
    _ => Err(format!("Unknown bespoke method: {}", method)),
  }
}
