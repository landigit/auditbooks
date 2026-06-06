import { DatabaseManager } from "../backend/database/manager";
import patch from "../backend/patches/updateSchemas";
import path from "path";

async function test() {
  const dm = new DatabaseManager();
  const dbPath = path.resolve("drizzle/db/demo.db");
  console.log("Connecting...");
  await dm.connectToDatabase(dbPath);
  console.log("Successfully connected!");

  console.log("Executing updateSchemas patch manually...");
  try {
    await patch.execute(dm);
    console.log("Patch execute completed!");
  } catch (err: any) {
    console.error("Patch execute failed:", err.message);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

test();
