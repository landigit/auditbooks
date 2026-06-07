# Implementation Plan: Unified SQLite WebAssembly Database Core (Tauri & Vue Lynx)

This plan outlines the design and steps required to migrate the database backend to **SQLite WebAssembly (Wasm)**. By running SQLite directly inside the JavaScript engine, we can share 100% of our Drizzle ORM queries and database schemas across **Tauri** (Desktop) and **Vue Lynx** (Mobile Native), using lightweight file-storage bridges as the only native code.

---

## Proposed Architecture

```
                    ┌────────────────────────┐
                    │  Vue Frontend (Shared) │
                    └───────────┬────────────┘
                                │ Query
                    ┌───────────▼────────────┐
                    │      Drizzle ORM       │
                    └───────────┬────────────┘
                                │ Execute SQL
                    ┌───────────▼────────────┐
                    │      SQLite Wasm       │
                    │   (In-Memory DB Node)  │
                    └───────────┬────────────┘
                                │ Read/Write Binary Array
                    ┌───────────▼────────────┐
                    │  Universal FS Interface │
                    │ (src/utils/fsBridge.ts)│
                    └───────────┬────────────┘
                                │
         ┌──────────────────────┴──────────────────────┐
         ▼                                             ▼
┌──────────────────┐                         ┌──────────────────┐
│  Tauri FS Bridge │                         │  Lynx FS Bridge  │
│  (Desktop Prod)  │                         │  (Mobile Native) │
└────────┬─────────┘                         └────────┬─────────┘
         │ Writes File                                 │ Native Module Call
┌────────▼─────────┐                         ┌────────▼─────────┐
│  Desktop Disk    │                         │ iOS/Android Disk │
│  (.db file)      │                         │   (.db file)     │
└──────────────────┘                         └──────────────────┘
```

---

## Proposed Changes

### 1. Dependency Configurations

#### [MODIFY] [package.json](file:///e:/code/auditbooks/package.json)

- Add SQL.js / SQLite Wasm library: `sql.js` (or `@vlcn.io/crsqlite` for sync support).
- Add typescript types for the Wasm wrapper: `@types/sql.js`.

#### [MODIFY] [rsbuild.config.ts](file:///e:/code/auditbooks/rsbuild.config.ts) & [lynx.config.ts](file:///e:/code/auditbooks/lynx/lynx.config.ts)

- Configure the bundler to copy the `sql-wasm.wasm` binary to the output assets folder (`dist/` / target bundle directory) so the JS thread can locate and load it.

---

### 2. Core Database Client

#### [NEW] [wasmDb.ts](file:///e:/code/auditbooks/src/utils/db/wasmDb.ts)

- Load the SQLite Wasm binary.
- Initialize the SQLite database engine inside the JS memory context.
- Configure Drizzle ORM to execute SQL queries on the WebAssembly database instance.
- Expose standard DB methods (`connect`, `execute`, `getDbBytes`).

#### [NEW] [fsBridge.ts](file:///e:/code/auditbooks/src/utils/fsBridge.ts)

- Define the platform-agnostic file management interface:
  ```typescript
  export interface FileSystemBridge {
    readDatabaseFile(filename: string): Promise<Uint8Array | null>;
    writeDatabaseFile(filename: string, bytes: Uint8Array): Promise<void>;
  }
  ```

---

### 3. Platform Implementations

#### [NEW] [tauriFs.ts](file:///e:/code/auditbooks/src/utils/ipc/tauriFs.ts)

- Implement `FileSystemBridge` using Tauri's native filesystem plugin (`@tauri-apps/plugin-fs` or `@tauri-apps/api/fs`):
  - `readDatabaseFile`: Read binary file bytes into `Uint8Array`.
  - `writeDatabaseFile`: Write updated `Uint8Array` bytes directly back to the database file.

#### [NEW] [lynxFs.ts](file:///e:/code/auditbooks/lynx/src/lib/lynxFs.ts)

- Implement `FileSystemBridge` using Lynx Native Module calls:

  ```typescript
  const fsModule = (globalThis as any).lynx.requireModule('AuditbooksFsModule');

  export const lynxFsBridge: FileSystemBridge = {
    async readDatabaseFile(filename) {
      const base64 = await fsModule.readBytes(filename);
      return base64 ? Buffer.from(base64, 'base64') : null;
    },
    async writeDatabaseFile(filename, bytes) {
      const base64 = Buffer.from(bytes).toString('base64');
      await fsModule.writeBytes(filename, base64);
    },
  };
  ```

---

### 4. Host Native Shell Modules

#### [NEW] [AuditbooksFsModule.kt](file:///e:/code/auditbooks/android/AuditbooksFsModule.kt) (Android)

- Implement a simple Kotlin class exposed as a Lynx Native Module:
  - `readBytes`: Read the raw database file bytes from the app's documents directory and return them as a Base64 string to the JS thread.
  - `writeBytes`: Decode the Base64 string from the JS thread and write the raw bytes back to the database file.

#### [NEW] [AuditbooksFsModule.swift](file:///e:/code/auditbooks/ios/AuditbooksFsModule.swift) (iOS)

- Implement the equivalent Swift class exposed as a Lynx Native Module:
  - `readBytes`: Read database file bytes and return them as a Base64 string.
  - `writeBytes`: Decode the Base64 string and save the bytes back to disk.

---

## Verification Plan

### Automated Tests

- Compile and check type safety:
  ```bash
  bun run type
  ```
- Verify Web and Lynx bundle output:
  ```bash
  bun run build:lynx
  ```

### Manual Verification

- Launch Tauri Desktop Dev mode, verify that the Wasm database loads successfully on startup, updates correctly when invoices are created, and persists the `.db` file locally.
- Launch Lynx Simulator, verify that the Wasm database operates on the background thread and successfully saves state through the native Android/iOS documents folder.
