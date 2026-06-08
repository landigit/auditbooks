# Auditbooks — Codebase Structure & Bun Dependency Tree

## Complete File Tree with Bun Dependency Markers

```
🔴 = Hard Bun dependency (must be replaced for Tauri)
🟡 = Soft Bun dependency (uses Node APIs that Tauri handles differently)
🟢 = Platform-agnostic (works in any WebView, no changes needed)
⚪ = Dev-only / not shipped in production
```

```
auditbooks/
│
├── 🟢 index.html                          # Vite entry HTML
├── 🟢 package.json                        # Dependencies (bun-types is devDep only)
├── ⚪ vite.config.ts                       # Build config (needs Tauri target addition)
├── ⚪ lynx.config.ts                       # Rspeedy/Lynx build config
├── ⚪ drizzle.config.ts                    # Drizzle Kit config (dev-only)
│
├── src/                                    # ── FRONTEND ──
│   ├── 🟢 App.vue                         # Root Vue component (37KB, main UI)
│   │
│   ├── ── Entry Points ──
│   │   ├── 🟡 renderer.ts                 # Web entry → imports ipc-polyfill
│   │   ├── 🟡 renderer-lynx.ts            # Lynx entry → imports ipc-lynx
│   │   ├── 🟡 initFyo.ts                  # Web Fyo factory → ipc-polyfill
│   │   └── 🟡 initFyo-lynx.ts             # Lynx Fyo factory → LynxDemux
│   │   └── ❓ renderer-tauri.ts           # [NEEDED] Tauri entry
│   │   └── ❓ initFyo-tauri.ts            # [NEEDED] Tauri Fyo factory
│   │   └── ❓ ipc-tauri.ts                # [NEEDED] Tauri IPC bridge
│   │
│   ├── ── IPC Bridges ──
│   │   ├── 🟡 ipc-polyfill.ts             # Web: fetch → Bun backend (:6970)
│   │   │   ├── callBackend()              # POST /api/ipc { action, args }
│   │   │   ├── callBackendWrapped()       # Same + error wrapping
│   │   │   ├── storeInstance              # localStorage-based config
│   │   │   └── webIpc                     # Full IPC interface impl
│   │   │       ├── db.getSchema()
│   │   │       ├── db.create()
│   │   │       ├── db.connect()
│   │   │       ├── db.call()
│   │   │       └── db.bespoke()
│   │   │
│   │   └── 🟡 ipc-lynx.ts                # Lynx: fetch → Bun backend (:6970)
│   │       ├── callBackend()              # Same pattern as polyfill
│   │       ├── storeInstance              # In-memory + backend persistence
│   │       └── lynxIpc                    # Full IPC interface impl
│   │
│   ├── ── Routing ──
│   │   ├── 🟢 router.ts                  # Web Vue Router (4.1KB)
│   │   └── 🟢 router-lynx.ts             # Lynx Vue Router (7.1KB)
│   │
│   ├── ── UI Components ──
│   │   └── 🟢 components/                # All Vue components
│   │       ├── Badge.vue
│   │       ├── LucideIcon.vue
│   │       └── ... (many more)
│   │
│   ├── ── Pages ──
│   │   └── 🟢 pages/                     # All page views
│   │
│   ├── ── State Management ──
│   │   └── 🟢 stores/                    # Pinia stores
│   │       └── app.ts                     # Main app store
│   │
│   ├── ── Composables ──
│   │   └── 🟢 composables/               # Vue composables
│   │
│   ├── ── Utils ──
│   │   └── 🟢 utils/
│   │       ├── interactive.ts             # Detects BACKEND_IP env
│   │       └── language.ts                # Language map helpers
│   │
│   ├── ── Error Handling ──
│   │   └── 🟢 errorHandling.ts           # Error reporting (8.5KB)
│   │
│   └── 🟢 importer.ts                    # CSV import logic (16KB)
│
├── fyo/                                   # ── BUSINESS LOGIC FRAMEWORK ──
│   ├── 🟢 index.ts                       # Fyo class (main orchestrator)
│   └── demux/
│       ├── 🟡 db.ts                      # Electron demux (original)
│       └── 🟢 dbLynx.ts                  # Lynx demux (30KB)
│           │                              # ✅ Has full in-JS SQLite ORM
│           ├── NativeSqliteModule          # Interface for native SQLite
│           ├── NativeSqliteClient          # Promise wrapper
│           ├── LynxDatabaseCore            # Full CRUD + migrate + bespoke
│           └── LynxDemux                   # DatabaseDemuxBase impl
│                                          # Detects native vs HTTP fallback
│
├── backend/                               # ── SERVER-SIDE (Bun-only) ──
│   ├── 🟡 helpers.ts                     # Node fs utilities
│   │   ├── sqliteTypeMap                  # Field → SQLite type mapping
│   │   ├── databaseMethodSet             # Allowed DB method names
│   │   ├── checkFileAccess()             # fs.access wrapper
│   │   └── unlinkIfExists()              # Retry-delete file
│   │
│   ├── database/
│   │   ├── 🔴 core.ts                    # DatabaseCore (35KB)
│   │   │   ├── import bun:sqlite          # ⚠️ Hard Bun dep
│   │   │   ├── import drizzle-orm/bun-sqlite  # ⚠️ Hard Bun dep
│   │   │   ├── BunSqliteClient            # execute/close wrapper
│   │   │   └── DatabaseCore               # Full ORM: CRUD, migrate, etc
│   │   │
│   │   ├── 🟡 manager.ts                 # DatabaseManager (7.9KB)
│   │   │   ├── createNewDatabase()
│   │   │   ├── connectToDatabase()
│   │   │   ├── call()                     # Generic method dispatch
│   │   │   ├── callBespoke()              # Custom query dispatch
│   │   │   ├── #migrate()                 # Schema migration engine
│   │   │   └── #createBackup()            # VACUUM INTO backup
│   │   │
│   │   ├── 🟡 bespoke.ts                 # BespokeQueries (17KB)
│   │   │   ├── getLastInserted()
│   │   │   ├── getIncomeAndExpenses()
│   │   │   ├── getTotalCreditAndDebit()
│   │   │   ├── getCashflow()
│   │   │   ├── getTotalOutstanding()
│   │   │   └── getStockQuantity()
│   │   │
│   │   ├── 🟡 runPatch.ts                # Patch runner (1.5KB)
│   │   └── 🟢 types.ts                   # Type definitions
│   │
│   ├── shims/
│   │   ├── 🟢 api.ts                     # External API fetch (211B, no Bun)
│   │   ├── 🔴 getLanguageMap.ts           # Bun.file() for translations
│   │   └── 🔴 getTemplates.ts             # Bun.file() for templates
│   │
│   └── patches/                           # Schema migration patches
│       └── 🟡 updateSchemas.ts            # Uses fs/promises
│
├── build/scripts/                         # ── BUILD-TIME BACKEND ──
│   └── 🔴 backend.ts                     # THE BUN HTTP SERVER (13.8KB)
│       │                                  # This is what Tauri replaces!
│       ├── Bun.serve() on :6970
│       ├── POST /api/upload-db            # Bun.write()
│       └── POST /api/ipc
│           ├── DB_CREATE                  # → databaseManager.createNewDatabase
│           ├── DB_CONNECT                 # → databaseManager.connectToDatabase
│           ├── DB_CALL                    # → databaseManager.call
│           ├── DB_BESPOKE                 # → databaseManager.callBespoke
│           ├── DB_SCHEMA                  # → databaseManager.getSchemaMap
│           ├── GET_ENV                    # → { isDevelopment, platform, version }
│           ├── GET_DB_DEFAULT_PATH        # → path.join(dbs/, name.db)
│           ├── CHECK_DB_ACCESS            # → Bun.file().exists()
│           ├── SAVE_DATA                  # → Bun.write()
│           ├── DELETE_FILE                # → fs.unlink()
│           ├── READ_DOC_FILE              # → Bun.file().text()
│           ├── READ_DOC_DATA              # → Bun.file().arrayBuffer() + base64
│           ├── GET_LANGUAGE_MAP           # → getLanguageMap()
│           ├── GET_TEMPLATES              # → getTemplates()
│           ├── SEND_API_REQUEST           # → fetch()
│           ├── GET_DB_LIST                # → Bun.Glob("*.db")
│           ├── SELECT_FILE                # → Bun.Glob("*.db")
│           ├── GET_OPEN_FILEPATH          # → Bun.Glob("*.db")
│           ├── GET_SAVE_FILEPATH          # → path.resolve()
│           ├── GET_CREDS                  # → static stub
│           ├── INIT_SCHEDULER             # → stub
│           ├── CHECK_FOR_UPDATES          # → stub
│           ├── STORE_ALL                  # → Bun.file(config.json).json()
│           ├── STORE_SET                  # → Bun.write(config.json)
│           ├── STORE_DELETE               # → Bun.write(config.json)
│           └── SAVE_HTML_AS_PDF           # → Playwright (desktop only!)
│
├── src-tauri/                             # ── TAURI SHELL ──
│   ├── tauri.conf.json                    # Config (minimal)
│   ├── Cargo.toml                         # Rust deps (minimal)
│   ├── src/
│   │   ├── lib.rs                         # ⚠️ Empty scaffold
│   │   └── main.rs                        # Windows entry
│   └── capabilities/
│       └── default.json                   # core:default only
│
├── android/                               # ── ANDROID (Lynx-specific) ──
│   └── AuditbooksSqliteModule.kt          # Lynx native SQLite module
│       ├── openDatabase()
│       ├── execute()
│       ├── closeDatabase()
│       ├── deleteDatabase()
│       └── listDatabases()
│
├── schemas/                               # ── SHARED (Platform-agnostic) ──
│   └── 🟢 **/*.ts                        # JSON schema definitions
│
├── models/                                # ── SHARED ──
│   └── 🟢 **/*.ts                        # Business model classes
│
├── utils/                                 # ── SHARED ──
│   └── 🟢 **/*.ts                        # Shared utilities
│       ├── db/types.ts                    # DatabaseDemuxBase interface
│       ├── ipc/types.ts                   # IPC interface definition
│       └── messages.ts                    # IPC_ACTIONS enum
│
├── regional/                              # ── SHARED ──
│   └── 🟢 **/*.ts                        # India, US, etc.
│
├── reports/                               # ── SHARED ──
│   └── 🟢 **/*.ts                        # Report generators
│
├── translations/                          # ── ASSETS ──
│   └── 🟢 *.csv                          # i18n translation files
│
├── templates/                             # ── ASSETS ──
│   └── 🟢 *.html                         # Print templates
│
└── drizzle/                               # ── DEV TOOLING ──
    └── db/
        ├── 🔴 client.ts                   # bun:sqlite client (dev-only)
        ├── 🟢 schema.ts                   # Drizzle schema definitions
        └── 🟢 relations.ts               # Drizzle relations
```

