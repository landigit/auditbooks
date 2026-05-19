import fs from 'fs/promises';
import path from 'path';
import { changeKeys, deleteKeys, getIsNullOrUndef, invertMap } from 'utils';
import { getCountryCodeFromCountry } from 'utils/misc';
import { Version } from 'utils/version';
import { ModelNameEnum } from '../../models/types';
import { FieldTypeEnum, Schema, SchemaMap } from '../../schemas/types';
import { DatabaseManager } from '../database/manager';
import { Client } from '@libsql/client';
import { unlinkIfExists } from '../helpers';

const ignoreColumns = ['keywords'];
const columnMap = { creation: 'created', owner: 'createdBy' };
const childTableColumnMap = {
  parenttype: 'parentSchemaName',
  parentfield: 'parentFieldname',
};

const defaultNumberSeriesMap = {
  [ModelNameEnum.Payment]: 'PAY-',
  [ModelNameEnum.JournalEntry]: 'JV-',
  [ModelNameEnum.SalesInvoice]: 'SINV-',
  [ModelNameEnum.PurchaseInvoice]: 'PINV-',
  [ModelNameEnum.SalesQuote]: 'SQUOT-',
} as Record<ModelNameEnum, string>;

async function selectAll(client: Client, tableName: string) {
  try {
    const res = await client.execute(`SELECT * FROM "${tableName}"`);
    return res.rows as any[];
  } catch {
    return [];
  }
}

async function batchInsert(client: Client, tableName: string, values: any[]) {
  if (values.length === 0) return;
  for (const val of values) {
    const columns = Object.keys(val)
      .map((c) => `"${c}"`)
      .join(', ');
    const placeholders = Object.keys(val)
      .map(() => '?')
      .join(', ');
    const args = Object.values(val) as any[];
    await client.execute({
      sql: `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders})`,
      args,
    });
  }
}

async function execute(dm: DatabaseManager) {
  if (dm.db?.dbPath === ':memory:') {
    return;
  }

  const sourceClient = dm.db!.client!;
  const versionRes = await sourceClient.execute({
    sql: `SELECT value FROM "SingleValue" WHERE fieldname = 'version' LIMIT 1`,
    args: [],
  });
  const version = (versionRes.rows[0] as any)?.value;

  /**
   * Versions after this should have the new schemas
   */
  if (version && Version.gt(version, '0.4.3-beta.0')) {
    return;
  }

  // Check if this is a newly initialized database (empty SingleValue table)
  const singlesCountRes = await sourceClient.execute({
    sql: `SELECT count(*) as count FROM "SingleValue"`,
    args: [],
  });
  const singlesCount = Number(singlesCountRes.rows[0]?.count);
  if (singlesCount === 0) {
    return;
  }

  /**
   * Initialize a different db to copy all the updated
   * data into.
   */
  const countryCode = await getCountryCode(sourceClient);
  const destDm = await getDestinationDM(dm.db!.dbPath, countryCode);

  /**
   * Copy data from all the relevant tables
   * the other tables will be empty cause unused.
   */
  try {
    await copyData(sourceClient, destDm.db!.client!, destDm);
  } catch (err) {
    const destPath = destDm.db!.dbPath;
    await destDm.db!.close();
    await unlinkIfExists(destPath);
    throw err;
  }

  /**
   * Version will update when migration completes, this
   * is set to prevent this patch from running again.
   */
  await destDm.db!.update(ModelNameEnum.SystemSettings, {
    version: '0.5.0-beta.0',
  });

  /**
   * Replace the database with the new one.
   */
  await replaceDatabaseCore(dm, destDm);
}

