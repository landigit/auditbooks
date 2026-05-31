export interface DocNode {
  id: string;
  title: string;
  path?: string;
  children?: DocNode[];
  isExpanded?: boolean;
}

export const docsNavigation: DocNode[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    children: [
      {
        id: 'getting-started-main',
        title: 'Getting Started',
        path: 'getting-started',
      },
      {
        id: 'chart-of-accounts',
        title: 'Chart of Accounts',
        path: 'chart-of-accounts',
      },
      {
        id: 'setup-opening-balances',
        title: 'Setup Opening Balances',
        path: 'setup-opening-balances',
      },
      {
        id: 'create-initial-entries',
        title: 'Create Initial Entries',
        path: 'create-initial-entries',
      },
      { id: 'import-wizard', title: 'Import Wizard', path: 'import-wizard' },
      { id: 'quick-search', title: 'Quick Search', path: 'quick-search' },
    ],
  },
  {
    id: 'basics',
    title: 'Basics',
    children: [
      {
        id: 'accounting-basics',
        title: 'Accounting Basics',
        path: 'accounting-basics',
      },
      { id: 'dashboard', title: 'Dashboard', path: 'dashboard' },
      { id: 'introduction', title: 'Introduction', path: 'introduction' },
    ],
  },
  {
    id: 'transactions',
    title: 'Transactions',
    children: [
      {
        id: 'transactional-entries',
        title: 'Point of Sale (POS)',
        path: 'transactional-entries',
      },
      { id: 'sales-invoices', title: 'Sales Invoices', path: 'sales-invoices' },
      {
        id: 'purchase-invoices',
        title: 'Purchase Invoices',
        path: 'purchase-invoices',
      },
      {
        id: 'journal-entries',
        title: 'Journal Entries',
        path: 'journal-entries',
      },
      { id: 'payments', title: 'Payments', path: 'payments' },
      {
        id: 'discount-accounting',
        title: 'Discount Accounting',
        path: 'discount-accounting',
      },
      {
        id: 'multi-currency-invoicing',
        title: 'Multi Currency Invoicing',
        path: 'multi-currency-invoicing',
      },
      {
        id: 'loyalty-program',
        title: 'Loyalty Program',
        path: 'loyalty-program',
      },
    ],
  },
  {
    id: 'masters',
    title: 'Masters',
    children: [
      { id: 'master-data', title: 'Master Data', path: 'master-data' },
      { id: 'items', title: 'Items', path: 'items' },
      { id: 'party', title: 'Party', path: 'party' },
      { id: 'taxes', title: 'Taxes', path: 'taxes' },
      { id: 'price-list', title: 'Price List', path: 'price-list' },
      { id: 'pricing-rule', title: 'Pricing Rule', path: 'pricing-rule' },
      { id: 'coupon-code', title: 'Coupon Code', path: 'coupon-code' },
    ],
  },
  {
    id: 'financial-reports',
    title: 'Financial Reports',
    children: [
      { id: 'reports', title: 'Reports', path: 'reports' },
      { id: 'trial-balance', title: 'Trial Balance', path: 'trial-balance' },
      { id: 'general-ledger', title: 'General Ledger', path: 'general-ledger' },
      { id: 'balance-sheet', title: 'Balance Sheet', path: 'balance-sheet' },
      {
        id: 'profit-and-loss',
        title: 'Profit and Loss Statement',
        path: 'profit-and-loss',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    children: [
      {
        id: 'introduction-to-inventory',
        title: 'Introduction to Inventory',
        path: 'introduction-to-inventory',
      },
      {
        id: 'inventory-settings',
        title: 'Inventory Settings',
        path: 'inventory-settings',
      },
      { id: 'stock-movement', title: 'Stock Movement', path: 'stock-movement' },
      {
        id: 'purchase-receipt',
        title: 'Purchase Receipt',
        path: 'purchase-receipt',
      },
      { id: 'shipment', title: 'Shipment', path: 'shipment' },
      { id: 'serial-number', title: 'Serial Number', path: 'serial-number' },
      { id: 'stock-balance', title: 'Stock Balance', path: 'stock-balance' },
      { id: 'stock-ledger', title: 'Stock Ledger', path: 'stock-ledger' },
      { id: 'batches', title: 'Batches', path: 'batches' },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    children: [
      { id: 'settings-main', title: 'Settings', path: 'settings' },
      { id: 'customize-form', title: 'Customize Form', path: 'customize-form' },
      { id: 'number-series', title: 'Number Series', path: 'number-series' },
      {
        id: 'print-templates',
        title: 'Print Templates',
        path: 'print-templates',
      },
    ],
  },
];
