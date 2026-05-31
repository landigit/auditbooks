import { Fyo } from 'fyo';
import { ConfigFile } from 'fyo/core/types';
import { translateSchema } from 'fyo/utils/translation';
import dayjs, { Dayjs } from 'dayjs';
import { SetupWizard } from 'models/baseModels/SetupWizard/SetupWizard';
import { ModelNameEnum } from 'models/types';
import { reports } from 'reports/index';
import SetupWizardSchema from 'schemas/app/SetupWizard.json';
import { Schema } from 'schemas/types';
import { fyo } from 'src/initFyo';
import { QueryFilter } from 'src/utils/db/types';
import { schemaTranslateables } from 'src/utils/core/translationHelpers';
import type { LanguageMap } from 'src/utils/core/types';
import { PeriodKey } from './types';
import { useAppStore } from 'src/stores/app';

export function getDatesAndPeriodList(period: PeriodKey): {
  periodList: Dayjs[];
  fromDate: Dayjs;
  toDate: Dayjs;
} {
  const toDate: Dayjs = dayjs().add(1, 'day');
  let fromDate: Dayjs;

  if (period === 'This Year') {
    fromDate = toDate.subtract(12, 'month');
  } else if (period === 'YTD') {
    fromDate = dayjs().startOf('year');
  } else if (period === 'This Quarter') {
    fromDate = toDate.subtract(3, 'month');
  } else if (period === 'This Month') {
    fromDate = toDate.startOf('month');
  } else {
    fromDate = toDate.subtract(1, 'day');
  }

  /**
   * periodList: Monthly decrements before toDate until fromDate
   */
  const periodList: Dayjs[] = [toDate];
  while (true) {
    const nextDate = periodList.at(0)!.subtract(1, 'month');
    if (nextDate.valueOf() < fromDate.valueOf()) {
      if (period === 'YTD') {
        periodList.unshift(nextDate);
        break;
      }
      break;
    }

    periodList.unshift(nextDate);
  }
  periodList.shift();

  return {
    periodList,
    fromDate,
    toDate,
  };
}

export function getSetupWizardDoc(languageMap?: LanguageMap) {
  /**
   * This is used cause when setup wizard is running
   * the database isn't yet initialized.
   */
  const schema = structuredClone(SetupWizardSchema);
  if (languageMap) {
    translateSchema(schema, languageMap, schemaTranslateables);
  }
  return fyo.doc.getNewDoc(
    'SetupWizard',
    {},
    false,
    schema as Schema,
    SetupWizard
  );
}

export function updateConfigFiles(fyo: Fyo): ConfigFile {
  const configFiles = fyo.config.get('files', []) as ConfigFile[];

  const companyName = fyo.singles.AccountingSettings!.companyName as string;
  const id = fyo.singles.SystemSettings!.instanceId as string;
  const dbPath = fyo.db.dbPath!;
  const openCount = fyo.singles.Misc!.openCount as number;

  const fileIndex = configFiles.findIndex((f) => f.id === id);
  let newFile = { id, companyName, dbPath, openCount };

  if (fileIndex === -1) {
    configFiles.push(newFile);
  } else {
    configFiles[fileIndex].companyName = companyName;
    configFiles[fileIndex].dbPath = dbPath;
    configFiles[fileIndex].openCount = openCount;
    newFile = configFiles[fileIndex];
  }

  fyo.config.set('files', configFiles);
  return newFile;
}

export const docsPathMap: Record<string, string | undefined> = {
  // Analytics
  Dashboard: 'books/dashboard',
  Reports: 'books/reports',
  GeneralLedger: 'books/general-ledger',
  ProfitAndLoss: 'books/profit-and-loss',
  BalanceSheet: 'books/balance-sheet',
  TrialBalance: 'books/trial-balance',

  // Transactions
  [ModelNameEnum.SalesInvoice]: 'books/sales-invoices',
  [ModelNameEnum.PurchaseInvoice]: 'books/purchase-invoices',
  [ModelNameEnum.Payment]: 'books/payments',
  [ModelNameEnum.JournalEntry]: 'books/journal-entries',

  // Inventory
  [ModelNameEnum.StockMovement]: 'books/stock-movement',
  [ModelNameEnum.Shipment]: 'books/shipment',
  [ModelNameEnum.PurchaseReceipt]: 'books/purchase-receipt',
  StockLedger: 'books/stock-ledger',
  StockBalance: 'books/stock-balance',
  [ModelNameEnum.Batch]: 'books/batches',

  // Entries
  Entries: 'books/books',
  [ModelNameEnum.Party]: 'books/party',
  [ModelNameEnum.Item]: 'books/items',
  [ModelNameEnum.Tax]: 'books/taxes',
  [ModelNameEnum.PrintTemplate]: 'books/print-templates',

  // Miscellaneous
  Search: 'books/quick-search',
  NumberSeries: 'books/number-series',
  ImportWizard: 'books/import-wizard',
  Settings: 'books/settings',
  ChartOfAccounts: 'books/chart-of-accounts',
};

export async function getDataURL(type: string, data: Uint8Array) {
  const blob = new Blob([data as any], { type });

  return new Promise<string>((resolve) => {
    const fr = new FileReader();
    fr.addEventListener('loadend', () => {
      resolve(fr.result as string);
    });

    fr.readAsDataURL(blob);
  });
}

export async function convertFileToDataURL(file: File, type: string) {
  const buffer = await file.arrayBuffer();
  const array = new Uint8Array(buffer);
  return await getDataURL(type, array);
}

export function getCreateFiltersFromListViewFilters(filters: QueryFilter) {
  const createFilters: Record<string, string | number | boolean | null> = {};

  for (const key in filters) {
    let value: (typeof filters)[string] | undefined | number = Reflect.get(
      filters,
      key
    );

    if (Array.isArray(value) && value[0] === 'in' && Array.isArray(value[1])) {
      value = value[1].filter((v) => v !== 'Both')[0];
    }

    if (value === undefined || Array.isArray(value)) {
      continue;
    }

    Reflect.set(createFilters, key, value);
  }

  return createFilters;
}

export function getIsMac() {
  return navigator.userAgent.indexOf('Mac') !== -1;
}

export async function getReport(name: keyof typeof reports) {
  const appStore = useAppStore();
  const cachedReport = Reflect.get(appStore.reports, name);
  if (cachedReport) {
    return cachedReport;
  }

  const ReportClass = Reflect.get(reports, name);
  const report = new ReportClass(fyo);
  await report.initialize();
  Reflect.set(appStore.reports, name, report);
  return report;
}
