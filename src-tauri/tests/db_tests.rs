use app_lib::{get_platform_inner, get_version_inner};
use app_lib::db::{
    get_sqlite_type, table_exists, random_string, val_to_tosql, row_to_json,
    row_to_type, ConnectionExt, apply_filters, query_one, update_single_value,
    insert_one, update_one, get_all, insert_or_update_children, Schema, Field, SchemaMap
};
use rusqlite::Connection;
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Debug, Deserialize, PartialEq)]
struct TestRecord {
    name: String,
    value: String,
}

#[derive(Debug, Deserialize, PartialEq)]
struct TestChild {
    name: String,
    parent: Option<String>,
    idx: Option<i64>,
    street: String,
}

#[test]
fn test_get_platform() {
    let platform = get_platform_inner();
    #[cfg(target_os = "windows")]
    assert_eq!(platform, "win32");
    #[cfg(target_os = "macos")]
    assert_eq!(platform, "darwin");
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    assert_eq!(platform, "linux");
}

#[test]
fn test_get_version() {
    let version = get_version_inner();
    assert!(!version.is_empty());
}

#[test]
fn test_get_sqlite_type() {
    assert_eq!(get_sqlite_type("Int"), Some("INTEGER"));
    assert_eq!(get_sqlite_type("Float"), Some("REAL"));
    assert_eq!(get_sqlite_type("Check"), Some("INTEGER"));
    assert_eq!(get_sqlite_type("Text"), Some("TEXT"));
    assert_eq!(get_sqlite_type("UnknownType"), None);
}

#[test]
fn test_table_exists() {
    let conn = Connection::open_in_memory().unwrap();
    assert!(!table_exists(&conn, "dummy_table"));
    conn.execute("CREATE TABLE dummy_table (id INTEGER)", []).unwrap();
    assert!(table_exists(&conn, "dummy_table"));
}

#[test]
fn test_random_string() {
    let s1 = random_string();
    let s2 = random_string();
    assert!(!s1.is_empty());
    assert!(!s2.is_empty());
    assert_ne!(s1, s2);
}

#[test]
fn test_val_to_tosql() {
    let null_val = Value::Null;
    let null_out = val_to_tosql(&null_val).unwrap();
    assert!(matches!(null_out, rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Null)));

    let bool_val = Value::Bool(true);
    let bool_out = val_to_tosql(&bool_val).unwrap();
    assert!(matches!(bool_out, rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Integer(1))));

    let str_val = Value::String("hello".to_string());
    let str_out = val_to_tosql(&str_val).unwrap();
    assert!(matches!(str_out, rusqlite::types::ToSqlOutput::Owned(rusqlite::types::Value::Text(_))));
}

#[test]
fn test_row_conversions() {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute(
        "CREATE TABLE test_table (
            name TEXT PRIMARY KEY,
            value TEXT
        )",
        [],
    ).unwrap();
    
    conn.execute(
        "INSERT INTO test_table (name, value) VALUES (?1, ?2)",
        ["record_1", "val_1"],
    ).unwrap();
    
    let mut stmt = conn.prepare("SELECT name, value FROM test_table WHERE name = ?1").unwrap();
    
    {
        let mut rows = stmt.query(["record_1"]).unwrap();
        let row = rows.next().unwrap().unwrap();
        
        // Test row_to_json
        let json_val = row_to_json(row).unwrap();
        assert_eq!(json_val["name"], "record_1");
        assert_eq!(json_val["value"], "val_1");
    }
    
    // Re-query to test row_to_type since rows.next() consumes row ownership
    let mut rows = stmt.query(["record_1"]).unwrap();
    let row = rows.next().unwrap().unwrap();
    
    // Test row_to_type
    let typed_record: TestRecord = row_to_type(row).unwrap();
    assert_eq!(
        typed_record,
        TestRecord {
            name: "record_1".to_string(),
            value: "val_1".to_string(),
        }
    );
}

