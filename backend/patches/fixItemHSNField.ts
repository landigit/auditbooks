import { DatabaseManager } from '../database/manager';

async function execute(_dm: DatabaseManager) {
  // Since we already pull this as text in schema.ts, we can execute a safe alter check or ignore.
}

export default { execute, beforeMigrate: true };
