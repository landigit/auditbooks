// fyo/demux/dbTauri.ts
// ---------------------------------------------------------------------------
// DatabaseDemuxBase for Tauri (desktop & mobile).
//
// Architecture:
//   JS (LynxDatabaseCore ORM)  →  invoke()  →  Rust (libsql-rusqlite)
//
// LynxDatabaseCore is pure-JS schema migration + query building.
// All actual SQL execution happens in Rust via four commands:
//   db_open    — open/create a database file
//   db_close   — close the connection
//   db_query   — SELECT/PRAGMA → returns Vec<Map<String,Value>>
//   db_execute — INSERT/UPDATE/DELETE/CREATE → returns rows_affected
//
// No @tauri-apps/plugin-sql. No Lynx native modules.
// ---------------------------------------------------------------------------

import type { SchemaMap } from 'schemas/types';
import type { DatabaseDemuxBase, DatabaseMethod } from 'utils/db/types';
import { getSchemas } from 'schemas';

// ============================================================================
// 1. Tauri invoke helper
// ============================================================================

async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

// ============================================================================
// 2. RustSqliteClient — implements the client interface LynxDatabaseCore needs
// ============================================================================

interface SqlResult {
  rows: Record<string, unknown>[];
  rowsAffected: number;
}

class RustSqliteClient {
  schemaMap: SchemaMap = {};
  private _dbPath: string | null = null;

  async open(path: string): Promise<void> {
    await invoke('db_open', { path });
    this._dbPath = path;
  }

  async execute(sql: string, args: unknown[] = []): Promise<SqlResult> {
    if (!this._dbPath) {
      throw new Error('[RustSqliteClient] Database not open');
    }

    const trimmed = sql.trim().toLowerCase();
    const isQuery =
      trimmed.startsWith('select') ||
      trimmed.startsWith('pragma') ||
      trimmed.startsWith('explain');

    if (isQuery) {
      const rows = await invoke<Record<string, unknown>[]>('db_query', {
        sql,
        args,
      });
      return { rows: rows ?? [], rowsAffected: 0 };
    } else {
      const affected = await invoke<number>('db_execute', { sql, args });
      return { rows: [], rowsAffected: affected ?? 0 };
    }
  }

  async close(): Promise<void> {
    await invoke('db_close');
    this._dbPath = null;
  }
}

// ============================================================================
// 3. TauriDemux — DatabaseDemuxBase
// ============================================================================

// Forward-declare LynxDatabaseCore type (imported dynamically to avoid circulars)
type LynxDatabaseCoreType = InstanceType<any>;

export class TauriDemux implements DatabaseDemuxBase {
  private core: LynxDatabaseCoreType | null = null;
  private client: RustSqliteClient | null = null;

  async getSchemaMap(): Promise<SchemaMap> {
    return getSchemas('in', []) as SchemaMap;
  }

  async createNewDatabase(dbPath: string, countryCode?: string): Promise<string> {
    return this.openOrCreate(dbPath, countryCode ?? 'in');
  }

  async connectToDatabase(dbPath: string, countryCode?: string): Promise<string> {
    return this.openOrCreate(dbPath, countryCode);
  }

  async call(method: DatabaseMethod, ...args: unknown[]): Promise<unknown> {
    if (!this.core) {
      if (method === 'close') {
        if (this.client) {
          try { await this.client.close(); } catch {}
          this.client = null;
        }
        return;
      }
      throw new Error('[TauriDemux] DB not connected. Call createNewDatabase or connectToDatabase first.');
    }

    if (method === 'close') {
      try { await this.core.close?.(); } catch {}
      await this.client?.close();
      this.core = null;
      this.client = null;
      return;
    }

    return this.core[method](...args);
  }

  async callBespoke(method: string, ...args: unknown[]): Promise<unknown> {
    if (!this.core) throw new Error('[TauriDemux] DB not connected');
    return this.core.callBespoke(method, ...args);
  }

  // --------------------------------------------------------------------------
  // Private: open or create a DB, run migration, set this.core
  // --------------------------------------------------------------------------

  private async openOrCreate(dbPath: string, countryCode = 'in'): Promise<string> {
    // Close existing connection first
    if (this.client) {
      try { await this.client.close(); } catch {}
      this.client = null;
      this.core = null;
    }

    // Use only the filename for AppData-relative paths
    const isAbsolute = dbPath.startsWith('/') || /^[A-Za-z]:/.test(dbPath);
    const path = isAbsolute ? dbPath : (dbPath.split(/[/\\]/).pop() ?? dbPath);

    this.client = new RustSqliteClient();
    await this.client.open(path);

    // Load LynxDatabaseCore dynamically (pure-JS ORM, no native deps)
    const { LynxDatabaseCore } = await import('./dbLynx');
    const schemaMap = await this.getSchemaMap();
    const core = new (LynxDatabaseCore as any)(this.client);
    core.setSchemaMap(schemaMap);
    await core.migrate();
    this.core = core;

    // Try to read stored country code
    try {
      const sv = await core.getSingleValues({
        fieldname: 'countryCode',
        parent: 'SystemSettings',
      });
      if (sv?.length > 0) return sv[0].value as string;
    } catch {
      // New DB — no SystemSettings yet
    }

    return countryCode;
  }
}

// ============================================================================
// 4. Singleton factory
// ============================================================================

let _demux: TauriDemux | null = null;
export function getTauriDemux(): TauriDemux {
  if (!_demux) _demux = new TauriDemux();
  return _demux;
}
