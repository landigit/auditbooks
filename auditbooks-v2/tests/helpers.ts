import path from "node:path";
import { unlinkSync, existsSync } from "node:fs";
import { DatabaseManager } from "backend/database/manager";
import { config } from "dotenv";
import { Fyo } from "fyo";
import { DummyAuthDemux } from "fyo/tests/helpers";
import { DateTime } from "luxon";
import setupInstance from "src/setup/setupInstance";
import type { SetupWizardOptions } from "src/setup/types";
import { beforeAll, afterAll } from "vitest";
import { getFiscalYear } from "utils/misc";

export function getTestSetupWizardOptions(): SetupWizardOptions {
	return {
		logo: null,
		companyName: "Test Company",
		country: "India",
		fullname: "Test Person",
		email: "test@testmyfantasy.com",
		bankName: "Test Bank of Scriptia",
		currency: "INR",
		fiscalYearStart:
			DateTime.fromJSDate(
				getFiscalYear("04-01", true) ?? new Date(),
			).toISODate() ?? "",
		fiscalYearEnd:
			DateTime.fromJSDate(
				getFiscalYear("04-01", false) ?? new Date(),
			).toISODate() ?? "",
		chartOfAccounts: "India - Chart of Accounts",
	};
}

export function getTestDbPath(dbPath?: string) {
	config();
	return (
		dbPath ??
		process.env.TEST_DB_PATH ??
		path.join(
			process.cwd(),
			`test-${Math.random().toString(36).substring(7)}.sqlite`,
		)
	);
}

/**
 * Test Boilerplate
 */

export function getTestFyo(): Fyo {
	return new Fyo({
		DatabaseDemux: DatabaseManager,
		AuthDemux: DummyAuthDemux,
		isTest: true,
		isElectron: false,
	});
}

export function setupTestFyo(fyo: Fyo, _filename?: string) {
	beforeAll(async () => {
		const options = getTestSetupWizardOptions();
		const dbPath = getTestDbPath();
		await setupInstance(dbPath, options, fyo);
	}, 60000);
}

export function closeTestFyo(fyo: Fyo, _filename?: string) {
	afterAll(async () => {
		const dbPath = fyo.db.dbPath;
		await fyo.close();
		if (dbPath && dbPath !== ":memory:" && existsSync(dbPath)) {
			try {
				unlinkSync(dbPath);
			} catch (err) {
				console.warn(`Failed to delete test database: ${dbPath}`, err);
			}
		}
	});
}
