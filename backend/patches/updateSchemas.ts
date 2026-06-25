import fs from 'fs/promises';
import { RawValueMap } from 'fyo/core/types';
import { Kysely, sql } from 'kysely';
import { createClient } from '@libsql/client';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import path from 'path';
import { changeKeys, deleteKeys, getIsNullOrUndef, invertMap } from 'utils';
import { getCountryCodeFromCountry } from 'utils/misc';
import { Version } from 'utils/version';
import { ModelNameEnum } from '../../models/types';
import { FieldTypeEnum, Schema, SchemaMap } from '../../schemas/types';
import { DatabaseManager } from '../database/manager';
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

async function execute(dm: DatabaseManager) {
  if (dm.db?.dbPath === ':memory:') {
    return;
  }

  const sourceClient = createClient({ url: `file:${dm.db!.dbPath}` });
  const sourceKysely = new Kysely<any>({
    dialect: new LibsqlDialect({ client: sourceClient }),
  });

  const versionRow = await sourceKysely
    .selectFrom('SingleValue')
    .select('value')
    .where('fieldname', '=', 'version')
    .executeTakeFirst();
  const version = versionRow?.value;

  /**
   * Versions after this should have the new schemas
   */

  if (version && Version.gt(version, '0.4.3-beta.0')) {
    await sourceKysely.destroy();
    return;
  }

  /**
   * Initialize a different db to copy all the updated
   * data into.
   */
  const countryCode = await getCountryCode(sourceKysely);
  const destDm = await getDestinationDM(dm.db!.dbPath, countryCode);
  const destKysely = destDm.db!.kysely;

  /**
   * Copy data from all the relevant tables
   * the other tables will be empty cause unused.
   */
  try {
    await copyData(sourceKysely, destKysely, destDm);
  } catch (err) {
    await sourceKysely.destroy();
    const destPath = destDm.db!.dbPath;
    await destDm.db!.close();
    await fs.unlink(destPath);
    throw err;
  }

  await sourceKysely.destroy();

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

  await dm.db!.close();
  await destDm.db!.close();
  await fs.unlink(oldDbPath);
  await fs.rename(newDbPath, oldDbPath);
  await dm._connect(oldDbPath);
}

async function copyData(
  sourceKysely: any,
  destKysely: any,
  destDm: DatabaseManager
) {
  const schemaMap = destDm.getSchemaMap();
  await sql`PRAGMA foreign_keys=OFF`.execute(destKysely);
  await copySingleValues(sourceKysely, destKysely, schemaMap);
  await copyParty(sourceKysely, destKysely, schemaMap[ModelNameEnum.Party]!);
  await copyItem(sourceKysely, destKysely, schemaMap[ModelNameEnum.Item]!);
  await copyChildTables(sourceKysely, destKysely, schemaMap);
  await copyOtherTables(sourceKysely, destKysely, schemaMap);
  await copyTransactionalTables(sourceKysely, destKysely, schemaMap);
  await copyLedgerEntries(
    sourceKysely,
    destKysely,
    schemaMap[ModelNameEnum.AccountingLedgerEntry]!
  );
  await copyNumberSeries(
    sourceKysely,
    destKysely,
    schemaMap[ModelNameEnum.NumberSeries]!
  );
  await sql`PRAGMA foreign_keys=ON`.execute(destKysely);
}

async function copyNumberSeries(
  sourceKysely: any,
  destKysely: any,
  schema: Schema
) {
  const values = (await sourceKysely
    .selectFrom(ModelNameEnum.NumberSeries)
    .selectAll()
    .execute()) as RawValueMap[];

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

    const indicesResult = await sql<any>`
      select cast(substr(name, ${name.length + 1}) as int) as idx
      from ${sql.raw(referenceType)}
      order by idx desc
      limit 1
    `.execute(sourceKysely);
    const indices = indicesResult.rows;

    value.start = 1001;
    value.current = indices[0]?.idx ?? value.current ?? value.start;
    value.referenceType = referenceType;
  }

  await copyValues(
    destKysely,
    ModelNameEnum.NumberSeries,
    values.filter((v) => v.name),
    [],
    {},
    schema
  );
}

