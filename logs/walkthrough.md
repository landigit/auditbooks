# Walkthrough - Fully Eliminated Bun Sidecar

We have successfully completed the migration of the database connection, managers, and all remaining query and utility execution layers to native Tauri APIs and guest plugins.

The Bun sidecar process has been **fully eliminated** from the application.

## Changes Made

### Rust Backend (`src-tauri`)

- **[Cargo.toml](file:///d:/Zafar/books/src-tauri/Cargo.toml)**: Added `tauri-plugin-sql` dependency with `sqlite` feature.
- **[lib.rs](file:///d:/Zafar/books/src-tauri/src/lib.rs)**:
  - Registered `tauri_plugin_sql::Builder::default().build()`.
  - Removed the sidecar spawning loop entirely.
- **[tauri.conf.json](file:///d:/Zafar/books/src-tauri/tauri.conf.json)**:
  - Removed `bun run scripts/build-sidecar.ts` from `beforeDevCommand`.
  - Added `"../templates"` to Tauri `bundle.resources` to allow native HTML template loading.
- **[default.json](file:///d:/Zafar/books/src-tauri/capabilities/default.json)**:
  - Added `"sql:default"` and `"sql:allow-execute"` to permissions list.
  - Configured scoped FS and HTTP permission rules.
- **Platform Configs** (Windows, macOS, Linux): Removed `bin/backend` from `bundle.externalBin`.

### Frontend (`src`)

- **[package.json](file:///d:/Zafar/books/package.json)**: Installed `"kysely": "^0.27.3"` and `"@tauri-apps/plugin-sql": "~2"`.
- **[tauriDb.ts](file:///d:/Zafar/books/src/fyo/core/tauriDb.ts)**:
  - Implemented `TauriSqliteClient` wrapping `@tauri-apps/plugin-sql`'s `Database` class.
  - Re-implemented `DatabaseCore` and `DatabaseManager` to run queries asynchronously directly within the webview.
  - Re-implemented bespoke queries (`BespokeQueries`) to execute raw SQL directly, removing the dependency on backend Drizzle engine.
  - Configured a custom Kysely driver dialect that binds to the active Tauri SQL connection, fully implementing transaction interfaces to compile cleanly.
- **[ipc-polyfill.ts](file:///d:/Zafar/books/src/ipc-polyfill.ts)**:
  - Hooked frontend IPC database actions (`getSchema`, `create`, `connect`, `call`, `bespoke`) directly into `tauriDatabaseManager`.
  - Hooked frontend metadata actions (`getCreds`, `initScheduler`) to return Tauri native values.
  - Implemented `getTemplates` using `@tauri-apps/plugin-fs`'s `readDir` to scan the bundled templates folder natively.
  - Upon database connection, initialized the active Kysely instance and exposed it globally via `(window as any).db` for easy developer usage.

### Casing & Imports

- **[ui directory](file:///d:/Zafar/books/src/components/ui)**: Renamed folder `Ui` to `ui` to eliminate case-mismatch issues (`TS1261`) where various Vue and TS files imported from lowercase `src/components/ui` while the directory on disk was named `Ui`.
- **Imports refactored**: Removed imports of `SingleValue` and `RawCustomField` from the `backend/` directory in `src/schemas/index.ts` and `src/fyo/core/dbHandler.ts`, defining them locally inside `src/schemas/types.ts` to sever dependencies on backend files.

### Server & Build Cleanup

- **Deleted Unused Server Files**: Deleted legacy sidecar server entrypoints and endpoints that were only used by the Electron/Bun backend:
  - `backend/sidecar.ts`
  - `backend/api.ts`
  - `backend/contactMothership.ts`
  - `backend/getLanguageMap.ts`
  - `backend/getPrintTemplates.ts`
  - `scripts/build-sidecar.ts`
- **Updated [package.json](file:///d:/Zafar/books/package.json)**:
  - Removed the unused `dev:backend` script.
  - Modified the `build` script from `bun run scripts/build-sidecar.ts && vite build` to simply `vite build`.
- **Deleted Redundant Configs**: Deleted `tauri.windows.conf.json`, `tauri.macos.conf.json`, and `tauri.linux.conf.json` as they only specified the sidecar binaries under `bundle.externalBin` which has been removed. Tauri now falls back entirely to [tauri.conf.json](file:///d:/Zafar/books/src-tauri/tauri.conf.json).

### Dashboard Query Type-Safety

- **Type Compatibility in [tauriDb.ts](file:///d:/Zafar/books/src/fyo/core/tauriDb.ts)**: Re-implemented the SQL queries inside `TauriBespokeQueries` to match boolean fields (like `submitted`, `cancelled`, `reverted`, and `isGroup`) against both integer values (`1`/`0`) and stringified numbers (`'1'`/`'0'`). This fixes compatibility issues where legacy databases created by Drizzle stored booleans as stringified numeric values while native Tauri SQLite inserts them as integers.

## Verification

- **Casing Resolution**: Resolved folder case issues, resulting in complete resolution of TypeScript compiler `TS1261` warnings and errors.
- **Rust Compilation**: Verified `cargo check` in `src-tauri` runs and compiles with zero errors.
- **TypeScript & Vue Validation**: Confirmed type checking via `bun run type` (`vue-tsc --noEmit`) passes perfectly.
- **Production Build**: Executed `bun run build` successfully, producing the optimized web resources under the `dist` folder.
- **Test Suite Validation**: Ran all 311 unit tests via `bun test` and verified that they compile and pass perfectly with the cleaned codebase.
- **Dashboard Fixed**: Ensured dashboard widgets (Sales Invoice, Purchase Invoice, Income & Expenses, Cashflow) query submitted, cancelled, reverted, and isGroup columns using type-resilient logic that works on both legacy databases and new databases.
