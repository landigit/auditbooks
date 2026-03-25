import { sql } from 'kysely';
import { FieldTypeEnum, type RawValue, type Schema } from 'schemas/types';
import { getMapFromList, getValueMapFromList, sleep } from 'utils';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { getDefaultMetaFieldValueMap, sqliteTypeMap } from '../../helpers';
import DatabaseCore from '../core';
import type { FieldValueMap, SqliteTableInfo } from '../types';
import {
  type BaseMetaKey,
  assertDoesNotThrow,
  assertThrows,
  getBuiltTestSchemaMap,
} from './helpers';

const schemaMap = getBuiltTestSchemaMap();

async function getDb(shouldMigrate = true): Promise<DatabaseCore> {
  const db = new DatabaseCore();
  await db.connect();
  db.setSchemaMap(schemaMap);
  if (shouldMigrate) {
    await db.migrate();
  }
  return db;
}

test('db init, migrate, close', async () => {
  const db = new DatabaseCore();
  expect(db.dbPath).toBe(':memory:');

  const schemaMap = getBuiltTestSchemaMap();
  db.setSchemaMap(schemaMap);

  expect(db.schemaMap).toBe(schemaMap);

  await assertDoesNotThrow(async () => await db.connect());
  expect(db.db).not.toBeUndefined();

  await assertDoesNotThrow(async () => await db.migrate());
  await assertDoesNotThrow(async () => await db.close());
});

test('Pre Migrate TableInfo', async () => {
  const db = await getDb(false);
  if (db.db) {
    for (const schemaName in schemaMap) {
      const result =
        await sql<SqliteTableInfo>`pragma table_info(${sql.table(schemaName)})`.execute(
          db.db
        );
      expect(result.rows.length).toBe(0);
    }
  }
  await db.close();
});

test('Post Migrate TableInfo', async () => {
  const db = await getDb();
  if (db.db) {
    for (const schemaName in schemaMap) {
      const schema = schemaMap[schemaName] as Schema;
      const fieldMap = getMapFromList(schema.fields, 'fieldname');
      const result =
        await sql<SqliteTableInfo>`pragma table_info(${sql.table(schemaName)})`.execute(
          db.db
        );
      const columns = result.rows;

      let columnCount = schema.fields.filter(
        (f) => f.fieldtype !== FieldTypeEnum.Table && !f.computed
      ).length;

      if (schema.isSingle) {
        columnCount = 0;
      }

      expect(columns.length).toBe(columnCount);

      for (const column of columns) {
        const field = fieldMap[column.name];
        const dbColType = sqliteTypeMap[field.fieldtype];

        expect(column.name).toBe(field.fieldname);
        expect(column.type.toLowerCase()).toBe(dbColType);

        if (field.required !== undefined) {
          expect(!!column.notnull).toBe(field.required);
        } else {
          expect(column.notnull).toBe(0);
        }

        if (column.dflt_value === null) {
          expect(field.default).toBeUndefined();
        } else {
          const actualDefault =
            column.dflt_value.startsWith("'") && column.dflt_value.endsWith("'")
              ? column.dflt_value.slice(1, -1)
              : column.dflt_value;
          expect(actualDefault).toBe(String(field.default));
        }
      }
    }
  }
  await db.close();
});

test('exists() before insertion', async () => {
  const db = await getDb();
  for (const schemaName in schemaMap) {
    const doesExist = await db.exists(schemaName);
    if (['SingleValue', 'SystemSettings'].includes(schemaName)) {
      expect(doesExist).toBe(true);
    } else {
      expect(doesExist).toBe(false);
    }
  }
  await db.close();
});

