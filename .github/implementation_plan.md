# Implementation Plan: Bun → Tauri Android Migration

## Goal

Migrate Auditbooks from depending on a Bun HTTP backend server to running natively inside Tauri's Android WebView, with all backend operations handled by Rust-side Tauri commands. This is a **module-by-module incremental migration** — the web dev mode continues working throughout.

---

## Phase 1: Foundation (🔴 P0 — Required for app launch)

### Module 1: Tauri IPC Bridge

> Replace HTTP fetch-based IPC with native Tauri `invoke()` calls.

#### [NEW] [ipc-tauri.ts](file:///e:/code/auditbooks/src/ipc-tauri.ts)

- Implement the `IPC` interface (same as [ipc-polyfill.ts](file:///e:/code/auditbooks/src/ipc-polyfill.ts))
- Replace all `callBackend()` → `invoke("ipc_action", { action, args })`
- Implement `storeInstance` using `invoke("store_get")` / `invoke("store_set")`
- Wire up real Tauri window commands (`minimize`, `close`, etc.)
- Implement `openLink()` / `openExternalUrl()` via `@tauri-apps/plugin-shell`

#### [NEW] [initFyo-tauri.ts](file:///e:/code/auditbooks/src/initFyo-tauri.ts)

- Create Fyo instance with a `TauriDemux` (or reuse `LynxDemux` with Tauri adapter)
- Set `isElectron: false` for mobile behavior

#### [NEW] [renderer-tauri.ts](file:///e:/code/auditbooks/src/renderer-tauri.ts)

- Entry point for Tauri builds
- Import `ipc-tauri.ts` instead of `ipc-polyfill.ts`
- Mount Vue app same as `renderer.ts` but with Tauri-specific platform detection

#### [MODIFY] [vite.config.ts](file:///e:/code/auditbooks/vite.config.ts)

- Detect `TAURI_ENV` / `TAURI_PLATFORM` env vars
- Conditionally inject `ipc-tauri` instead of `ipc-polyfill` via `@rollup/plugin-inject`
- Ensure the Tauri dev server host binds to `TAURI_DEV_HOST`

---

### Module 2: Rust SQLite Backend

> Implement all database operations in Rust, replacing `bun:sqlite` + `DatabaseCore`.

#### [MODIFY] [Cargo.toml](file:///e:/code/auditbooks/src-tauri/Cargo.toml)

- Add dependencies:
  ```toml
  rusqlite = { version = "0.32", features = ["bundled"] }
  tauri-plugin-sql = { version = "2", features = ["sqlite"] }
  ```

#### [NEW] `src-tauri/src/db.rs`

- `DatabaseManager` struct wrapping `rusqlite::Connection`
- Methods mirroring [manager.ts](file:///e:/code/auditbooks/backend/database/manager.ts):
  - `create_new_database(db_path, country_code)`
  - `connect_to_database(db_path, country_code)`
  - `call(method, args)` — generic dispatcher
  - `call_bespoke(method, args)` — report queries
  - `migrate()` — schema migration
- WAL mode + foreign keys enabled on connect
- Use `Mutex<Option<Connection>>` for thread-safe singleton

#### [NEW] `src-tauri/src/commands.rs`

- All `#[tauri::command]` functions:

  ```rust
  #[tauri::command]
  async fn db_create(db_path: String, country_code: String) -> Result<String, String>

  #[tauri::command]
  async fn db_connect(db_path: String, country_code: Option<String>) -> Result<String, String>

  #[tauri::command]
  async fn db_call(method: String, args: Vec<serde_json::Value>) -> Result<serde_json::Value, String>

  #[tauri::command]
  async fn db_bespoke(method: String, args: Vec<serde_json::Value>) -> Result<serde_json::Value, String>

  #[tauri::command]
  fn db_schema() -> Result<serde_json::Value, String>

  #[tauri::command]
  fn get_env() -> serde_json::Value
  ```

#### [MODIFY] [lib.rs](file:///e:/code/auditbooks/src-tauri/src/lib.rs)

- Register all commands with `tauri::Builder::default().invoke_handler()`
- Register plugins: `tauri-plugin-sql`, `tauri-plugin-log`

---

### Module 3: File System Operations

> Replace `Bun.file()` / `Bun.write()` / `Bun.Glob()` with Rust filesystem commands.

#### [NEW] `src-tauri/src/fs_commands.rs`

- Commands:

  ```rust
  #[tauri::command]
  fn check_file_exists(path: String) -> bool

  #[tauri::command]
  fn read_file_text(path: String) -> Result<String, String>

  #[tauri::command]
  fn read_file_base64(path: String) -> Result<String, String>

  #[tauri::command]
  fn write_file(path: String, data: Vec<u8>) -> Result<bool, String>

  #[tauri::command]
  fn delete_file(path: String) -> Result<bool, String>

  #[tauri::command]
  fn list_db_files() -> Result<Vec<DbFileInfo>, String>

  #[tauri::command]
  fn get_db_default_path(app: AppHandle, company_name: String) -> String
  ```

- Use `app.path().app_data_dir()` for storing DBs on Android

---

## Phase 2: Core Features (🟡 P1)

### Module 4: Config/Store Persistence

#### [MODIFY] [Cargo.toml](file:///e:/code/auditbooks/src-tauri/Cargo.toml)

- Add `tauri-plugin-store = "2"`

#### [NEW] `src-tauri/src/store_commands.rs`

- `store_get_all()` — Read entire store
- `store_set(key, value)` — Set key
- `store_delete(key)` — Delete key
- Backed by `tauri-plugin-store` (persists to app data directory)

---

### Module 5: Language Map & Templates

> Bundle translations and templates; read via Rust.

#### [MODIFY] [tauri.conf.json](file:///e:/code/auditbooks/src-tauri/tauri.conf.json)

- Add resources:
  ```json
  "bundle": {
    "resources": [
      "../translations/*.csv",
      "../templates/*.html"
    ]
  }
  ```

#### [NEW] `src-tauri/src/i18n.rs`

- `get_language_map(code)` — Read bundled CSV, parse to JSON map
- Caching in memory after first read

#### [NEW] `src-tauri/src/templates.rs`

- `get_templates(pos_width)` — Read bundled HTML templates
- Return template content + metadata

---

### Module 7: Tauri Capabilities & Permissions

#### [MODIFY] [default.json](file:///e:/code/auditbooks/src-tauri/capabilities/default.json)

- Expand permissions:
  ```json
  {
    "permissions": [
      "core:default",
      "sql:default",
      "store:default",
      "shell:allow-open",
      "dialog:default"
    ]
  }
  ```

#### [NEW] `src-tauri/capabilities/mobile.json`

- Android-specific permissions (camera for barcode scanning, etc.)

---

### Module 8: Build Pipeline

#### [MODIFY] [vite.config.ts](file:///e:/code/auditbooks/vite.config.ts)

- Detect Tauri environment:
  ```typescript
  const isTauri = !!process.env.TAURI_ENV_PLATFORM;
  const ipcModule = isTauri
    ? path.resolve(__dirname, './src/ipc-tauri')
    : path.resolve(__dirname, './src/ipc-polyfill');
  ```
- Adjust `emptyModulePlugin` to also stub `bun:sqlite` for Tauri WebView builds

#### [MODIFY] [package.json](file:///e:/code/auditbooks/package.json)

- Ensure `tauri:android:dev` and `tauri:android:build` scripts are correct
- Add `@tauri-apps/api` and needed plugins to dependencies:
  ```json
  "@tauri-apps/api": "^2.0.0",
  "@tauri-apps/plugin-shell": "^2.0.0",
  "@tauri-apps/plugin-dialog": "^2.0.0",
  "@tauri-apps/plugin-store": "^2.0.0"
  ```

---

## Phase 3: Polish (🟢 P2)

### Module 6: PDF Generation

> Replace Playwright with a mobile-compatible alternative.

#### Option A: Client-side (Recommended)

- Add `html2pdf.js` to frontend dependencies
- Modify `ipc-tauri.ts` `makePDF()` to use client-side rendering
- No Rust code needed

#### Option B: Android Print Service

- Create Tauri plugin wrapping Android's `PrintManager`
- More native feel but more code

---

### Module 9: Window & Platform Operations

#### [MODIFY] `src/ipc-tauri.ts`

- Wire up real Tauri APIs:

  ```typescript
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { open } from "@tauri-apps/plugin-shell";

  reloadWindow() { getCurrentWindow().reload() }
  openLink(url) { open(url) }
  openExternalUrl(url) { open(url) }
  ```

- Mobile-specific: `minimizeWindow` / `toggleMaximize` = no-ops

---

### Module 10: UI Verification

- Test all responsive breakpoints in Android WebView
- Verify touch event handling (tap polyfill)
- Test `safe-area-inset-*` for notched devices
- Virtual keyboard behavior with form inputs
- Pull-to-refresh handling
- Android back button navigation

---

## Verification Plan

### Automated Tests

```bash
# Existing tests should pass (they test the shared logic layer)
vp test

# After Phase 1, run Tauri-specific smoke tests
cargo test --manifest-path src-tauri/Cargo.toml
```

### Manual Verification

| Phase | Test                               | Expected                           |
| ----- | ---------------------------------- | ---------------------------------- |
| 1     | `tauri android dev` — app launches | WebView loads Vue app              |
| 1     | Create new company DB              | SQLite DB created in app data      |
| 1     | Open existing DB                   | Connection + schema migration      |
| 1     | Insert/update/delete records       | CRUD operations work               |
| 2     | Change language                    | Translation CSV loaded from bundle |
| 2     | Print preview                      | Template loaded from bundle        |
| 2     | Close and reopen app               | Config persisted                   |
| 3     | Export PDF                         | PDF generated and downloadable     |
| 3     | Open external link                 | System browser opens               |
| 3     | Responsive layout                  | Works on phone + tablet            |

---

## Open Questions

> [!IMPORTANT]
> **Q1**: Should we reuse the `LynxDatabaseCore` (JS-side ORM in [dbLynx.ts](file:///e:/code/auditbooks/fyo/demux/dbLynx.ts)) with a Tauri SQL adapter, or implement all DB logic in Rust? Reusing LynxDatabaseCore would be faster but keeps SQL construction in JS.

> [!IMPORTANT]
> **Q2**: Separate `renderer-tauri.ts` entry point, or modify the existing `renderer.ts` to auto-detect Tauri at runtime?

> [!IMPORTANT]
> **Q3**: PDF generation approach for mobile?
