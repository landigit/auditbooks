import fs from "node:fs/promises";
import path from "node:path";
import type { RawValueMap } from "fyo/core/types";
import { sql } from "kysely";
import type { DB } from "src/types/db";
import { changeKeys, deleteKeys, getIsNullOrUndef, invertMap } from "utils";
import { getCountryCodeFromCountry } from "utils/misc";
import { Version } from "utils/version";
import { ModelNameEnum } from "../../models/types";
import {
	FieldTypeEnum,
	type Schema,
	type SchemaMap,
} from "../../schemas/types";
import { DatabaseManager } from "../database/manager";

const ignoreColumns = ["keywords"];
const columnMap = { creation: "created", owner: "createdBy" };
const childTableColumnMap = {
	parenttype: "parentSchemaName",
	parentfield: "parentFieldname",
};

const defaultNumberSeriesMap = {
	[ModelNameEnum.Payment]: "PAY-",
	[ModelNameEnum.JournalEntry]: "JV-",
	[ModelNameEnum.SalesInvoice]: "SINV-",
	[ModelNameEnum.PurchaseInvoice]: "PINV-",
	[ModelNameEnum.SalesQuote]: "SQUOT-",
} as Record<ModelNameEnum, string>;

async function execute(dm: DatabaseManager) {
	if (dm.db?.dbPath === ":memory:") {
		return;
	}

	if (!dm.db || !dm.db.db) {
		throw new Error("Database not connected");
	}

	const version = (
		await dm.db.getSingleValues({
			fieldname: "version",
		})
	)?.[0]?.value as string | undefined;

	/**
	 * Versions after this should have the new schemas
	 */
	if (version && Version.gt(version, "0.4.3-beta.0")) {
		return;
	}

	/**
	 * Initialize a different db to copy all the updated
	 * data into.
	 */
	const countryCode = await getCountryCode(dm);
	const destDm = await getDestinationDM(dm.db.dbPath, countryCode);

	/**
	 * Copy data from all the relevant tables
	 * the other tables will be empty cause unused.
	 */
	try {
		await copyData(dm, destDm);
	} catch (err) {
		const destPath = destDm.db?.dbPath;
		if (destPath) {
			await destDm.db?.close();
			await fs.unlink(destPath);
		}
		throw err;
	}

	/**
	 * Version will update when migration completes, this
	 * is set to prevent this patch from running again.
	 */
	await destDm.db?.update(ModelNameEnum.SystemSettings, {
		version: "0.5.0-beta.0",
	});

	/**
	 * Replace the database with the new one.
	 */
	await replaceDatabaseCore(dm, destDm);
}

async function replaceDatabaseCore(
	dm: DatabaseManager,
	destDm: DatabaseManager,
) {
	const newDbPath = destDm.db?.dbPath;
	const oldDbPath = dm.db?.dbPath;

	if (!newDbPath || !oldDbPath) return;

	await dm.db?.close();
	await destDm.db?.close();
	await fs.unlink(oldDbPath);
	await fs.rename(newDbPath, oldDbPath);
	await dm._connect(oldDbPath);
}

async function copyData(sourceDm: DatabaseManager, destDm: DatabaseManager) {
	if (!sourceDm.db?.db || !destDm.db?.db) {
		throw new Error("Databases not connected");
	}

	const schemaMap = destDm.getSchemaMap();
	await sql`PRAGMA foreign_keys=OFF`.execute(destDm.db.db);

	await copySingleValues(sourceDm, destDm, schemaMap);
	if (schemaMap[ModelNameEnum.Party]) {
		await copyParty(sourceDm, destDm, schemaMap[ModelNameEnum.Party]);
	}
	if (schemaMap[ModelNameEnum.Item]) {
		await copyItem(sourceDm, destDm, schemaMap[ModelNameEnum.Item]);
	}
	await copyChildTables(sourceDm, destDm, schemaMap);
	await copyOtherTables(sourceDm, destDm, schemaMap);
	await copyTransactionalTables(sourceDm, destDm, schemaMap);
	if (schemaMap[ModelNameEnum.AccountingLedgerEntry]) {
		await copyLedgerEntries(
			sourceDm,
			destDm,
			schemaMap[ModelNameEnum.AccountingLedgerEntry],
		);
	}
	if (schemaMap[ModelNameEnum.NumberSeries]) {
		await copyNumberSeries(
			sourceDm,
			destDm,
			schemaMap[ModelNameEnum.NumberSeries],
		);
	}
	await sql`PRAGMA foreign_keys=ON`.execute(destDm.db.db);
}