test('CRUD single values', async () => {
  const db = await getDb();
  if (db.db) {
    /**
     * Checking default values which are created when db.migrate
     * takes place.
     */
    const result = await sql<
      Record<string, RawValue>
    >`select * from SingleValue`.execute(db.db);
    const rows = result.rows;

    const defaultMap = getValueMapFromList(
      (schemaMap.SystemSettings as Schema).fields,
      'fieldname',
      'default'
    );
    for (const row of rows) {
      expect(row.value).toBe(defaultMap[row.fieldname as string]);
    }

    /**
     * Insertion and updation for single values call the same function.
     */
    let localeRow = rows.find((r) => r.fieldname === 'locale');
    const localeEntryName = localeRow?.name as string;
    const localeEntryCreated = localeRow?.created as string;

    let locale = 'hi-IN';
    await db.insert('SystemSettings', { locale });
    const result2 = await sql<
      Record<string, RawValue>
    >`select * from SingleValue`.execute(db.db);
    const rows2 = result2.rows;
    localeRow = rows2.find((r) => r.fieldname === 'locale');

    expect(localeEntryName).not.toBeUndefined();
    expect(rows2.length).toBe(2);
    expect(localeRow?.name as string).toBe(localeEntryName);
    expect(localeRow?.value).toBe(locale);
    expect(localeRow?.created).toBe(localeEntryCreated);

    /**
     * Update
     */
    locale = 'ca-ES';
    await db.update('SystemSettings', { locale });
    const result3 = await sql<
      Record<string, RawValue>
    >`select * from SingleValue`.execute(db.db);
    const rows3 = result3.rows;
    localeRow = rows3.find((r) => r.fieldname === 'locale');

    expect(localeEntryName).not.toBeUndefined();
    expect(rows3.length).toBe(2);
    expect(localeRow?.name as string).toBe(localeEntryName);
    expect(localeRow?.value).toBe(locale);
    expect(localeRow?.created).toBe(localeEntryCreated);

    /**
     * Delete
     */
    await db.delete('SystemSettings', 'locale');
    const result4 = await sql<FieldValueMap>`select * from SingleValue`.execute(
      db.db
    );
    expect(result4.rows.length).toBe(1);

    await db.delete('SystemSettings', 'dateFormat');
    const result5 = await sql<FieldValueMap>`select * from SingleValue`.execute(
      db.db
    );
    expect(result5.rows.length).toBe(0);

    const dateFormat = 'dd/mm/yy';
    await db.insert('SystemSettings', { locale, dateFormat });
    const result6 = await sql<FieldValueMap>`select * from SingleValue`.execute(
      db.db
    );
    expect(result6.rows.length).toBe(2);

    /**
     * Read
     */
    const svl = await db.getSingleValues('locale', 'dateFormat');
    expect(svl.length).toBe(2);
    for (const sv of svl) {
      expect(sv.parent).toBe('SystemSettings');
      expect(sv.value).toBe(
        { locale, dateFormat }[sv.fieldname as 'locale' | 'dateFormat']
      );

      /**
       * get
       */
      const svlMap = await db.get('SystemSettings');
      expect(Object.keys(svlMap).length).toBe(2);
      expect(svlMap.locale).toBe(locale);
      expect(svlMap.dateFormat).toBe(dateFormat);
    }
  }
  await db.close();
});

