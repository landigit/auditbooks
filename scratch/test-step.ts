import DatabaseCore from "../backend/database/core";
import { getSchemas } from "../schemas";
import path from "path";

async function test() {
  const dbPath = path.resolve("drizzle/db/demo.db");
  console.log("1. Calling getCountryCode...");
  const countryCode = await DatabaseCore.getCountryCode(dbPath);
  console.log("getCountryCode result:", countryCode);

  console.log("2. Constructing main DatabaseCore...");
  const db = new DatabaseCore(dbPath);
  console.log("3. Connecting main db...");
  await db.connect();

  console.log(
    '4. Trying to call db.getAll("CustomField") before schema is set...',
  );
  try {
    await db.getAll("CustomField");
  } catch (err: any) {
    console.log("Expected error caught:", err.message);
  }

  console.log("5. Setting schemaMap...");
  const schemaMap = getSchemas(countryCode, []);
  db.setSchemaMap(schemaMap);

  console.log("6. Testing query after setting schemaMap...");
  try {
    const res = await db.client!.execute(
      "select count(*) as count from sqlite_master",
    );
    console.log("Query result:", res.rows);
  } catch (err) {
    console.error("Query failed:", err);
  }

  console.log("7. Running migrate...");
  try {
    await db.migrate();
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

test();
