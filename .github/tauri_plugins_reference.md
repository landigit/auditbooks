# Tauri v2 Plugins Reference — Auditbooks Migration

> Every Tauri plugin needed to replace Bun backend functionality, with install commands, config snippets, capability permissions, frontend API usage, and Android-specific notes.

---

## Plugin Overview

| #   | Plugin                      | Replaces (Bun)                                        | Priority  | Android      |
| --- | --------------------------- | ----------------------------------------------------- | --------- | ------------ |
| 1   | `tauri-plugin-sql`          | `bun:sqlite`, `drizzle-orm/bun-sqlite`                | 🔴 P0     | ✅           |
| 2   | `tauri-plugin-store`        | `Bun.file("config.json")`, `Bun.write("config.json")` | 🔴 P0     | ✅           |
| 3   | `tauri-plugin-dialog`       | `Bun.Glob("*.db")` (file picker), `window.prompt()`   | 🟡 P1     | ✅ Partial   |
| 4   | `tauri-plugin-opener`       | `window.open()`, `openLink()`, `openExternalUrl()`    | 🟡 P1     | ✅           |
| 5   | `tauri-plugin-fs`           | `Bun.file()`, `Bun.write()`, `fs/promises`            | 🟡 P1     | ✅ Sandboxed |
| 6   | `tauri-plugin-http`         | `fetch()` in backend shims (`sendAPIRequest`)         | 🟢 P2     | ✅           |
| 7   | `tauri-plugin-log`          | `console.log/error` (already installed)               | ⚪ Exists | ✅           |
| 8   | `tauri-plugin-notification` | Error dialogs, user alerts                            | 🟢 P2     | ✅           |
| 9   | Custom `#[tauri::command]`  | `Bun.serve()`, all IPC_ACTIONS                        | 🔴 P0     | ✅           |

---

## 1. `tauri-plugin-sql` — SQLite Database

### What It Replaces