#[test]
fn test_connection_ext() {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute(
        "CREATE TABLE test_table (
            name TEXT PRIMARY KEY,
            value TEXT
        )",
        [],
    ).unwrap();
    
    conn.execute(
        "INSERT INTO test_table (name, value) VALUES (?1, ?2)",
        ["record_1", "val_1"],
    ).unwrap();
    
    conn.execute(
        "INSERT INTO test_table (name, value) VALUES (?1, ?2)",
        ["record_2", "val_2"],
    ).unwrap();

    // Test query_one_typed
    let record: Option<TestRecord> = conn.query_one_typed(
        "SELECT name, value FROM test_table WHERE name = ?1",
        &[&"record_1"],
    ).unwrap();
    assert_eq!(
        record,
        Some(TestRecord {
            name: "record_1".to_string(),
            value: "val_1".to_string(),
        })
    );

    // Test query_all_typed
    let records: Vec<TestRecord> = conn.query_all_typed(
        "SELECT name, value FROM test_table ORDER BY name ASC",
        &[],
    ).unwrap();
    assert_eq!(records.len(), 2);
    assert_eq!(records[0].name, "record_1");
    assert_eq!(records[1].name, "record_2");
}

#[test]
fn test_apply_filters() {
    let mut query = "SELECT * FROM test".to_string();
    let mut params = Vec::new();
    
    let filters = json!({
        "name": "john"
    });
    apply_filters(&mut query, &mut params, &filters).unwrap();
    assert_eq!(query, "SELECT * FROM test WHERE \"name\" = ?");
    assert_eq!(params.len(), 1);

    let mut empty_query = "SELECT * FROM test".to_string();
    let mut empty_params = Vec::new();
    apply_filters(&mut empty_query, &mut empty_params, &Value::Null).unwrap();
    assert_eq!(empty_query, "SELECT * FROM test");
    assert!(empty_params.is_empty());
}

#[test]
fn test_query_one() {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute(
        "CREATE TABLE test_table (
            name TEXT PRIMARY KEY,
            value TEXT
        )",
        [],
    ).unwrap();
    
    conn.execute(
        "INSERT INTO test_table (name, value) VALUES (?1, ?2)",
        ["record_1", "val_1"],
    ).unwrap();

    let res = query_one(&conn, "test_table", "record_1", &["name".to_string(), "value".to_string()]).unwrap().unwrap();
    assert_eq!(res["name"], "record_1");
    assert_eq!(res["value"], "val_1");

    let res_none = query_one(&conn, "test_table", "non_existing", &["name".to_string()]).unwrap();
    assert!(res_none.is_none());
}

#[test]
fn test_update_single_value() {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute(
        "CREATE TABLE SingleValue (
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
    ).unwrap();

    let val = Value::String("super_admin".to_string());
    update_single_value(&conn, "SystemSettings", "role", &val).unwrap();

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM SingleValue WHERE parent = 'SystemSettings' AND fieldname = 'role'",
        [],
        |row| row.get(0),
    ).unwrap();
    assert_eq!(count, 1);

    let value: String = conn.query_row(
        "SELECT value FROM SingleValue WHERE parent = 'SystemSettings' AND fieldname = 'role'",
        [],
        |row| row.get(0),
    ).unwrap();
    assert_eq!(value, "super_admin");

    let val_new = Value::String("guest".to_string());
    update_single_value(&conn, "SystemSettings", "role", &val_new).unwrap();

    let value_updated: String = conn.query_row(
        "SELECT value FROM SingleValue WHERE parent = 'SystemSettings' AND fieldname = 'role'",
        [],
        |row| row.get(0),
    ).unwrap();
    assert_eq!(value_updated, "guest");
}

#[test]
fn test_insert_and_update_one() {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute(
        "CREATE TABLE User (
            name TEXT PRIMARY KEY,
            role TEXT
        )",
        [],
    ).unwrap();

    let schema = Schema {
        name: "User".to_string(),
        label: None,
        is_child: None,
        is_single: None,
        naming: None,
        fields: vec![
            Field {
                fieldname: "name".to_string(),
                fieldtype: "Data".to_string(),
                label: None,
                required: None,
                default: None,
                computed: None,
                target: None,
            },
            Field {
                fieldname: "role".to_string(),
                fieldtype: "Select".to_string(),
                label: None,
                required: None,
                default: None,
                computed: None,
                target: None,
            },
        ],
    };

    let mut new_user = json!({
        "name": "jane_doe",
        "role": "editor"
    });
    insert_one(&conn, &schema, "User", &mut new_user).unwrap();

    let role: String = conn.query_row(
        "SELECT role FROM User WHERE name = 'jane_doe'",
        [],
        |row| row.get(0),
    ).unwrap();
    assert_eq!(role, "editor");

    let updated_user = json!({
        "name": "jane_doe",
        "role": "admin"
    });
    update_one(&conn, &schema, "User", &updated_user).unwrap();

    let role_updated: String = conn.query_row(
        "SELECT role FROM User WHERE name = 'jane_doe'",
        [],
        |row| row.get(0),
    ).unwrap();
    assert_eq!(role_updated, "admin");
}

