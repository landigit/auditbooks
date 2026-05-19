
export interface ResultSet {
  columns: string[];
  rows: any[];
  rowsAffected: number;
  lastInsertRowid?: bigint;
}

export interface InStatement {
  sql: string;
  args?: any[];
}

export interface Client {
  execute(stmt: string | InStatement): Promise<ResultSet>;
  batch(stmts: (string | InStatement)[], mode?: string): Promise<ResultSet[]>;
  transaction(mode?: string): Promise<any>;
  close(): void;
}

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AuditbooksDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadDbFromIndexedDB(dbPath: string): Promise<Uint8Array | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('databases', 'readonly');
      const store = transaction.objectStore('databases');
      const request = store.get(dbPath);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to load DB from IndexedDB', e);
    return null;
  }
}

async function saveDbToIndexedDB(dbPath: string, data: Uint8Array): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('databases', 'readwrite');
      const store = transaction.objectStore('databases');
      const request = store.put(data, dbPath);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save DB to IndexedDB', e);
  }
}

let SQL: any = null;
const activeDbs = new Map<string, { db: any; savePending: boolean }>();

async function getSQL() {
  if (!SQL) {
    if (!(window as any).initSqlJs) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js';
      document.head.appendChild(script);
      await new Promise((resolve) => {
        script.onload = resolve;
      });
    }
    const initSqlJs = (window as any).initSqlJs;
    SQL = await initSqlJs({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          return 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.wasm';
        }
        return `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`;
      },
    });
  }
  return SQL;
}

export function createClient(config: { url: string }): Client {
  const dbPath = config.url.replace(/^file:/, '');
  let initPromise: Promise<any> | null = null;

  async function getDb() {
    if (activeDbs.has(dbPath)) {
      return activeDbs.get(dbPath)!.db;
    }

    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      const sqlInstance = await getSQL();
      let dbData: Uint8Array | null = null;
      if (dbPath !== ':memory:' && !dbPath.startsWith(':memory:')) {
        dbData = await loadDbFromIndexedDB(dbPath);
      }

      const sqliteDb = dbData ? new sqlInstance.Database(dbData) : new sqlInstance.Database();
      activeDbs.set(dbPath, { db: sqliteDb, savePending: false });
      return sqliteDb;
    })();

    const result = await initPromise;
    initPromise = null;
    return result;
  }

  async function queueSave() {
    if (dbPath === ':memory:' || dbPath.startsWith(':memory:')) {
      return;
    }
    const state = activeDbs.get(dbPath);
    if (!state || state.savePending) {
      return;
    }
    state.savePending = true;
    // Debounce saves slightly to avoid performance degradation on rapid queries
    setTimeout(async () => {
      try {
        const dbState = activeDbs.get(dbPath);
        if (dbState) {
          const binary = dbState.db.export();
          await saveDbToIndexedDB(dbPath, binary);
          dbState.savePending = false;
        }
      } catch (e) {
        console.error('Failed to auto-save SQLite database', e);
      }
    }, 100);
  }

  return {
    async execute(stmt: string | InStatement): Promise<ResultSet> {
      const sqliteDb = await getDb();
      const sql = typeof stmt === 'string' ? stmt : stmt.sql;
      const args = typeof stmt === 'string' ? [] : (stmt.args || []);

      let statement: any;
      try {
        statement = sqliteDb.prepare(sql);
        statement.bind(args.map(a => typeof a === 'bigint' ? Number(a) : a));
      } catch (e: any) {
        console.error('SQL Execution error preparing statement:', sql, args, e);
        throw e;
      }

      const rows: any[] = [];
      try {
        while (statement.step()) {
          rows.push(statement.getAsObject());
        }
      } catch (e: any) {
        statement.free();
        throw e;
      }

      const columns = statement.getColumnNames();
      statement.free();

      const isWrite = /^\s*(insert|update|delete|create|alter|drop|pragma)/i.test(sql);
      if (isWrite) {
        queueSave();
      }

      let lastInsertRowid: bigint | undefined = undefined;
      if (/^\s*insert/i.test(sql)) {
        try {
          const lastIdRes = sqliteDb.exec('SELECT last_insert_rowid() as id');
          if (lastIdRes.length > 0 && lastIdRes[0].values.length > 0) {
            lastInsertRowid = BigInt(lastIdRes[0].values[0][0]);
          }
        } catch {}
      }

      return {
        columns,
        rows,
        rowsAffected: sqliteDb.getRowsModified(),
        lastInsertRowid,
      };
    },

    async batch(stmts: (string | InStatement)[], _mode?: string): Promise<ResultSet[]> {
      const results: ResultSet[] = [];
      const sqliteDb = await getDb();
      sqliteDb.exec('BEGIN TRANSACTION;');
      try {
        for (const stmt of stmts) {
          results.push(await this.execute(stmt));
        }
        sqliteDb.exec('COMMIT;');
        queueSave();
      } catch (e) {
        sqliteDb.exec('ROLLBACK;');
        throw e;
      }
      return results;
    },

    async transaction(_mode?: string): Promise<any> {
      const sqliteDb = await getDb();
      sqliteDb.exec('BEGIN TRANSACTION;');
      return {
        execute: async (stmt: string | InStatement) => this.execute(stmt),
        batch: async (stmts: (string | InStatement)[]) => this.batch(stmts),
        commit: async () => {
          sqliteDb.exec('COMMIT;');
          queueSave();
        },
        rollback: async () => {
          sqliteDb.exec('ROLLBACK;');
        },
      };
    },

    close() {
      const state = activeDbs.get(dbPath);
      if (state) {
        try {
          const binary = state.db.export();
          saveDbToIndexedDB(dbPath, binary);
        } catch {}
        state.db.close();
        activeDbs.delete(dbPath);
      }
    },
  };
}

export class LibsqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LibsqlError';
  }
}

export class LibsqlBatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LibsqlBatchError';
  }
}
