import { getSchemas } from '../schemas/index.js';
import DatabaseCore from '../backend/database/core.js';
import { execSync } from 'child_process';
import { unlink } from 'fs/promises';
import path from 'path';

async function run() {
  const dbPath = path.join(import.meta.dirname, '../dummy/codegen.db');

  console.log('Initializing Kysely codegen database migration...');
  const db = new DatabaseCore(dbPath);
  await db.connect();
  db.setSchemaMap(getSchemas('-', []));
  await db.migrate();
  await db.close();
  console.log('Database migrated successfully. Running kysely-codegen...');

  try {
    execSync(
      `npx kysely-codegen --dialect sqlite --url "${dbPath}" --out-file "${path.join(
        import.meta.dirname,
        '../backend/database/schema.ts'
      )}"`,
      { stdio: 'inherit' }
    );
    console.log('Kysely codegen completed successfully.');
  } finally {
    try {
      await unlink(dbPath);
    } catch {}
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
