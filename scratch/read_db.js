const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPaths = ['E:\\misc\\demo.db', 'E:\\misc\\Landigit Agency.db'];

dbPaths.forEach((dbPath) => {
  if (!fs.existsSync(dbPath)) {
    console.log(`Database does not exist: ${dbPath}`);
    return;
  }

  console.log(`Connecting to: ${dbPath}`);
  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .prepare(
        `SELECT value FROM SingleValue WHERE parent = 'PrintSettings' AND fieldname = 'columnConfig'`
      )
      .get();
    if (row) {
      console.log(`Value from ${path.basename(dbPath)}:`, row.value);
    } else {
      console.log(`No columnConfig found in ${path.basename(dbPath)}`);
    }
  } catch (e) {
    console.error(`Error reading ${dbPath}:`, e.message);
  } finally {
    db.close();
  }
});
