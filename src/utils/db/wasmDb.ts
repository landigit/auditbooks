/**
 * wasmDb.ts
 *
 * SQLite WebAssembly database engine.
 *
 * Loads the SQLite Wasm binary (sql.js), keeps the live database instance
 * in JS memory, and exposes a minimal API that the rest of the app uses
 * through Drizzle ORM.
 *
 * On every write the updated binary image is flushed to disk via whichever
 * FileSystemBridge is currently registered (Tauri or Lynx native).
 *
 * Usage
 * -----
 * ```ts
 * // During app bootstrap (after registering the FS bridge):
 * import { initWasmDb, getWasmDb } from 'src/utils/db/wasmDb';
 * await initWasmDb('company.db');
 *
 * // Anywhere else:
 * const db = getWasmDb();
 * const rows = db.exec('SELECT * FROM accounts');
 * ```
 */

import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { getFsBridge } from 'src/utils/fsBridge';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let _SQL: SqlJsStatic | null = null;
let _db: Database | null = null;
let _filename: string | null = null;

/**
 * Debounce handle — we batch rapid sequential writes into a single flush so
 * that interactive UI edits don't hammer the native FS.
 */
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_DEBOUNCE_MS = 500;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the SQLite Wasm engine, open (or create) the database from disk, and
 * keep it ready for queries.
 *
 * Safe to call multiple times — subsequent calls with the same filename are
 * no-ops.  Pass a different filename to switch databases (closes the current
 * one first).
 */
export async function initWasmDb(filename: string): Promise<void> {
  if (_db && _filename === filename) {
    // Already open and correct file — nothing to do.
    return;
  }

  // Close any previously open database.
  if (_db) {
    _db.close();
    _db = null;
    _filename = null;
  }

  // Load the Wasm engine once.
  if (!_SQL) {
    _SQL = await loadSqlJs();
  }

  const bridge = getFsBridge();
  const existingBytes = await bridge.readDatabaseFile(filename);

  _db = existingBytes ? new _SQL.Database(existingBytes) : new _SQL.Database();
  _filename = filename;

  console.info(
    `[wasmDb] Database "${filename}" opened (${existingBytes ? 'existing' : 'new'}).`
  );
}

/**
 * Return the live in-memory database instance.
 * Throws if `initWasmDb` has not been called yet.
 */
export function getWasmDb(): Database {
  if (!_db) {
    throw new Error(
      '[wasmDb] Database is not initialised. Call initWasmDb() first.'
    );
  }
  return _db;
}

/**
 * Explicitly flush the current database state to disk.
 * Usually you do not need to call this directly — writes are auto-flushed.
 */
export async function flushWasmDb(): Promise<void> {
  if (!_db || !_filename) return;

  const bridge = getFsBridge();
  const bytes = _db.export();
  await bridge.writeDatabaseFile(_filename, bytes);

  console.debug(`[wasmDb] Flushed "${_filename}" (${bytes.byteLength} bytes).`);
}

/**
 * Schedule a debounced flush.  Call this after every mutating SQL statement.
 */
export function scheduleFlush(): void {
  if (_flushTimer !== null) {
    clearTimeout(_flushTimer);
  }
  _flushTimer = setTimeout(async () => {
    _flushTimer = null;
    try {
      await flushWasmDb();
    } catch (err) {
      console.error('[wasmDb] Auto-flush failed:', err);
    }
  }, FLUSH_DEBOUNCE_MS);
}

/**
 * Close the database and release resources.
 * Any pending flush is cancelled — call `flushWasmDb()` first if you need
 * to ensure the last state is written.
 */
export function closeWasmDb(): void {
  if (_flushTimer !== null) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }
  if (_db) {
    _db.close();
    _db = null;
  }
  _filename = null;
  console.info('[wasmDb] Database closed.');
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Load sql.js with the Wasm binary located relative to the JS bundle.
 *
 * In a bundler context the Wasm file is copied to the output `dist/` folder
 * (configured in rsbuild / rspeedy) and this URL resolves correctly at
 * runtime.  In Node.js / Bun test environments we fall back to the npm
 * package path so tests can run without a bundler.
 */
async function loadSqlJs(): Promise<SqlJsStatic> {
  try {
    // Browser / Lynx JS thread — Wasm file is a static asset in the bundle
    const wasmUrl = new URL(
      '/sql-wasm.wasm',
      globalThis.location?.href ?? 'http://localhost/'
    );
    return await initSqlJs({ locateFile: () => wasmUrl.href });
  } catch {
    // Fallback for Node / Bun test environments
    return await initSqlJs();
  }
}
