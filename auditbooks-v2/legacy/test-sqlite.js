import Database from "better-sqlite3";
const db = new Database(":memory:");
db.prepare("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)").run();
db.prepare("INSERT INTO test (name) VALUES (?)").run("hello");
const row = db.prepare("SELECT * FROM test WHERE name = ?").get("hello");
console.log(row);
db.close();
