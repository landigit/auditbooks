import { join } from 'path';
import { createClient } from '@libsql/client';
import type { Value } from '@libsql/client';

const dbPath =
  process.env['DB_PATH'] ||
  join(process.cwd(), '..', 'GRVEP', 'GRVe Printers.db');

const client = createClient({ url: `file:${dbPath}` });

async function tableCount(
  name: string
): Promise<{ total: number; submitted: number }> {
  const checkResult = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    args: [name],
  });
  if (checkResult.rows.length === 0) {
    return { total: 0, submitted: 0 };
  }

  const totalResult = await client.execute(
    `SELECT count(*) as count FROM ${name}`
  );
  const subResult = await client.execute(
    `SELECT count(*) as count FROM ${name} WHERE submitted = 1`
  );

  const toNumber = (v: Value): number =>
    typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : 0;

  const total = toNumber(totalResult.rows[0]?.['count'] ?? 0);
  const submitted = toNumber(subResult.rows[0]?.['count'] ?? 0);
  return { total, submitted };
}

async function main() {
  try {
    console.log('=== FINAL DATABASE INTEGRITY CHECK ===');
    console.log('SalesInvoice:      ', await tableCount('SalesInvoice'));
    console.log('PurchaseInvoice:   ', await tableCount('PurchaseInvoice'));
    console.log('Payment:           ', await tableCount('Payment'));
    console.log('JournalEntry:      ', await tableCount('JournalEntry'));

    const ledgerCheck = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='AccountingLedgerEntry'"
    );
    if (ledgerCheck.rows.length > 0) {
      const ledger = await client.execute(
        'SELECT count(*) as count FROM AccountingLedgerEntry'
      );
      const count = ledger.rows[0]?.['count'];
      console.log('Accounting Ledger Entries: ', count);
    } else {
      console.log('Accounting Ledger Entries:  (table absent)');
    }
  } finally {
    client.close();
  }
}

main();