- `import { Database } from "bun:sqlite"` in [core.ts](file:///e:/code/auditbooks/backend/database/core.ts)
- `drizzle-orm/bun-sqlite` ORM adapter
- All `DatabaseCore` methods: `execute()`, `prepare()`, `all()`, `run()`

### Install

```bash
# From project root
cargo tauri add sql

# Or manually in Cargo.toml
cargo add tauri-plugin-sql --features sqlite
```

```bash
# Frontend bindings
pnpm add @tauri-apps/plugin-sql
```

### Cargo.toml Addition

```toml
# src-tauri/Cargo.toml
[dependencies]
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
```

### lib.rs Registration

```rust
// src-tauri/src/lib.rs
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        // ... other plugins
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Capabilities / Permissions

```json
// src-tauri/capabilities/default.json
{
  "permissions": [
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close"
  ]
}
```

### Frontend API Usage

```typescript
import Database from '@tauri-apps/plugin-sql';

// Connect (creates file if not exists)
const db = await Database.load('sqlite:auditbooks.db');

// Execute (INSERT, UPDATE, DELETE)
await db.execute('INSERT INTO Account (name, rootType) VALUES ($1, $2)', [
  'Cash',
  'Asset',
]);

// Select (returns rows)
const rows = await db.select<any[]>(
  'SELECT * FROM Account WHERE rootType = $1',
  ['Asset']
);

// Close
await db.close();
```

### Android Notes

> [!IMPORTANT]
>
> - Uses `sqlx` under the hood (not `rusqlite`). Fully cross-platform.
> - SQLite DB files are stored in the app's private data directory on Android.
> - Path format: `sqlite:filename.db` — the plugin resolves to the app data dir automatically.
> - WAL mode and PRAGMA configuration must be done via raw `EXECUTE` after connect.
> - **No native file picker** — you cannot let the user browse for `.db` files on external storage without `tauri-plugin-dialog` or `tauri-plugin-android-fs`.

### Mapping to Current Code

| Current (Bun)                  | Tauri Plugin Equivalent                 |
| ------------------------------ | --------------------------------------- |
| `new Database(dbPath)`         | `Database.load("sqlite:file.db")`       |
| `db.prepare(sql).all(...args)` | `db.select(sql, args)`                  |
| `db.prepare(sql).run(...args)` | `db.execute(sql, args)`                 |
| `PRAGMA foreign_keys=ON`       | `db.execute("PRAGMA foreign_keys=ON")`  |
| `PRAGMA journal_mode=WAL`      | `db.execute("PRAGMA journal_mode=WAL")` |

---

## 2. `tauri-plugin-store` — Persistent Key-Value Config

### What It Replaces

- `Bun.file("dbs/config.json").json()` / `Bun.write("dbs/config.json", ...)` in [backend.ts](file:///e:/code/auditbooks/build/scripts/backend.ts#L281-L333)
- `IPC_ACTIONS.STORE_ALL`, `STORE_SET`, `STORE_DELETE`
- `localStorage` fallback in [ipc-polyfill.ts](file:///e:/code/auditbooks/src/ipc-polyfill.ts#L66-L85)

### Install

```bash
cargo tauri add store
```

```bash
pnpm add @tauri-apps/plugin-store
```

### Cargo.toml Addition

```toml
[dependencies]
tauri-plugin-store = "2"
```

### lib.rs Registration

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Capabilities / Permissions

```json
{
  "permissions": [
    "store:default",
    "store:allow-get",
    "store:allow-set",
    "store:allow-delete",
    "store:allow-keys",
    "store:allow-entries",
    "store:allow-save",
    "store:allow-load"
  ]
}
```

### Frontend API Usage

```typescript
import { Store } from '@tauri-apps/plugin-store';

// Create or open a store (auto-persisted to disk)
const store = new Store('config.json');

// Set
await store.set('config:lastOpenedDb', 'MyCompany.db');

// Get
const value = await store.get<string>('config:lastOpenedDb');

// Delete
await store.delete('config:lastOpenedDb');

// List all entries
const entries = await store.entries();

// Explicit save (usually auto-saved)
await store.save();
```

### Android Notes

> [!TIP]
>
> - Data is stored in the app's config directory (survives app updates).
> - Automatically serializes/deserializes JSON values.
> - Thread-safe — can be accessed from multiple WebView contexts.
> - Replaces the in-memory `configStore` in [ipc-lynx.ts](file:///e:/code/auditbooks/src/ipc-lynx.ts#L90-L124) with a native persistent store.

---

## 3. `tauri-plugin-dialog` — File Picker & Message Dialogs

### What It Replaces

- `window.prompt()` in [ipc-polyfill.ts](file:///e:/code/auditbooks/src/ipc-polyfill.ts#L134) (getSaveFilePath)
- `document.createElement("input")` file picker in [ipc-polyfill.ts](file:///e:/code/auditbooks/src/ipc-polyfill.ts#L150-L194)
- `Bun.Glob("*.db")` for SELECT_FILE / GET_OPEN_FILEPATH
- `IPC_ACTIONS.SELECT_FILE`, `GET_OPEN_FILEPATH`, `GET_SAVE_FILEPATH`

### Install

```bash
cargo tauri add dialog
```

```bash
pnpm add @tauri-apps/plugin-dialog
```

### Cargo.toml Addition

```toml
[dependencies]
tauri-plugin-dialog = "2"
```

### lib.rs Registration

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Capabilities / Permissions

```json
{
  "permissions": [
    "dialog:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "dialog:allow-message",
    "dialog:allow-ask",
    "dialog:allow-confirm"
  ]
}
```

### Frontend API Usage

```typescript
import { open, save, message, ask } from '@tauri-apps/plugin-dialog';

// Open file picker (returns file path)
const filePath = await open({
  filters: [{ name: 'Database', extensions: ['db'] }],
  multiple: false,
});

// Save file dialog
const savePath = await save({
  defaultPath: 'MyCompany.db',
  filters: [{ name: 'Database', extensions: ['db'] }],
});

// Message dialog (replaces alert())
await message('Database saved successfully!', { title: 'Success' });

// Confirmation dialog (replaces confirm())
const confirmed = await ask('Delete this company?', {
  title: 'Confirm Delete',
  kind: 'warning',
});
```

### Android Notes

> [!WARNING]
>
> - **Folder picking is NOT supported** on Android — only file picking works.
> - File paths returned are content URIs on Android (e.g., `content://...`), not filesystem paths.
> - For importing `.db` files on Android, you may need to copy the selected file into the app's data directory first.
> - Consider `tauri-plugin-android-fs` for more robust Android file access.

---

## 4. `tauri-plugin-opener` — External URLs & Files

### What It Replaces

- `window.open(link, "_blank")` in [ipc-polyfill.ts](file:///e:/code/auditbooks/src/ipc-polyfill.ts#L203-L205)
- `openLink()` / `openExternalUrl()` stubs in [ipc-lynx.ts](file:///e:/code/auditbooks/src/ipc-lynx.ts#L179-L220)
- `showItemInFolder()` stub

### Install

```bash
cargo tauri add opener
```

```bash
pnpm add @tauri-apps/plugin-opener
```

### Cargo.toml Addition

```toml
[dependencies]
tauri-plugin-opener = "2"
```

### lib.rs Registration

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Capabilities / Permissions

```json
{
  "permissions": [
    "opener:default",
    "opener:allow-open-url",
    "opener:allow-open-path"
  ]
}
```

### Frontend API Usage

```typescript
import { openUrl, openPath } from '@tauri-apps/plugin-opener';

// Open URL in system browser
await openUrl('https://landigit.com');

// Open file with default app (e.g., PDF viewer)
await openPath('/path/to/invoice.pdf');
```

### Android Notes

> [!TIP]
>
> - Uses Android's Intent system under the hood.
> - `openUrl()` opens in the default browser.
> - `openPath()` triggers Android's file viewer intent (user chooses app).
> - `showItemInFolder()` → use `openPath()` on the parent directory (limited on Android).

---

## 5. `tauri-plugin-fs` — Filesystem Access

### What It Replaces

- `Bun.file(path).text()` / `.exists()` / `.arrayBuffer()` / `.size` / `.lastModified`
- `Bun.write(path, data)`
- `Bun.Glob("*.db")` → `readDir()`
- `fs.unlink()`, `fs.mkdir()`, `fs.access()` from Node.js `fs/promises`

### Install

```bash
cargo tauri add fs
```

```bash
pnpm add @tauri-apps/plugin-fs
```

### Cargo.toml Addition

```toml
[dependencies]
tauri-plugin-fs = "2"
```

### lib.rs Registration

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Capabilities / Permissions

```json
{
  "permissions": [
    "fs:default",
    "fs:allow-exists",
    "fs:allow-read-file",
    "fs:allow-write-file",
    "fs:allow-read-dir",
    "fs:allow-mkdir",
    "fs:allow-remove",
    "fs:allow-stat",
    "fs:allow-rename",
    "fs:allow-copy-file",
    {
      "identifier": "fs:scope",
      "allow": ["$APPDATA/**", "$RESOURCE/**"]
    }
  ]
}
```

### Frontend API Usage

```typescript
import {
  exists,
  readTextFile,
  readFile,
  writeTextFile,
  writeFile,
  readDir,
  mkdir,
  remove,
  stat,
  BaseDirectory,
} from '@tauri-apps/plugin-fs';

// Check file exists
const fileExists = await exists('dbs/MyCompany.db', {
  baseDir: BaseDirectory.AppData,
});

// Read text file
const csvContent = await readTextFile('translations/en.csv', {
  baseDir: BaseDirectory.Resource,
});

// Read binary file (returns Uint8Array)
const bytes = await readFile('books/image.png', {
  baseDir: BaseDirectory.AppData,
});

// Write text file
await writeTextFile('dbs/config.json', JSON.stringify(data), {
  baseDir: BaseDirectory.AppData,
});

// Write binary file
await writeFile('dbs/export.db', new Uint8Array(buffer), {
  baseDir: BaseDirectory.AppData,
});

// List directory (replaces Bun.Glob)
const entries = await readDir('dbs', {
  baseDir: BaseDirectory.AppData,
});
const dbFiles = entries.filter((e) => e.name?.endsWith('.db'));

// Get file metadata (size, modified time)
const meta = await stat('dbs/MyCompany.db', {
  baseDir: BaseDirectory.AppData,
});
console.log(meta.size, meta.mtime);

// Create directory
await mkdir('dbs/backups', {
  baseDir: BaseDirectory.AppData,
  recursive: true,
});

// Delete file
await remove('dbs/old.db', {
  baseDir: BaseDirectory.AppData,
});
```

### Android Notes

> [!WARNING]
>
> - On Android, filesystem access is **sandboxed** to the app's private directories.
> - `BaseDirectory.AppData` → `/data/data/com.landigit.auditbooks/files/`
> - `BaseDirectory.Resource` → Bundled assets from `tauri.conf.json > bundle > resources`
> - You **cannot** access arbitrary paths like `/sdcard/` without `tauri-plugin-android-fs`.
> - For importing external `.db` files, use `tauri-plugin-dialog` to pick + copy into `AppData`.

### Alternative: `tauri-plugin-android-fs`

For robust external storage access on Android:

```bash
cargo add tauri-plugin-android-fs
```

```rust
.plugin(tauri_plugin_android_fs::init())
```

---

## 6. `tauri-plugin-http` — Network Requests

### What It Replaces

- `fetch()` calls in [api.ts](file:///e:/code/auditbooks/backend/shims/api.ts) (`sendAPIRequest`)
- `fetch()` calls in [getLanguageMap.ts](file:///e:/code/auditbooks/backend/shims/getLanguageMap.ts#L77-L96) (GitHub API)

### Install

```bash
cargo tauri add http
```

```bash
pnpm add @tauri-apps/plugin-http
```

### Cargo.toml Addition

```toml
[dependencies]
tauri-plugin-http = "2"
```

### lib.rs Registration

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Capabilities / Permissions

```json
{
  "permissions": [
    {
      "identifier": "http:default",
      "allow": [
        { "url": "https://api.github.com/**" },
        { "url": "https://raw.githubusercontent.com/**" },
        { "url": "https://*.landigit.com/**" }
      ]
    }
  ]
}
```

### Frontend API Usage

```typescript
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Fetch with full CORS bypass (no browser restrictions!)
const response = await tauriFetch('https://api.github.com/repos/...', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
});
const data = await response.json();
```

### Android Notes

> [!TIP]
>
> - **Key advantage**: Bypasses CORS restrictions that the WebView would enforce.
> - Standard `fetch()` inside WebView may fail for cross-origin requests.
> - The Tauri HTTP plugin routes requests through the Rust runtime, bypassing the WebView's security model.
> - Useful for the GitHub translation API calls in `getLanguageMap.ts`.
> - Scope the `allow` URLs carefully — don't use `"url": "https://**"` in production.

---

## 7. `tauri-plugin-log` — Structured Logging

### What It Replaces

- `console.log()` / `console.error()` throughout the backend
- Already partially installed in [lib.rs](file:///e:/code/auditbooks/src-tauri/src/lib.rs#L7-L9)

### Current State

Already present in your `Cargo.toml` and `lib.rs`:

```rust
// Already in src-tauri/src/lib.rs
.plugin(
    tauri_plugin_log::Builder::default()
        .level(log::LevelFilter::Info)
        .build(),
)
```

### Frontend API Usage (Optional)

```bash
pnpm add @tauri-apps/plugin-log
```

```typescript
import { info, warn, error, debug } from '@tauri-apps/plugin-log';

// Logs to both Android Logcat AND the Tauri console
await info('[DB] Connected to MyCompany.db');
await error('[DB] Migration failed: missing table Account');
```

### Capabilities / Permissions

```json
{
  "permissions": ["log:default"]
}
```

### Android Notes

> [!TIP]
>
> - Logs appear in Android Logcat (viewable via `adb logcat`).
> - Useful for debugging on-device without a desktop console.
> - Can configure file-based logging for crash reports:
>   ```rust
>   tauri_plugin_log::Builder::default()
>       .level(log::LevelFilter::Info)
>       .target(tauri_plugin_log::Target::new(
>           tauri_plugin_log::TargetKind::LogDir { file_name: Some("app.log".into()) },
>       ))
>       .build()
>   ```

---

## 8. `tauri-plugin-notification` — User Alerts

### What It Replaces

- `alert()` in [ipc-polyfill.ts](file:///e:/code/auditbooks/src/ipc-polyfill.ts#L281) (`showError`)
- `console.error("[Lynx Error Dialog]")` in [ipc-lynx.ts](file:///e:/code/auditbooks/src/ipc-lynx.ts#L222) (`showError`)

### Install

```bash
cargo tauri add notification
```

```bash
pnpm add @tauri-apps/plugin-notification
```

### Cargo.toml Addition

```toml
[dependencies]
tauri-plugin-notification = "2"
```

### lib.rs Registration

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Capabilities / Permissions

```json
{
  "permissions": [
    "notification:default",
    "notification:allow-notify",
    "notification:allow-request-permission",
    "notification:allow-is-permission-granted"
  ]
}
```

### Frontend API Usage

```typescript
import {
  sendNotification,
  requestPermission,
  isPermissionGranted,
} from '@tauri-apps/plugin-notification';

// Check + request permission
let granted = await isPermissionGranted();
if (!granted) {
  const result = await requestPermission();
  granted = result === 'granted';
}

// Send notification
if (granted) {
  sendNotification({
    title: 'Backup Complete',
    body: 'MyCompany.db has been backed up successfully.',
  });
}
```

### Android Notes

> [!IMPORTANT]
>
> - On Android 13+ (API 33+), notification permission must be requested at runtime.
> - Always call `requestPermission()` before `sendNotification()`.
> - Notifications appear in the Android notification tray.
> - Useful for background operations: backup complete, sync finished, scheduler reminders.

---

## 9. Custom `#[tauri::command]` — IPC Action Handlers

### What It Replaces

- The **entire** `Bun.serve()` HTTP server in [backend.ts](file:///e:/code/auditbooks/build/scripts/backend.ts)
- All 25+ `IPC_ACTIONS` switch cases
- This is **not a plugin** — it's the core Tauri invoke mechanism

### How It Works

Instead of HTTP `fetch()` → Bun server, the frontend calls `invoke()` → Rust function:

```
BEFORE: fetch("http://localhost:6970/api/ipc", { action: "DB_CALL", args })
AFTER:  invoke("db_call", { method, args })
```

### lib.rs Registration

```rust
// src-tauri/src/lib.rs
mod commands;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // Database
            commands::db_create,
            commands::db_connect,
            commands::db_call,
            commands::db_bespoke,
            commands::db_schema,
            // Environment
            commands::get_env,
            commands::get_db_default_path,
            commands::get_db_list,
            // File operations
            commands::check_db_access,
            commands::save_data,
            commands::delete_file,
            commands::read_doc_file,
            commands::read_doc_data,
            // Assets
            commands::get_language_map,
            commands::get_templates,
            // Network
            commands::send_api_request,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Example Command Implementation

```rust
// src-tauri/src/commands.rs
use serde_json::Value;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub db: Mutex<Option<rusqlite::Connection>>,
}

#[tauri::command]
pub fn get_env() -> Value {
    serde_json::json!({
        "isDevelopment": cfg!(debug_assertions),
        "platform": "android",
        "version": "0.37.8"
    })
}

#[tauri::command]
pub async fn db_connect(
    state: State<'_, AppState>,
    db_path: String,
    country_code: Option<String>,
) -> Result<String, String> {
    let app_dir = // ... resolve app data dir
    let full_path = format!("{}/{}", app_dir, db_path);

    let conn = rusqlite::Connection::open(&full_path)
        .map_err(|e| e.to_string())?;

    conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;")
        .map_err(|e| e.to_string())?;

    *state.db.lock().unwrap() = Some(conn);

    Ok(country_code.unwrap_or_else(|| "in".to_string()))
}

#[tauri::command]
pub async fn db_call(
    state: State<'_, AppState>,
    method: String,
    args: Vec<Value>,
) -> Result<Value, String> {
    let guard = state.db.lock().unwrap();
    let conn = guard.as_ref().ok_or("DB not connected")?;

    match method.as_str() {
        "getAll" => { /* execute SELECT query */ }
        "insert" => { /* execute INSERT query */ }
        "update" => { /* execute UPDATE query */ }
        "delete" => { /* execute DELETE query */ }
        _ => Err(format!("Unknown method: {}", method)),
    }
}
```

### Frontend API Usage

```typescript
import { invoke } from '@tauri-apps/api/core';

// Replaces: fetch("http://localhost:6970/api/ipc", { body: { action: "DB_CONNECT", args } })
const countryCode = await invoke<string>('db_connect', {
  dbPath: 'MyCompany.db',
  countryCode: 'in',
});

// Replaces: fetch("http://localhost:6970/api/ipc", { body: { action: "DB_CALL", args } })
const rows = await invoke<any[]>('db_call', {
  method: 'getAll',
  args: ['Account', { fields: ['name', 'rootType'], limit: 50 }],
});

// Replaces: fetch("http://localhost:6970/api/ipc", { body: { action: "GET_ENV" } })
const env = await invoke<{
  isDevelopment: boolean;
  platform: string;
  version: string;
}>('get_env');
```

### Android Notes

> [!TIP]
>
> - `invoke()` calls are **synchronous over the native bridge** — much faster than HTTP fetch.
> - No network overhead, no CORS issues, no port conflicts.
> - Runs on the Rust side, which is the Tauri sidecar process on Android.
> - Thread safety: wrap shared state in `Mutex<T>` and pass via `State<'_, T>`.

---

## Combined Capabilities File

Here's what the final `src-tauri/capabilities/default.json` should look like with all plugins:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for Auditbooks",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "store:default",
    "dialog:default",
    "opener:default",
    "fs:default",
    "log:default",
    "notification:default",
    {
      "identifier": "http:default",
      "allow": [
        { "url": "https://api.github.com/**" },
        { "url": "https://raw.githubusercontent.com/**" }
      ]
    },
    {
      "identifier": "fs:scope",
      "allow": ["$APPDATA/**", "$RESOURCE/**"]
    }
  ]
}
```

And a mobile-specific override:

```json
{
  "$schema": "../gen/schemas/mobile-schema.json",
  "identifier": "mobile",
  "description": "Mobile-specific capabilities",
  "windows": ["main"],
  "platforms": ["android", "iOS"],
  "permissions": ["notification:allow-request-permission"]
}
```

---

## Combined lib.rs Registration

```rust
// src-tauri/src/lib.rs — Complete plugin registration
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ──
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        // ── Custom IPC Commands ──
        .invoke_handler(tauri::generate_handler![
            commands::db_create,
            commands::db_connect,
            commands::db_call,
            commands::db_bespoke,
            commands::db_schema,
            commands::get_env,
            commands::get_db_default_path,
            commands::get_db_list,
            commands::check_db_access,
            commands::save_data,
            commands::delete_file,
            commands::read_doc_file,
            commands::read_doc_data,
            commands::get_language_map,
            commands::get_templates,
            commands::send_api_request,
        ])
        // ── State ──
        .manage(commands::AppState::default())
        // ── Run ──
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

---

## Combined Cargo.toml Dependencies

```toml
# src-tauri/Cargo.toml
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
log = "0.4"
tauri = { version = "2.11.2", features = [] }

# Official Tauri plugins
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-store = "2"
tauri-plugin-dialog = "2"
tauri-plugin-opener = "2"
tauri-plugin-fs = "2"
tauri-plugin-http = "2"
tauri-plugin-notification = "2"
tauri-plugin-log = "2"

# Optional: direct rusqlite for custom commands
# rusqlite = { version = "0.32", features = ["bundled"] }
```

---

## Combined Frontend Dependencies

```bash
pnpm add @tauri-apps/api \
         @tauri-apps/plugin-sql \
         @tauri-apps/plugin-store \
         @tauri-apps/plugin-dialog \
         @tauri-apps/plugin-opener \
         @tauri-apps/plugin-fs \
         @tauri-apps/plugin-http \
         @tauri-apps/plugin-notification \
         @tauri-apps/plugin-log
```

---

## Plugin Decision Matrix

Which plugin to use for which Bun function:

| Bun Function          | Option A (Plugin)         | Option B (Custom Command)      | Recommendation                           |
| --------------------- | ------------------------- | ------------------------------ | ---------------------------------------- |
| `bun:sqlite`          | `tauri-plugin-sql`        | `rusqlite` via custom cmd      | **Custom cmd** (need full ORM control)   |
| `Bun.file().text()`   | `tauri-plugin-fs`         | `#[tauri::command]`            | **Plugin** (simpler)                     |
| `Bun.file().exists()` | `tauri-plugin-fs`         | `#[tauri::command]`            | **Plugin** (simpler)                     |
| `Bun.write()`         | `tauri-plugin-fs`         | `#[tauri::command]`            | **Plugin** (simpler)                     |
| `Bun.Glob()`          | `tauri-plugin-fs` readDir | `#[tauri::command]`            | **Plugin** (simpler)                     |
| `config.json` R/W     | `tauri-plugin-store`      | `tauri-plugin-fs`              | **Store plugin** (purpose-built)         |
| File picker           | `tauri-plugin-dialog`     | HTML input[type=file]          | **Plugin** (native feel)                 |
| External URLs         | `tauri-plugin-opener`     | Android Intent                 | **Plugin** (cross-platform)              |
| GitHub API fetch      | `tauri-plugin-http`       | Standard `fetch()`             | **Plugin** (bypasses CORS)               |
| `Bun.serve()`         | N/A                       | `#[tauri::command]` handlers   | **Custom cmds** (replaces entire server) |
| Playwright PDF        | N/A                       | `html2pdf.js` or Android Print | **Client-side JS**                       |
