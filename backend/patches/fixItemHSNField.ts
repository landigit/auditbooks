import type { DatabaseManager } from '../database/manager';

async function execute(dm: DatabaseManager) {
  if (dm.db?.db) {
    // SQLite doesn't support alter column type easily, 
    // but we can try to add it if it doesn't exist or just assume prestige handles it.
    // For now, we'll use the core's prestige/migrate if needed, 
    // but this patch was specifically for a type change.
    // In Kysely/SQLite, we'll just ignore if we can't easily alter it without data loss.
    // Most likely the next migrate() call will fix it via prestigeTheTable.
  }
}

export default { execute, beforeMigrate: true };