#[test]
fn test_get_all() {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute(
        "CREATE TABLE User (
            name TEXT PRIMARY KEY,
            role TEXT
        )",
        [],
    ).unwrap();

    conn.execute("INSERT INTO User (name, role) VALUES ('alice', 'admin')", []).unwrap();
    conn.execute("INSERT INTO User (name, role) VALUES ('bob', 'member')", []).unwrap();

    let schema = Schema {
        name: "User".to_string(),
        label: None,
        is_child: None,
        is_single: None,
        naming: None,
        fields: vec![
            Field {
                fieldname: "name".to_string(),
                fieldtype: "Data".to_string(),
                label: None,
                required: None,
                default: None,
                computed: None,
                target: None,
            },
            Field {
                fieldname: "role".to_string(),
                fieldtype: "Select".to_string(),
                label: None,
                required: None,
                default: None,
                computed: None,
                target: None,
            },
        ],
    };

    let mut schema_map = SchemaMap::new();
    schema_map.insert("User".to_string(), schema);

    let options = json!({
        "fields": ["name", "role"],
        "orderBy": "name",
        "order": "asc"
    });
    let results = get_all(&conn, &schema_map, "User", &options).unwrap();
    let arr = results.as_array().unwrap();
    assert_eq!(arr.len(), 2);
    assert_eq!(arr[0]["name"], "alice");
    assert_eq!(arr[1]["name"], "bob");

    let options_limit = json!({
        "fields": ["name"],
        "limit": 1,
        "orderBy": "name",
        "order": "asc"
    });
    let results_limit = get_all(&conn, &schema_map, "User", &options_limit).unwrap();
    assert_eq!(results_limit.as_array().unwrap().len(), 1);
}

#[test]
fn test_insert_or_update_children() {
    let conn = Connection::open_in_memory().unwrap();
    conn.execute(
        "CREATE TABLE User (
            name TEXT PRIMARY KEY
        )",
        [],
    ).unwrap();

    conn.execute(
        "CREATE TABLE Address (
            name TEXT PRIMARY KEY,
            parent TEXT,
            parentSchemaName TEXT,
            parentFieldname TEXT,
            idx INTEGER,
            street TEXT
        )",
        [],
    ).unwrap();

    let parent_schema = Schema {
        name: "User".to_string(),
        label: None,
        is_child: None,
        is_single: None,
        naming: None,
        fields: vec![
            Field {
                fieldname: "name".to_string(),
                fieldtype: "Data".to_string(),
                label: None,
                required: None,
                default: None,
                computed: None,
                target: None,
            },
            Field {
                fieldname: "addresses".to_string(),
                fieldtype: "Table".to_string(),
                label: None,
                required: None,
                default: None,
                computed: None,
                target: Some("Address".to_string()),
            },
        ],
    };

    let child_schema = Schema {
        name: "Address".to_string(),
        label: None,
        is_child: Some(true),
        is_single: None,
        naming: None,
        fields: vec![
            Field {
                fieldname: "name".to_string(),
                fieldtype: "Data".to_string(),
                label: None,
                required: None,
                default: None,
                computed: None,
                target: None,
            },
            Field {
                fieldname: "parent".to_string(),
                fieldtype: "Data".to_string(),
                label: None,
                required: None,
                default: None,
                computed: None,
                target: None,
            },
            Field {
                fieldname: "street".to_string(),
                fieldtype: "Data".to_string(),
                label: None,
                required: None,
                default: None,
                computed: None,
                target: None,
            },
        ],
    };

    let mut schema_map = SchemaMap::new();
    schema_map.insert("User".to_string(), parent_schema.clone());
    schema_map.insert("Address".to_string(), child_schema);

    let mut user_payload = json!({
        "name": "john_doe",
        "addresses": [
            {
                "street": "Baker St"
            }
        ]
    });

    conn.execute("INSERT INTO User (name) VALUES ('john_doe')", []).unwrap();
    insert_or_update_children(&conn, &schema_map, &parent_schema, "User", &mut user_payload, false).unwrap();

    let child: TestChild = conn.query_one_typed(
        "SELECT name, parent, idx, street FROM Address WHERE parent = 'john_doe'",
        &[],
    ).unwrap().unwrap();
    assert_eq!(child.street, "Baker St");
}
