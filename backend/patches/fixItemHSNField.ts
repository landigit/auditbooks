import { DatabaseManager } from '../database/manager';

async function execute(dm: DatabaseManager) {
  // SQLite handles dynamic typing natively.
  // The subsequent migrate() run will prestige/recreate the table and align columns if needed.
}

export default { execute, beforeMigrate: true };
