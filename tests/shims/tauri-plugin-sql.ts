import BetterDatabase from 'better-sqlite3';

export default class Database {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  static async load(connStr: string) {
    const dbPath = connStr.startsWith('sqlite:') ? connStr.slice(7) : connStr;
    const rawDb = new BetterDatabase(dbPath);
    return new Database(rawDb);
  }

  async select<T = any>(sql: string, args: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql);
    if (!stmt.reader) {
      stmt.run(...args);
      return [] as T[];
    }
    return stmt.all(...args) as T[];
  }

  async execute(
    sql: string,
    args: any[] = []
  ): Promise<{ rowsAffected: number; lastInsertId: number | bigint }> {
    const stmt = this.db.prepare(sql);
    if (stmt.reader) {
      stmt.all(...args);
      return { rowsAffected: 0, lastInsertId: 0 };
    }
    const info = stmt.run(...args);
    return {
      rowsAffected: info.changes,
      lastInsertId: info.lastInsertRowid,
    };
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