async function copyNumberSeries(
	sourceDm: DatabaseManager,
	destDm: DatabaseManager,
	schema: Schema,
) {
	const values = sourceDm.db
		? ((await sourceDm.db.getAll(ModelNameEnum.NumberSeries)) as RawValueMap[])
		: [];

	const refMap = invertMap(defaultNumberSeriesMap);

	for (const value of values) {
		if (value.referenceType) {
			continue;
		}

		const name = value.name as string;
		const referenceType = refMap[name];
		if (!referenceType) {
			value.name = "";
			continue;
		}

		const sourceDb = sourceDm.db?.db;
		if (!sourceDb) continue;

		const result = await sql<{ idx: number }>`
      select cast(substr(name, ${name.length + 1}) as int) as idx
      from ${sql.table(referenceType)} 
      order by idx desc 
      limit 1`.execute(sourceDb);

		const indices = result.rows || [];

		value.start = 1001;
		value.current = indices[0]?.idx ?? value.current ?? value.start;
		value.referenceType = referenceType;
	}

	await copyValues(
		destDm,
		ModelNameEnum.NumberSeries,
		values.filter((v) => v.name),
		[],
		{},
		schema,
	);
}

async function copyLedgerEntries(
	sourceDm: DatabaseManager,
	destDm: DatabaseManager,
	schema: Schema,
) {
	if (!sourceDm.db) return;
	const values = (await sourceDm.db.getAll(
		ModelNameEnum.AccountingLedgerEntry,
	)) as RawValueMap[];
	await copyValues(
		destDm,
		ModelNameEnum.AccountingLedgerEntry,
		values,
		["description", "againstAccount", "balance"],
		{},
		schema,
	);
}

async function copyOtherTables(
	sourceDm: DatabaseManager,
	destDm: DatabaseManager,
	schemaMap: SchemaMap,
) {
	const schemaNames = [
		ModelNameEnum.Account,
		ModelNameEnum.Currency,
		ModelNameEnum.Address,
		ModelNameEnum.Color,
		ModelNameEnum.Tax,
		ModelNameEnum.PatchRun,
	];

	if (!sourceDm.db) return;
	for (const sn of schemaNames) {
		const values = (await sourceDm.db.getAll(sn)) as RawValueMap[];
		await copyValues(destDm, sn, values, [], {}, schemaMap[sn]);
	}
}

async function copyTransactionalTables(
	sourceDm: DatabaseManager,
	destDm: DatabaseManager,
	schemaMap: SchemaMap,
) {
	const schemaNames = [
		ModelNameEnum.JournalEntry,
		ModelNameEnum.Payment,
		ModelNameEnum.SalesInvoice,
		ModelNameEnum.PurchaseInvoice,
		ModelNameEnum.SalesQuote,
	];

	if (!sourceDm.db) return;
	for (const sn of schemaNames) {
		const values = (await sourceDm.db.getAll(sn)) as RawValueMap[];
		for (const v of values) {
			if (getIsNullOrUndef(v.submitted)) v.submitted = 0;
			if (getIsNullOrUndef(v.cancelled)) v.cancelled = 0;

			if (!v.numberSeries) {
				v.numberSeries = defaultNumberSeriesMap[sn];
			}

			if (v.customer) v.party = v.customer;
			if (v.supplier) v.party = v.supplier;
		}
		await copyValues(
			destDm,
			sn,
			values,
			[],
			childTableColumnMap,
			schemaMap[sn],
		);
	}
}

async function copyChildTables(
	sourceDm: DatabaseManager,
	destDm: DatabaseManager,
	schemaMap: SchemaMap,
) {
	const childSchemaNames = Object.keys(schemaMap).filter(
		(sn) => schemaMap[sn]?.isChild,
	);

	if (!sourceDm.db) return;
	for (const sn of childSchemaNames) {
		const values = (await sourceDm.db.getAll(sn)) as RawValueMap[];
		await copyValues(
			destDm,
			sn,
			values,
			[],
			childTableColumnMap,
			schemaMap[sn],
		);
	}
}

