import { describe, test, expect } from 'vitest';
import Database from 'libsql';
import { LynxDatabaseCore } from '../fyo/demux/dbLynx';
import { getSchemas } from '../schemas';

interface SqlResult {
  rows: Record<string, unknown>[];
  rowsAffected: number;
}

class MockSqliteClient {
  db: any;
  schemaMap: any = {};
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.prepare('PRAGMA foreign_keys=OFF;').run();
  }
  async open() {}
  
  cleanParams(params: any[]) {
    return params.map((p) => {
      if (typeof p === 'boolean') {
        return p ? 1 : 0;
      }
      return p;
    });
  }

  async execute(sql: string, args: any[] = []): Promise<SqlResult> {
    const trimmed = sql.trim().toLowerCase();
    const isQuery =
      trimmed.startsWith('select') ||
      trimmed.startsWith('pragma') ||
      trimmed.startsWith('explain');
    const cleanedArgs = this.cleanParams(args);
    try {
      if (isQuery) {
        const rows = this.db.prepare(sql).all(...cleanedArgs);
        return { rows, rowsAffected: 0 };
      } else {
        const res = this.db.prepare(sql).run(...cleanedArgs);
        return { rows: [], rowsAffected: res.changes };
      }
    } catch (err) {
      console.error("Mock SQL Error:", sql, args, err);
      throw err;
    }
  }
  async close() {
    this.db.close();
  }
}

describe('dbLynx.ts Core Tests', () => {
  test('insert and update SalesInvoice with items', async () => {
    const client = new MockSqliteClient(':memory:');
    const core = new LynxDatabaseCore(client);
    core.setSchemaMap(getSchemas('in', []));
    await core.migrate();

    // Prepare a mock SalesInvoice
    const invoice = {
      name: 'SINV-001',
      date: '2026-06-08',
      party: 'Test Customer',
      account: 'Debtors',
      createdBy: 'Admin',
      created: '2026-06-08T00:00:00.000Z',
      modifiedBy: 'Admin',
      modified: '2026-06-08T00:00:00.000Z',
      submitted: false,
      cancelled: false,
      items: [
        {
          name: 'item-1',
          item: 'Services',
          rate: '100',
          quantity: 1,
          account: 'Sales',
          amount: '100',
          idx: 0,
          parent: 'SINV-001',
          parentSchemaName: 'SalesInvoice',
          parentFieldname: 'items',
          isFreeItem: false
        }
      ]
    };

    // Let's insert!
    await core.insert('SalesInvoice', invoice);

    // Let's query the tables
    const parentRows = (await client.execute('SELECT * FROM "SalesInvoice"')).rows;
    const childRows = (await client.execute('SELECT * FROM "SalesInvoiceItem"')).rows;

    expect(parentRows.length).toBe(1);
    expect(childRows.length).toBe(1);

    // Let's update!
    invoice.submitted = true;
    await core.update('SalesInvoice', invoice);

    // Let's query the tables after update
    const parentRowsAfterUpdate = (await client.execute('SELECT * FROM "SalesInvoice"')).rows;
    const childRowsAfterUpdate = (await client.execute('SELECT * FROM "SalesInvoiceItem"')).rows;

    console.log("Parent Rows after update:", parentRowsAfterUpdate);
    console.log("Child Rows after update:", childRowsAfterUpdate);

    expect(parentRowsAfterUpdate.length).toBe(1);
    expect(childRowsAfterUpdate.length).toBe(1);

    await client.close();
  });
});
