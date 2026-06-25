import { DatabaseManager } from '../../database/manager';

/* eslint-disable */
async function execute(dm: DatabaseManager) {
  const kysely = dm.db?.kysely;
  if (!kysely) return;

  const sourceTables = [
    "PurchaseInvoice", 
    "SalesInvoice", 
    "JournalEntry",
    "Payment", 
    "StockMovement", 
    "StockTransfer"
  ];

  const entries = (await kysely
    .selectFrom('AccountingLedgerEntry')
    .select(['name', 'date', 'referenceName'])
    .execute()) as Array<{ name: string; date: string; referenceName: string }>;

  for (const entry of entries) {
    for (const table of sourceTables) {
      const resp = (await (kysely as any)
        .selectFrom(table)
        .select(['name', 'date'])
        .where('name', '=', entry.referenceName)
        .execute()) as Array<{ name: string; date: string }>;

      if (resp.length !== 0) {
        const dateTimeValue = new Date(resp[0].date);
        await kysely
          .updateTable('AccountingLedgerEntry')
          .set({ date: dateTimeValue.toISOString() })
          .where('name', '=', entry.name)
          .execute();
      }
    }
  }
}

export default { execute, beforeMigrate: true };
/* eslint-enable */