import type { DB } from "src/types/db";
import type { DatabaseManager } from "../../database/manager";

async function execute(dm: DatabaseManager) {
	const sourceTables = [
		"PurchaseInvoice",
		"SalesInvoice",
		"JournalEntry",
		"Payment",
		"StockMovement",
		"StockTransfer",
	] as (keyof DB & string)[];

	if (!dm.db?.db) return;

	const entries = await dm.db.db
		.selectFrom("AccountingLedgerEntry")
		.select(["name", "date", "referenceName"])
		.execute();

	for (const entry of entries) {
		if (!entry.referenceName) continue;

		for (const table of sourceTables) {
			const resp = await dm.db.db
				.selectFrom(table)
				.select(["name", "date"])
				.where("name", "=", entry.referenceName as string)
				.executeTakeFirst();

			if (resp) {
				const dateTimeValue = new Date(resp.date as string);
				await dm.db.db
					.updateTable("AccountingLedgerEntry")
					.set({ date: dateTimeValue.toISOString() })
					.where("name", "=", entry.name as string)
					.execute();

				// Break once found in one of the source tables
				break;
			}
		}
	}
}

export default { execute, beforeMigrate: true };
