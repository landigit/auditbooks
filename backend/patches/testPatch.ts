import type { DatabaseManager } from "../database/manager";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function execute(_dm: DatabaseManager) {
	/**
	 * Execute function will receive the DatabaseManager which is to be used
	 * to apply database patches.
	 */
}

export default { execute, beforeMigrate: true };