async function replaceDatabaseCore(
  dm: DatabaseManager,
  destDm: DatabaseManager
) {
  const newDbPath = destDm.db!.dbPath; // new db with new schema
  const oldDbPath = dm.db!.dbPath; // old db to be replaced

  // Flush WAL to main db file and release all locks before closing
  try {
    await dm.db!.client?.execute('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {}
  try {
    await destDm.db!.client?.execute('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch {}

  await dm.db!.close();
  await destDm.db!.close();

  // Small delay to allow Windows to fully release file handles after close()
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Delete all old database files (main, wal, shm)
  await unlinkIfExists(oldDbPath);
  await unlinkIfExists(oldDbPath + '-wal');
  await unlinkIfExists(oldDbPath + '-shm');

  // Delete any temporary wal/shm files before renaming
  await unlinkIfExists(newDbPath + '-wal');
  await unlinkIfExists(newDbPath + '-shm');

  await fs.rename(newDbPath, oldDbPath);
  await dm._connect(oldDbPath);
}

async function copyData(
  sourceClient: Client,
  destClient: Client,
  destDm: DatabaseManager
) {
  const schemaMap = destDm.getSchemaMap();
  await destClient.execute('PRAGMA foreign_keys=OFF');
  await copySingleValues(sourceClient, destClient, schemaMap);
  await copyParty(sourceClient, destClient, schemaMap[ModelNameEnum.Party]!);
  await copyItem(sourceClient, destClient, schemaMap[ModelNameEnum.Item]!);
  await copyChildTables(sourceClient, destClient, schemaMap);
  await copyOtherTables(sourceClient, destClient, schemaMap);
  await copyTransactionalTables(sourceClient, destClient, schemaMap);
  await copyLedgerEntries(
    sourceClient,
    destClient,
    schemaMap[ModelNameEnum.AccountingLedgerEntry]!
  );
  await copyNumberSeries(
    sourceClient,
    destClient,
    schemaMap[ModelNameEnum.NumberSeries]!
  );
  await destClient.execute('PRAGMA foreign_keys=ON');
}

async function copyNumberSeries(
  sourceClient: Client,
  destClient: Client,
  schema: Schema
) {
  const values = await selectAll(sourceClient, ModelNameEnum.NumberSeries);
  const refMap = invertMap(defaultNumberSeriesMap);

  for (const value of values) {
    if (value.referenceType) {
      continue;
    }

    const name = value.name as string;
    const referenceType = refMap[name];
    if (!referenceType) {
      delete value.name;
      continue;
    }

    const indicesRes = await sourceClient.execute({
      sql: `
        select cast(substr(name, ?) as int) as idx
        from "${referenceType}" 
        order by idx desc 
        limit 1`,
      args: [name.length + 1],
    });
    const indices = indicesRes.rows;

    value.start = 1001;
    value.current = indices[0]?.idx ?? value.current ?? value.start;
    value.referenceType = referenceType;
  }

  await copyValues(
    destClient,
    ModelNameEnum.NumberSeries,
    values.filter((v) => v.name),
    [],
    {},
    schema
  );
}

async function copyLedgerEntries(
  sourceClient: Client,
  destClient: Client,
  schema: Schema
) {
  const values = await selectAll(
    sourceClient,
    ModelNameEnum.AccountingLedgerEntry
  );
  await copyValues(
    destClient,
    ModelNameEnum.AccountingLedgerEntry,
    values,
    ['description', 'againstAccount', 'balance'],
    {},
    schema
  );
}

async function copyOtherTables(
  sourceClient: Client,
  destClient: Client,
  schemaMap: SchemaMap
) {
  const schemaNames = [
    ModelNameEnum.Account,
    ModelNameEnum.Currency,
    ModelNameEnum.Address,
    ModelNameEnum.Color,
    ModelNameEnum.Tax,
    ModelNameEnum.PatchRun,
  ];

  for (const sn of schemaNames) {
    const values = await selectAll(sourceClient, sn);
    await copyValues(destClient, sn, values, [], {}, schemaMap[sn]);
  }
}

async function copyTransactionalTables(
  sourceClient: Client,
  destClient: Client,
  schemaMap: SchemaMap
) {
  const schemaNames = [
    ModelNameEnum.JournalEntry,
    ModelNameEnum.Payment,
    ModelNameEnum.SalesInvoice,
    ModelNameEnum.PurchaseInvoice,
    ModelNameEnum.SalesQuote,
  ];

  for (const sn of schemaNames) {
    const values = await selectAll(sourceClient, sn);
    values.forEach((v) => {
      if (!v.submitted) {
        v.submitted = 0;
      }

      if (!v.cancelled) {
        v.cancelled = 0;
      }

      if (!v.numberSeries) {
        v.numberSeries = defaultNumberSeriesMap[sn];
      }

      if (v.customer) {
        v.party = v.customer;
      }

      if (v.supplier) {
        v.party = v.supplier;
      }
    });
    await copyValues(
      destClient,
      sn,
      values,
      [],
      childTableColumnMap,
      schemaMap[sn]
    );
  }
}

async function copyChildTables(
  sourceClient: Client,
  destClient: Client,
  schemaMap: SchemaMap
) {
  const childSchemaNames = Object.keys(schemaMap).filter(
    (sn) => schemaMap[sn]?.isChild
  );

  for (const sn of childSchemaNames) {
    const values = await selectAll(sourceClient, sn);
    await copyValues(
      destClient,
      sn,
      values,
      [],
      childTableColumnMap,
      schemaMap[sn]
    );
  }
}

async function copyItem(
  sourceClient: Client,
  destClient: Client,
  schema: Schema
) {
  const values = await selectAll(sourceClient, ModelNameEnum.Item);
  values.forEach((value) => {
    value.for = 'Both';
  });

  await copyValues(destClient, ModelNameEnum.Item, values, [], {}, schema);
}

async function copyParty(
  sourceClient: Client,
  destClient: Client,
  schema: Schema
) {
  const values = await selectAll(sourceClient, ModelNameEnum.Party);
  values.forEach((value) => {
    // customer will be mapped onto role
    if (Number(value.supplier) === 1) {
      value.customer = 'Supplier';
    } else {
      value.customer = 'Customer';
    }
  });

  await copyValues(
    destClient,
    ModelNameEnum.Party,
    values,
    ['supplier', 'addressDisplay'],
    { customer: 'role' },
    schema
  );
}

async function copySingleValues(
  sourceClient: Client,
  destClient: Client,
  schemaMap: SchemaMap
) {
  const singleSchemaNames = Object.keys(schemaMap).filter(
    (k) => schemaMap[k]?.isSingle
  );

  const placeholders = singleSchemaNames.map(() => '?').join(', ');
  const singleValuesRes = await sourceClient.execute({
    sql: `SELECT * FROM "SingleValue" WHERE "parent" IN (${placeholders})`,
    args: singleSchemaNames,
  });
  const singleValues = singleValuesRes.rows;

  await copyValues(destClient, ModelNameEnum.SingleValue, singleValues);
}

async function copyValues(
  destClient: Client,
  destTableName: string,
  values: any[],
  keysToDelete: string[] = [],
  keyMap: Record<string, string> = {},
  schema?: Schema
) {
  keysToDelete = [...keysToDelete, ...ignoreColumns];
  keyMap = { ...keyMap, ...columnMap };

  values = values.map((sv) => deleteKeys(sv, keysToDelete));
  values = values.map((sv) => changeKeys(sv, keyMap));

  if (schema) {
    values.forEach((v) => notNullify(v, schema));
  }

  if (schema) {
    const newKeys = schema?.fields.map((f) => f.fieldname);
    values.forEach((v) => deleteOldKeys(v, newKeys));
  }

  await batchInsert(destClient, destTableName, values);
}

async function getDestinationDM(sourceDbPath: string, countryCode: string) {
  const dir = path.parse(sourceDbPath).dir;
  const dbPath = path.join(dir, '__update_schemas_temp.db');
  const dm = new DatabaseManager();
  await dm._connect(dbPath, countryCode);
  await dm.db!.migrate();
  await dm.db!.truncate();
  return dm;
}

async function getCountryCode(client: Client) {
  try {
    const countryRes = await client.execute({
      sql: `SELECT value FROM "SingleValue" WHERE fieldname = 'country' LIMIT 1`,
      args: [],
    });
    const country = (countryRes.rows[0] as any)?.value;
    if (!country) {
      return '';
    }
    return getCountryCodeFromCountry(country);
  } catch {
    return '';
  }
}

function notNullify(map: any, schema: Schema) {
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
        map[field.fieldname] = '0.00000000000';
        break;
      case FieldTypeEnum.Table:
        continue;
      default:
        map[field.fieldname] = '';
    }
  }
}

function deleteOldKeys(map: any, newKeys: string[]) {
  for (const key of Object.keys(map)) {
    if (newKeys.includes(key)) {
      continue;
    }

    delete map[key];
  }
}

export default { execute, beforeMigrate: true };
