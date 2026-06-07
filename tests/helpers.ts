import { DatabaseManager } from 'backend/database/manager';
import { Fyo } from 'fyo';
import { DummyAuthDemux } from 'fyo/tests/helpers';
import dayjs from 'dayjs';

import setupInstance from 'src/setup/setupInstance';
import { SetupWizardOptions } from 'src/setup/types';
import { getFiscalYear } from 'utils/misc';
import { beforeAll, afterAll } from 'vite-plus/test';

export function getTestSetupWizardOptions(): SetupWizardOptions {
  return {
    logo: null,
    companyName: 'Test Company',
    country: 'India',
    fullname: 'Test Person',
    email: 'test@testmyfantasy.com',
    bankName: 'Test Bank of Scriptia',
    currency: 'INR',
    fiscalYearStart: dayjs(getFiscalYear('04-01', true)!).format('YYYY-MM-D')!,
    fiscalYearEnd: dayjs(getFiscalYear('04-01', false)!).format('YYYY-MM-D')!,
    chartOfAccounts: 'India - Chart of Accounts',
  };
}

export function getTestDbPath(dbPath?: string) {
  return dbPath ?? process.env.TEST_DB_PATH ?? ':memory:';
}

/**
 * Test Boilerplate
 *
 * The bottom three functions are test boilerplate for when
 * an initialized fyo object is to be used.
 *
 * They are required because top level await is not supported.
 *
 * Therefore setup and cleanup of the fyo object is wrapped
 * in tests which are executed serially (and awaited in order)
 * by tape.
 *
 * If `closeTestFyo` is not called the test process won't exit.
 */

export function getTestFyo(): Fyo {
  return new Fyo({
    DatabaseDemux: DatabaseManager,
    AuthDemux: DummyAuthDemux,
    isTest: true,
    isElectron: false,
  });
}

export function setupTestFyo(fyo: Fyo, _filename: string) {
  beforeAll(async () => {
    const options = getTestSetupWizardOptions();
    const dbPath = getTestDbPath();
    await setupInstance(dbPath, options, fyo);
  });
}

export function closeTestFyo(fyo: Fyo, _filename: string) {
  afterAll(async () => {
    await fyo.close();
  });
}

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
