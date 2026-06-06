import { FieldTypeEnum, RawValue, Schema } from "schemas/types";
import { describe, expect, test } from "@rstest/core";
import { getMapFromList, getValueMapFromList, sleep } from "utils";
import { getDefaultMetaFieldValueMap, sqliteTypeMap } from "../../helpers";
import DatabaseCore from "../core";
import { FieldValueMap, SqliteTableInfo } from "../types";
import {
  assertDoesNotThrow,
  assertThrows,
  BaseMetaKey,
  getBuiltTestSchemaMap,
} from "./helpers";

const schemaMap = getBuiltTestSchemaMap();

async function getDb(shouldMigrate: boolean = true): Promise<DatabaseCore> {
  const db = new DatabaseCore();
  await db.connect();
  db.setSchemaMap(schemaMap);
  if (shouldMigrate) {
    await db.migrate();
  }
  return db;
}

describe("DatabaseCore Tests", () => {
  test("db init, migrate, close", async () => {
    const db = new DatabaseCore();
    expect(db.dbPath).toBe(":memory:");

    const schemaMap = getBuiltTestSchemaMap();
    db.setSchemaMap(schemaMap);

    expect(db.schemaMap).toBe(schemaMap);

    await assertDoesNotThrow(async () => await db.connect());
    expect(db.client).not.toBeUndefined();

    await assertDoesNotThrow(async () => await db.migrate());
    await assertDoesNotThrow(async () => await db.close());
  });

  test("Pre Migrate TableInfo", async () => {
    const db = await getDb(false);
    for (const schemaName in schemaMap) {
      const columnsRes = await db.client!.execute(
        `pragma table_info("${schemaName}")`,
      );
      expect(columnsRes.rows.length).toBe(0);
    }
    await db.close();
  });

  test("Post Migrate TableInfo", async () => {
    const db = await getDb();
    for (const schemaName in schemaMap) {
      const schema = Reflect.get(schemaMap, schemaName) as Schema;
      const fieldMap = getMapFromList(schema.fields, "fieldname");
      const columnsRes = await db.client!.execute(
        `pragma table_info("${schemaName}")`,
      );
      const columns = columnsRes.rows as unknown as SqliteTableInfo[];

      let columnCount = schema.fields.filter(
        (f) => f.fieldtype !== FieldTypeEnum.Table,
      ).length;

      if (schema.isSingle) {
        columnCount = 0;
      }

      expect(columns.length).toBe(columnCount);

      for (const column of columns) {
        const field = Reflect.get(fieldMap, column.name);
        const dbColType = Reflect.get(sqliteTypeMap, field.fieldtype);

        expect(column.name).toBe(field.fieldname);

        const expectedTypes: string[] = [dbColType];
        if (
          dbColType === "datetime" ||
          dbColType === "date" ||
          dbColType === "time"
        ) {
          expectedTypes.push("numeric", "text");
        }
        if (dbColType === "boolean") {
          expectedTypes.push("numeric", "integer");
        }
        if (dbColType === "float") {
          expectedTypes.push("real");
        }
        expect(expectedTypes).toContain(column.type.toLowerCase());

        if (field.required !== undefined) {
          expect(!!column.notnull).toBe(field.required);
        } else {
          expect(column.notnull).toBe(0);
        }

        if (column.dflt_value === null) {
          expect(field.default).toBeUndefined();
        } else {
          const cleanedDflt = column.dflt_value.replace(/^['"]|['"]$/g, "");
          expect(cleanedDflt).toBe(String(field.default));
        }
      }
    }
    await db.close();
  });

  test("exists() before insertion", async () => {
    const db = await getDb();
    for (const schemaName in schemaMap) {
      const doesExist = await db.exists(schemaName);
      if (["SingleValue", "SystemSettings"].includes(schemaName)) {
        expect(doesExist).toBe(true);
      } else {
        expect(doesExist).toBe(false);
      }
    }
    await db.close();
  });

  test("CRUD single values", async () => {
    const db = await getDb();
    const rowsRes = await db.client!.execute("select * from SingleValue");
    let rows = rowsRes.rows as unknown as Record<string, RawValue>[];
    const defaultMap = getValueMapFromList(
      (schemaMap.SystemSettings as Schema).fields,
      "fieldname",
      "default",
    );
    for (const row of rows) {
      expect(row.value as any).toBe(
        Reflect.get(defaultMap, row.fieldname as string),
      );
    }

    let localeRow = rows.find((r) => r.fieldname === "locale");
    const localeEntryName = localeRow?.name as string;
    const localeEntryCreated = localeRow?.created as string;

    let locale = "hi-IN";
    await db.insert("SystemSettings", { locale });
    const rowsRes2 = await db.client!.execute("select * from SingleValue");
    rows = rowsRes2.rows as unknown as Record<string, RawValue>[];
    localeRow = rows.find((r) => r.fieldname === "locale");

    expect(localeEntryName).not.toBeUndefined();
    expect(rows.length).toBe(2);
    expect(localeRow?.name).toBe(localeEntryName);
    expect(localeRow?.value).toBe(locale);
    expect(localeRow?.created).toBe(localeEntryCreated);

    locale = "ca-ES";
    await db.update("SystemSettings", { locale });
    const rowsRes3 = await db.client!.execute("select * from SingleValue");
    rows = rowsRes3.rows as unknown as Record<string, RawValue>[];
    localeRow = rows.find((r) => r.fieldname === "locale");

    expect(localeEntryName).not.toBeUndefined();
    expect(rows.length).toBe(2);
    expect(localeRow?.name).toBe(localeEntryName);
    expect(localeRow?.value).toBe(locale);
    expect(localeRow?.created).toBe(localeEntryCreated);

    await db.delete("SystemSettings", "locale");
    const rowsRes4 = await db.client!.execute("select * from SingleValue");
    rows = rowsRes4.rows as unknown as Record<string, RawValue>[];
    expect(rows.length).toBe(1);
    await db.delete("SystemSettings", "dateFormat");
    const rowsRes5 = await db.client!.execute("select * from SingleValue");
    rows = rowsRes5.rows as unknown as Record<string, RawValue>[];
    expect(rows.length).toBe(0);

    const dateFormat = "dd/mm/yy";
    await db.insert("SystemSettings", { locale, dateFormat });
    const rowsRes6 = await db.client!.execute("select * from SingleValue");
    rows = rowsRes6.rows as unknown as Record<string, RawValue>[];
    expect(rows.length).toBe(2);

    const svl = await db.getSingleValues("locale", "dateFormat");
    expect(svl.length).toBe(2);
    for (const sv of svl) {
      expect(sv.parent).toBe("SystemSettings");
      expect(sv.value).toBe(Reflect.get({ locale, dateFormat }, sv.fieldname));
    }

    const svlMap = await db.get("SystemSettings");
    expect(Object.keys(svlMap).length).toBe(2);
    expect(svlMap.locale).toBe(locale);
    expect(svlMap.dateFormat).toBe(dateFormat);

    await db.close();
  });

  test("CRUD nondependent schema", async () => {
    const db = await getDb();
    const schemaName = "Customer";
    let rows = await db.getAll(schemaName, { fields: ["*"] });
    expect(rows.length).toBe(0);

    const metaValues = getDefaultMetaFieldValueMap();
    const name = "John Thoe";

    await assertThrows(
      async () => await db.insert(schemaName, { name }),
      "insert() did not throw without meta values",
    );

    const updateMap = Object.assign({}, metaValues, { name });
    await db.insert(schemaName, updateMap);
    rows = await db.getAll(schemaName, { fields: ["*"] });
    let firstRow = rows?.[0];
    expect(rows.length).toBe(1);
    expect(firstRow.name).toBe(name);
    expect(firstRow.email).toBe(null);

    for (const key in metaValues) {
      expect(Reflect.get(firstRow, key)).toBe(
        Reflect.get(metaValues, key as BaseMetaKey),
      );
    }

    const email = "john@thoe.com";
    await sleep(1);
    await db.update(schemaName, {
      name,
      email,
      modified: new Date().toISOString(),
    });
    rows = await db.getAll(schemaName, { fields: ["*"] });
    firstRow = rows?.[0];
    expect(rows.length).toBe(1);
    expect(firstRow.name).toBe(name);
    expect(firstRow.email).toBe(email);

    const phone = "8149133530";
    await sleep(1);
    await db.update(schemaName, {
      name,
      phone,
      modified: new Date().toISOString(),
    });
    rows = await db.getAll(schemaName, { fields: ["*"] });
    firstRow = rows?.[0];
    expect(firstRow.email).toBe(email);
    expect(firstRow.phone).toBe(phone);

    for (const key in metaValues) {
      const val = Reflect.get(firstRow, key);
      const expected = Reflect.get(metaValues, key);
      if (key !== "modified") {
        expect(val).toBe(expected);
      } else {
        expect(val).not.toBe(expected);
      }
    }

    await db.delete(schemaName, name);
    rows = await db.getAll(schemaName, { fields: ["*"] });
    expect(rows.length).toBe(0);

    let fvMap = await db.get(schemaName, name);
    expect(Object.keys(fvMap).length).toBe(0);

    const cOne = { name: "John Whoe", ...getDefaultMetaFieldValueMap() };
    const cTwo = { name: "Jane Whoe", ...getDefaultMetaFieldValueMap() };

    await db.insert(schemaName, cOne);
    expect((await db.getAll(schemaName, { fields: ["*"] })).length).toBe(1);
    await db.insert(schemaName, cTwo);
    rows = await db.getAll(schemaName, { fields: ["*"] });
    const cs = [cOne, cTwo].sort((a, b) => a.name.localeCompare(b.name));
    const sortedRows = [...rows].sort((a, b) =>
      (a.name as string).localeCompare(b.name as string),
    );
    expect(rows.length).toBe(2);

    for (const i in cs) {
      for (const k in Reflect.get(cs, i)) {
        const val = Reflect.get(Reflect.get(cs, i), k);
        expect(Reflect.get(Reflect.get(sortedRows || [], i), k)).toBe(val);
      }
    }

    await db.update(schemaName, { name: cOne.name, email });
    const cOneEmail = await db.get(schemaName, cOne.name, "email");
    expect(cOneEmail.email).toBe(email);

    const newName = "Johnny Whoe";
    await db.rename(schemaName, cOne.name, newName);

    fvMap = await db.get(schemaName, cOne.name);
    expect(Object.keys(fvMap).length).toBe(0);

    fvMap = await db.get(schemaName, newName);
    expect(fvMap.email).toBe(email);

    await db.delete(schemaName, newName);
    rows = await db.getAll(schemaName, { fields: ["*"] });
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe(cTwo.name);
    await db.close();
  });

  test("CRUD dependent schema", async () => {
    const db = await getDb();

    const Customer = "Customer";
    const SalesInvoice = "SalesInvoice";
    const SalesInvoiceItem = "SalesInvoiceItem";

    const customer: FieldValueMap = {
      name: "John Whoe",
      email: "john@whoe.com",
      ...getDefaultMetaFieldValueMap(),
    };

    const invoice: FieldValueMap = {
      name: "SINV-1001",
      date: "2022-01-21",
      customer: customer.name,
      account: "Debtors",
      submitted: false,
      cancelled: false,
      ...getDefaultMetaFieldValueMap(),
    };

    await assertThrows(
      async () => await db.insert(SalesInvoice, invoice),
      "foreign key constraint fail failed",
    );

    await assertDoesNotThrow(async () => {
      await db.insert(Customer, customer);
      await db.insert(SalesInvoice, invoice);
    }, "insertion failed");

    await assertThrows(
      async () => await db.delete(Customer, customer.name as string),
      "foreign key constraint fail failed",
    );

    await assertDoesNotThrow(async () => {
      await db.delete(SalesInvoice, invoice.name as string);
      await db.delete(Customer, customer.name as string);
    }, "deletion failed");

    await db.insert(Customer, customer);
    await db.insert(SalesInvoice, invoice);

    let fvMap = await db.get(SalesInvoice, invoice.name as string);
    for (const key in invoice) {
      let expected = Reflect.get(invoice, key);
      if (typeof expected === "boolean") {
        expected = +expected;
      }

      expect(Reflect.get(fvMap, key)).toBe(expected);
    }

    expect((fvMap.items as unknown[])?.length).toBe(0);

    const items: FieldValueMap[] = [
      {
        item: "Bottle Caps",
        quantity: 2,
        rate: 100,
        amount: 200,
      },
    ];

    await assertThrows(
      async () => await db.insert(SalesInvoice, { name: invoice.name, items }),
      "invoice insertion with ct did not fail",
    );
    await assertDoesNotThrow(
      async () => await db.update(SalesInvoice, { name: invoice.name, items }),
      "ct insertion failed",
    );

    fvMap = await db.get(SalesInvoice, invoice.name as string);
    const ct = fvMap.items as FieldValueMap[];
    expect(ct.length).toBe(1);
    expect(ct[0].parent).toBe(invoice.name);
    expect(ct[0].parentFieldname).toBe("items");
    expect(ct[0].parentSchemaName).toBe(SalesInvoice);
    for (const key in items[0]) {
      expect(Reflect.get(ct[0], key)).toBe(Reflect.get(items[0], key));
    }

    items.push({
      item: "Mentats",
      quantity: 4,
      rate: 200,
      amount: 800,
    });
    await assertDoesNotThrow(
      async () => await db.update(SalesInvoice, { name: invoice.name, items }),
      "ct updation failed",
    );

    let rows = await db.getAll(SalesInvoiceItem, {
      fields: ["item", "quantity", "rate", "amount"],
    });
    expect(rows.length).toBe(2);

    for (const i in rows) {
      for (const key in Reflect.get(rows, i)) {
        expect(Reflect.get(Reflect.get(rows, i), key)).toBe(
          Reflect.get(Reflect.get(items, i), key),
        );
      }
    }

    invoice.date = "2022-04-01";
    invoice.modified = new Date().toISOString();
    await db.update("SalesInvoice", {
      name: invoice.name,
      date: invoice.date,
      modified: invoice.modified,
    });

    rows = await db.getAll(SalesInvoiceItem, { fields: ["*"] });
    expect(rows.length).toBe(2);

    await db.delete(SalesInvoice, invoice.name as string);
    rows = await db.getAll(SalesInvoiceItem);
    expect(rows.length).toBe(0);

    await db.close();
  });

  test("db deleteAll", async () => {
    const db = await getDb();

    const emailOne = "one@temp.com";
    const emailTwo = "two@temp.com";
    const emailThree = "three@temp.com";

    const phoneOne = "1";
    const phoneTwo = "2";

    const customers = [
      { name: "customer-a", phone: phoneOne, email: emailOne },
      { name: "customer-b", phone: phoneOne, email: emailOne },
      { name: "customer-c", phone: phoneOne, email: emailTwo },
      { name: "customer-d", phone: phoneOne, email: emailTwo },
      { name: "customer-e", phone: phoneTwo, email: emailTwo },
      { name: "customer-f", phone: phoneTwo, email: emailThree },
      { name: "customer-g", phone: phoneTwo, email: emailThree },
    ];

    for (const { name, email, phone } of customers) {
      await db.insert("Customer", {
        name,
        email,
        phone,
        ...getDefaultMetaFieldValueMap(),
      });
    }

    expect((await db.getAll("Customer")).length).toBe(customers.length);

    expect(await db.deleteAll("Customer", { email: emailOne })).toBe(
      customers.filter((c) => c.email === emailOne).length,
    );
    expect(
      (await db.getAll("Customer", { filters: { email: emailOne } })).length,
    ).toBe(0);

    expect(
      await db.deleteAll("Customer", { email: emailTwo, phone: phoneTwo }),
    ).toBe(
      customers.filter(
        ({ phone, email }) => email === emailTwo && phone === phoneTwo,
      ).length,
    );
    expect(
      await db.deleteAll("Customer", { email: emailTwo, phone: phoneTwo }),
    ).toBe(0);

    expect(
      await db.deleteAll("Customer", { email: ["in", [emailTwo, emailThree]] }),
    ).toBe(
      customers.filter(
        ({ email, phone }) =>
          [emailTwo, emailThree].includes(email) &&
          !(phone === phoneTwo && email === emailTwo),
      ).length,
    );
    expect(
      (
        await db.getAll("Customer", {
          filters: { email: ["in", [emailTwo, emailThree]] },
        })
      ).length,
    ).toBe(0);

    await db.close();
  });
});