test('CRUD nondependent schema', async () => {
  const db = await getDb();
  const schemaName = 'Customer';
  if (db.db) {
    let result =
      await sql<FieldValueMap>`select * from ${sql.table(schemaName)}`.execute(
        db.db
      );
    expect(result.rows.length).toBe(0);

    /**
     * Insert
     */
    const metaValues = getDefaultMetaFieldValueMap();
    const name = 'John Thoe';

    await assertThrows(
      async () => await db.insert(schemaName, { name }),
      'insert() did not throw without meta values'
    );

    const updateMap = Object.assign({}, metaValues, { name });
    await db.insert(schemaName, updateMap);
    result =
      await sql<FieldValueMap>`select * from ${sql.table(schemaName)}`.execute(
        db.db
      );
    let firstRow = result.rows[0];
    expect(result.rows.length).toBe(1);
    expect(firstRow.name).toBe(name);
    expect(firstRow.email).toBe(null);

    for (const key in metaValues) {
      expect(firstRow[key]).toBe(metaValues[key as BaseMetaKey]);
    }

    /**
     * Update
     */
    const email = 'john@thoe.com';
    await sleep(1);
    await db.update(schemaName, {
      name,
      email,
      modified: new Date().toISOString(),
    });
    result =
      await sql<FieldValueMap>`select * from ${sql.table(schemaName)}`.execute(
        db.db
      );
    firstRow = result.rows[0];
    expect(result.rows.length).toBe(1);
    expect(firstRow.name).toBe(name);
    expect(firstRow.email).toBe(email);

    const phone = '8149133530';
    await sleep(1);
    await db.update(schemaName, {
      name,
      phone,
      modified: new Date().toISOString(),
    });
    result =
      await sql<FieldValueMap>`select * from ${sql.table(schemaName)}`.execute(
        db.db
      );
    firstRow = result.rows[0];
    expect(firstRow.email).toBe(email);
    expect(firstRow.phone).toBe(phone);

    for (const key in metaValues) {
      const val = firstRow[key];
      const expected = metaValues[key as BaseMetaKey];
      if (key !== 'modified') {
        expect(val).toBe(expected);
      } else {
        expect(val).not.toBe(expected);
      }
    }

    /**
     * Delete
     */
    await db.delete(schemaName, name);
    result =
      await sql<FieldValueMap>`select * from ${sql.table(schemaName)}`.execute(
        db.db
      );
    expect(result.rows.length).toBe(0);

    /**
     * Get
     */
    let fvMap = await db.get(schemaName, name);
    expect(Object.keys(fvMap).length).toBe(0);

    /**
     * > 1 entries
     */
    const cOne = { name: 'John Whoe', ...getDefaultMetaFieldValueMap() };
    const cTwo = { name: 'Jane Whoe', ...getDefaultMetaFieldValueMap() };

    await db.insert(schemaName, cOne);
    await db.insert(schemaName, cTwo);
    result =
      await sql<FieldValueMap>`select * from ${sql.table(schemaName)}`.execute(
        db.db
      );
    const rows = result.rows;
    expect(rows.length).toBe(2);

    const cs = [cOne, cTwo];
    for (let i = 0; i < cs.length; i++) {
      for (const k in cs[i]) {
        // biome-ignore lint/suspicious/noExplicitAny: <reason>
        expect(rows[i][k]).toBe((cs as any)[i][k]);
      }
    }

    // Update
    await db.update(schemaName, { name: cOne.name, email });
    const cOneEmail = await db.get(schemaName, cOne.name, 'email');
    expect(cOneEmail.email).toBe(email);

    // Rename
    const newName = 'Johnny Whoe';
    await db.rename(schemaName, cOne.name, newName);

    fvMap = await db.get(schemaName, cOne.name);
    expect(Object.keys(fvMap).length).toBe(0);

    fvMap = await db.get(schemaName, newName);
    expect(fvMap.email).toBe(email);

    // Delete
    await db.delete(schemaName, newName);
    result =
      await sql<FieldValueMap>`select * from ${sql.table(schemaName)}`.execute(
        db.db
      );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].name).toBe(cTwo.name);
  }
  await db.close();
});

