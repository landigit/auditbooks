import { DatabaseManager } from "../backend/database/manager";
import path from "path";

async function test() {
  const databaseManager = new DatabaseManager();
  const dbPath = path.resolve("drizzle/db/demo.db");
  console.log("Starting connectToDatabase...");
  try {
    await databaseManager.connectToDatabase(dbPath);
    console.log("connectToDatabase completed successfully!");
  } catch (err: any) {
    console.error("FAILED WITH ERROR:", err);
    if (err.stack) {
      console.error(err.stack);
    }
  }
}

test();
