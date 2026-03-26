const Database = require("better-sqlite3");
try {
	const db = new Database(":memory:");
	console.log("SUCCESS: better-sqlite3 initialized in memory.");
	db.close();
	process.exit(0);
} catch (err) {
	console.error("FAILURE: better-sqlite3 failed to initialize.");
	console.error(err);
	process.exit(1);
}
