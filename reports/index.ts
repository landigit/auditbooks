import { t } from 'fyo';

export const reports = {
  GeneralLedger: {
    title: t`General Ledger`,
    reportName: 'general-ledger',
    load: () => import('./GeneralLedger/GeneralLedger').then(m => m.GeneralLedger),
  },
  ProfitAndLoss: {
    title: t`Profit and Loss`,
    reportName: 'profit-and-loss',
    load: () => import('./ProfitAndLoss/ProfitAndLoss').then(m => m.ProfitAndLoss),
  },
  BalanceSheet: {
    title: t`Balance Sheet`,
    reportName: 'balance-sheet',
    load: () => import('./BalanceSheet/BalanceSheet').then(m => m.BalanceSheet),
  },
  TrialBalance: {
    title: t`Trial Balance`,
    reportName: 'trial-balance',
    load: () => import('./TrialBalance/TrialBalance').then(m => m.TrialBalance),
  },
  GSTR1: {
    title: t`GSTR-1`,
    reportName: 'gstr-1',
    load: () => import('./GoodsAndServiceTax/GSTR1').then(m => m.GSTR1),
  },
  GSTR2: {
    title: t`GSTR-2`,
    reportName: 'gstr-2',
    load: () => import('./GoodsAndServiceTax/GSTR2').then(m => m.GSTR2),
  },
  StockLedger: {
    title: t`Stock Ledger`,
    reportName: 'stock-ledger',
    isInventory: true,
    load: () => import('./inventory/StockLedger').then(m => m.StockLedger),
  },
  StockBalance: {
    title: t`Stock Balance`,
    reportName: 'stock-balance',
    isInventory: true,
    load: () => import('./inventory/StockBalance').then(m => m.StockBalance),
  },
} as const;
