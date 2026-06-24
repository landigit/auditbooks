import { DatabaseManager } from 'backend/database/manager';
import { config } from 'dotenv';
import { Fyo } from 'fyo';
import { DummyAuthDemux } from 'fyo/tests/helpers';
import { DateTime } from 'luxon';
import setupInstance from 'src/setup/setupInstance';
import { SetupWizardOptions } from 'src/setup/types';
import { getFiscalYear } from 'utils/misc';
import { beforeAll, afterAll } from 'vitest';

export function getTestSetupWizardOptions(): SetupWizardOptions {
  return {
    logo: null,
    companyName: 'Test Company',
    country: 'India',
    fullname: 'Test Person',
    email: 'test@testmyfantasy.com',
    bankName: 'Test Bank of Scriptia',
    currency: 'INR',
    fiscalYearStart: DateTime.fromJSDate(
      getFiscalYear('04-01', true) as Date
    ).toISODate()!,
    fiscalYearEnd: DateTime.fromJSDate(
      getFiscalYear('04-01', false) as Date
    ).toISODate()!,
    chartOfAccounts: 'India - Chart of Accounts',
  };
}

export function getTestDbPath(dbPath?: string) {
  config({ quiet: true });
  return dbPath ?? process.env.TEST_DB_PATH ?? ':memory:';
}

export function getTestFyo(): Fyo {
  return new Fyo({
    DatabaseDemux: DatabaseManager,
    AuthDemux: DummyAuthDemux,
    isTest: true,
  });
}

/* eslint-disable @typescript-eslint/no-misused-promises */

export function setupTestFyoBeforeAll(fyo: Fyo) {
  beforeAll(async () => {
    const options = getTestSetupWizardOptions();
    const dbPath = getTestDbPath();
    await setupInstance(dbPath, options, fyo);
  });
}

export function closeTestFyoAfterAll(fyo: Fyo) {
  afterAll(async () => {
    await fyo.close();
  });
}