async function copyLedgerEntries(
  sourceKysely: any,
  destKysely: any,
  schema: Schema
) {
  const values = (await sourceKysely
    .selectFrom(ModelNameEnum.AccountingLedgerEntry)
    .selectAll()
    .execute()) as RawValueMap[];
  await copyValues(
    destKysely,
    ModelNameEnum.AccountingLedgerEntry,
    values,
    ['description', 'againstAccount', 'balance'],
    {},
    schema
  );
}

async function copyOtherTables(
  sourceKysely: any,
  destKysely: any,
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
    const values = (await sourceKysely
      .selectFrom(sn)
      .selectAll()
      .execute()) as RawValueMap[];
    await copyValues(destKysely, sn, values, [], {}, schemaMap[sn]);
  }
}

async function copyTransactionalTables(
  sourceKysely: any,
  destKysely: any,
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
    const values = (await sourceKysely
      .selectFrom(sn)
      .selectAll()
      .execute()) as RawValueMap[];
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
      destKysely,
      sn,
      values,
      [],
      childTableColumnMap,
      schemaMap[sn]
    );
  }
}

async function copyChildTables(
  sourceKysely: any,
  destKysely: any,
  schemaMap: SchemaMap
) {
  const childSchemaNames = Object.keys(schemaMap).filter(
    (sn) => schemaMap[sn]?.isChild
  );

  for (const sn of childSchemaNames) {
    const values = (await sourceKysely
      .selectFrom(sn)
      .selectAll()
      .execute()) as RawValueMap[];
    await copyValues(
      destKysely,
      sn,
      values,
      [],
      childTableColumnMap,
      schemaMap[sn]
    );
  }
}

async function copyItem(sourceKysely: any, destKysely: any, schema: Schema) {
  const values = (await sourceKysely
    .selectFrom(ModelNameEnum.Item)
    .selectAll()
    .execute()) as RawValueMap[];
  values.forEach((value) => {
    value.for = 'Both';
  });

  await copyValues(destKysely, ModelNameEnum.Item, values, [], {}, schema);
}

async function copyParty(sourceKysely: any, destKysely: any, schema: Schema) {
  const values = (await sourceKysely
    .selectFrom(ModelNameEnum.Party)
    .selectAll()
    .execute()) as RawValueMap[];
  values.forEach((value) => {
    // customer will be mapped onto role
    if (Number(value.supplier) === 1) {
      value.customer = 'Supplier';
    } else {
      value.customer = 'Customer';
    }
  });

  await copyValues(
    destKysely,
    ModelNameEnum.Party,
    values,
    ['supplier', 'addressDisplay'],
    { customer: 'role' },
    schema
  );
}

async function copySingleValues(
  sourceKysely: any,
  destKysely: any,
  schemaMap: SchemaMap
) {
  const singleSchemaNames = Object.keys(schemaMap).filter(
    (k) => schemaMap[k]?.isSingle
  );
  const singleValues = (await sourceKysely
    .selectFrom(ModelNameEnum.SingleValue)
    .selectAll()
    .where('parent', 'in', singleSchemaNames)
    .execute()) as RawValueMap[];
  await copyValues(destKysely, ModelNameEnum.SingleValue, singleValues);
}

async function copyValues(
  destKysely: any,
  destTableName: string,
  values: RawValueMap[],
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

  if (values.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      await destKysely.insertInto(destTableName).values(chunk).execute();
    }
  }
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

async function getCountryCode(sourceKysely: any) {
  const row = (await sourceKysely
    .selectFrom('SingleValue')
    .select('value')
    .where('fieldname', '=', 'country')
    .executeTakeFirst()) as { value: string } | undefined;
  const country = row?.value;

  if (!country) {
    return '';
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
        map[field.fieldname] = '0.00000000000';
        break;
      case FieldTypeEnum.Table:
        continue;
      default:
        map[field.fieldname] = '';
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