---

## IPC Action Map — What Each Action Calls

This shows the complete chain from frontend to backend for every IPC action:

```
┌──────────────────────────────────┐
│  FRONTEND (WebView)              │
│  ipc.db.call("insert", ...)      │
└─────────────┬────────────────────┘
              │ fetch POST /api/ipc
              │ { action: "DB_CALL", args: ["insert", ...] }
              ▼
┌──────────────────────────────────┐
│  BUN BACKEND (backend.ts)        │
│  switch(action)                  │
│    case "DB_CALL":               │
│      databaseManager.call(       │
│        method, ...args           │
│      )                           │
└─────────────┬────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│  DATABASE MANAGER (manager.ts)   │
│  this.db[method](...args)        │
└─────────────┬────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│  DATABASE CORE (core.ts)         │
│  this.client.execute(sql, args)  │
└─────────────┬────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│  BUN SQLITE (bun:sqlite)         │  ← This is what Tauri replaces
│  db.prepare(sql).all(...args)    │     with rusqlite
└──────────────────────────────────┘
```

### For Tauri, the chain becomes:

```
┌──────────────────────────────────┐
│  FRONTEND (WebView)              │
│  invoke("db_call", {             │
│    method: "insert", args: [...] │
│  })                              │
└─────────────┬────────────────────┘
              │ Tauri IPC (native bridge)
              ▼
┌──────────────────────────────────┐
│  RUST BACKEND (lib.rs)           │
│  #[tauri::command]               │
│  fn db_call(method, args)        │
└─────────────┬────────────────────┘
              │
              ▼
┌──────────────────────────────────┐
│  RUSQLITE                        │
│  conn.execute(sql, params)       │
└──────────────────────────────────┘
```

---

## Bun API Heat Map

Files sorted by Bun dependency severity:

```
HIGH SEVERITY (🔴 Must replace)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
build/scripts/backend.ts    ████████████████████ 20 calls
backend/database/core.ts    ████████           8 calls  (bun:sqlite import)
backend/shims/getLanguageMap.ts ████           4 calls
backend/shims/getTemplates.ts   ██             2 calls
drizzle/db/client.ts            ██             2 calls

LOW SEVERITY (⚪ Dev/scratch only)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
scratch/fix-type-declares.ts    █              1 call
scratch/add-declare-to-models.ts █             1 call
scratch/fix-declare.ts          █              1 call

NO BUN DEPS (🟢 Clean)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
src/**                          (all frontend code)
fyo/**                          (except Fyo constructor)
schemas/**
models/**
utils/**
regional/**
reports/**
```