test('CRUD dependent schema', async () => {
  const db = await getDb();

  const CustomerSchema = 'Customer';
  const SalesInvoice = 'SalesInvoice';
  const SalesInvoiceItem = 'SalesInvoiceItem';

  const customer: FieldValueMap = {
    name: 'John Whoe',
    email: 'john@whoe.com',
    ...getDefaultMetaFieldValueMap(),
  };

  const invoice: FieldValueMap = {
    name: 'SINV-1001',
    date: '2022-01-21',
    customer: customer.name,
    account: 'Debtors',
    submitted: false,
    cancelled: false,
    ...getDefaultMetaFieldValueMap(),
  };

  await assertThrows(
    async () => await db.insert(SalesInvoice, invoice),
    'foreign key constraint fail failed'
  );

  await assertDoesNotThrow(async () => {
    await db.insert(CustomerSchema, customer);
    await db.insert(SalesInvoice, invoice);
  });

  await assertThrows(
    async () => await db.delete(CustomerSchema, customer.name as string),
    'foreign key constraint fail failed'
  );

  await assertDoesNotThrow(async () => {
    await db.delete(SalesInvoice, invoice.name as string);
    await db.delete(CustomerSchema, customer.name as string);
  });

  await db.insert(CustomerSchema, customer);
  await db.insert(SalesInvoice, invoice);

  let fvMap = await db.get(SalesInvoice, invoice.name as string);
  for (const key in invoice) {
    let expected = invoice[key];
    if (typeof expected === 'boolean') {
      expected = +expected;
    }
    expect(fvMap[key]).toBe(expected);
  }

  expect((fvMap.items as unknown[])?.length).toBe(0);

  const items: FieldValueMap[] = [
    {
      item: 'Bottle Caps',
      quantity: 2,
      rate: 100,
      amount: 200,
    },
  ];

  await assertThrows(
    async () => await db.insert(SalesInvoice, { name: invoice.name, items }),
    'invoice insertion with ct did not fail'
  );
  await assertDoesNotThrow(
    async () => await db.update(SalesInvoice, { name: invoice.name, items }),
    'ct insertion failed'
  );

  fvMap = await db.get(SalesInvoice, invoice.name as string);
  const ct = fvMap.items as FieldValueMap[];
  expect(ct.length).toBe(1);
  expect(ct[0].parent).toBe(invoice.name);
  expect(ct[0].parentFieldname).toBe('items');
  expect(ct[0].parentSchemaName).toBe(SalesInvoice);

  for (const key in items[0]) {
    expect(ct[0][key]).toBe(items[0][key]);
  }

  items.push({
    item: 'Mentats',
    quantity: 4,
    rate: 200,
    amount: 800,
  });
  await assertDoesNotThrow(
    async () => await db.update(SalesInvoice, { name: invoice.name, items })
  );

  let rows = await db.getAll(SalesInvoiceItem, {
    fields: ['item', 'quantity', 'rate', 'amount'],
  });
  expect(rows.length).toBe(2);

  for (let i = 0; i < rows.length; i++) {
    for (const key in rows[i]) {
      expect(rows[i][key]).toBe(items[i][key]);
    }
  }

  invoice.date = '2022-04-01';
  invoice.modified = new Date().toISOString();
  await db.update('SalesInvoice', {
    name: invoice.name,
    date: invoice.date,
    modified: invoice.modified,
  });

  if (db.db) {
    const result =
      await sql<FieldValueMap>`select * from SalesInvoiceItem`.execute(db.db);
    expect(result.rows.length).toBe(2);
  }

  await db.delete(SalesInvoice, invoice.name as string);
  rows = await db.getAll(SalesInvoiceItem);
  expect(rows.length).toBe(0);

  await db.close();
});

test('db deleteAll', async () => {
  const db = await getDb();

  const emailOne = 'one@temp.com';
  const emailTwo = 'two@temp.com';
  const emailThree = 'three@temp.com';

  const phoneOne = '1';
  const phoneTwo = '2';

  const customers = [
    { name: 'customer-a', phone: phoneOne, email: emailOne },
    { name: 'customer-b', phone: phoneOne, email: emailOne },
    { name: 'customer-c', phone: phoneOne, email: emailTwo },
    { name: 'customer-d', phone: phoneOne, email: emailTwo },
    { name: 'customer-e', phone: phoneTwo, email: emailTwo },
    { name: 'customer-f', phone: phoneTwo, email: emailThree },
    { name: 'customer-g', phone: phoneTwo, email: emailThree },
  ];

  for (const { name, email, phone } of customers) {
    await db.insert('Customer', {
      name,
      email,
      phone,
      ...getDefaultMetaFieldValueMap(),
    });
  }

  expect((await db.getAll('Customer')).length).toBe(customers.length);

  expect(await db.deleteAll('Customer', { email: emailOne })).toBe(
    customers.filter((c) => c.email === emailOne).length
  );
  expect(
    (await db.getAll('Customer', { filters: { email: emailOne } })).length
  ).toBe(0);

  expect(
    await db.deleteAll('Customer', { email: emailTwo, phone: phoneTwo })
  ).toBe(
    customers.filter(
      ({ phone, email }) => email === emailTwo && phone === phoneTwo
    ).length
  );
  expect(
    await db.deleteAll('Customer', { email: emailTwo, phone: phoneTwo })
  ).toBe(0);

  expect(
    await db.deleteAll('Customer', { email: ['in', [emailTwo, emailThree]] })
  ).toBe(
    customers.filter(
      ({ email, phone }) =>
        [emailTwo, emailThree].includes(email) &&
        !(phone === phoneTwo && email === emailTwo)
    ).length
  );
  expect(
    (
      await db.getAll('Customer', {
        filters: { email: ['in', [emailTwo, emailThree]] },
      })
    ).length
  ).toBe(0);

  await db.close();
});