async function copyItem(
	sourceDm: DatabaseManager,
	destDm: DatabaseManager,
	schema: Schema,
) {
	if (!sourceDm.db) return;
	const values = (await sourceDm.db.getAll(
		ModelNameEnum.Item,
	)) as RawValueMap[];
	for (const value of values) {
		value.for = "Both";
	}

	await copyValues(destDm, ModelNameEnum.Item, values, [], {}, schema);
}

async function copyParty(
	sourceDm: DatabaseManager,
	destDm: DatabaseManager,
	schema: Schema,
) {
	if (!sourceDm.db) return;
	const values = (await sourceDm.db.getAll(
		ModelNameEnum.Party,
	)) as RawValueMap[];
	for (const value of values) {
		if (Number(value.supplier) === 1) {
			value.customer = "Supplier";
		} else {
			value.customer = "Customer";
		}
	}

	await copyValues(
		destDm,
		ModelNameEnum.Party,
		values,
		["supplier", "addressDisplay"],
		{ customer: "role" },
		schema,
	);
}

async function copySingleValues(
	sourceDm: DatabaseManager,
	destDm: DatabaseManager,
	schemaMap: SchemaMap,
) {
	const singleSchemaNames = Object.keys(schemaMap).filter(
		(k) => schemaMap[k]?.isSingle,
	);

	if (!sourceDm.db?.db) return;

	const results = await sourceDm.db.db
		.selectFrom("SingleValue")
		.selectAll()
		.where("parent", "in", singleSchemaNames)
		.execute();

	await copyValues(
		destDm,
		ModelNameEnum.SingleValue,
		results as unknown as RawValueMap[],
	);
}

async function copyValues(
	destDm: DatabaseManager,
	destTableName: string,
	values: RawValueMap[],
	keysToDelete: string[] = [],
	keyMap: Record<string, string> = {},
	schema?: Schema,
) {
	const targetKeysToDelete = [...keysToDelete, ...ignoreColumns];
	const targetKeyMap = { ...keyMap, ...columnMap };

	const targetValues = values
		.map((sv) => deleteKeys(sv, targetKeysToDelete))
		.map((sv) => changeKeys(sv, targetKeyMap));

	if (schema) {
		for (const v of targetValues) {
			notNullify(v, schema);
		}
	}

	if (schema) {
		const newKeys = schema.fields.map((f) => f.fieldname);
		for (const v of targetValues) {
			deleteOldKeys(v, newKeys);
		}
	}

	if (targetValues.length > 0 && destDm.db?.db) {
		const batchSize = 100;
		for (let i = 0; i < targetValues.length; i += batchSize) {
			const batch = targetValues.slice(i, i + batchSize);
			await destDm.db.db
				.insertInto(destTableName as Extract<keyof DB, string>)
				.values(batch as any)
				.execute();
		}
	}
}

async function getDestinationDM(sourceDbPath: string, countryCode: string) {
	const dir = path.parse(sourceDbPath).dir;
	const dbPath = path.join(dir, "__update_schemas_temp.db");
	const dm = new DatabaseManager();
	await dm._connect(dbPath, countryCode);
	await dm.db?.migrate();
	await dm.db?.truncate();
	return dm;
}

async function getCountryCode(dm: DatabaseManager) {
	if (!dm.db?.db) return "";
	const result = await dm.db.getSingleValues({ fieldname: "country" });
	const country = (result?.[0] as { value?: string })?.value;

	if (!country) {
		return "";
	}

	return getCountryCodeFromCountry(country);
}

function notNullify(map: RawValueMap, schema: Schema) {
	for (const field of schema.fields) {
		if (!field.required || !getIsNullOrUndef(map[field.fieldname])) {
			continue;
		}

		switch (field.fieldtype) {
			case FieldTypeEnum.Float:
			case FieldTypeEnum.Int:
			case FieldTypeEnum.Check:
				map[field.fieldname] = 0;
				break;
			case FieldTypeEnum.Currency:
				map[field.fieldname] = "0.00000000000";
				break;
			case FieldTypeEnum.Table:
				continue;
			default:
				map[field.fieldname] = "";
		}
	}
}

function deleteOldKeys(map: RawValueMap, newKeys: string[]) {
	for (const key of Object.keys(map)) {
		if (newKeys.includes(key)) {
			continue;
		}

		delete map[key];
	}
}

export default { execute, beforeMigrate: true };
