export interface DbRecord {
  name: string;
  created?: string;
  modified?: string;
  createdBy?: string;
  modifiedBy?: string;
}

export interface SingleValueTable extends DbRecord {
  fieldname: string;
  parent: string;
  value: string | null;
}

export interface PatchRunTable extends DbRecord {
  failed: number | boolean;
  version: string;
}

export interface AccountTable extends DbRecord {
  accountName: string;
  rootType: string | null;
  accountType: string | null;
  parentAccount: string | null;
  isGroup: number | boolean;
}

export interface AccountingLedgerEntryTable extends DbRecord {
  date: string;
  party: string | null;
  account: string;
  debit: number | string;
  credit: number | string;
  reverted: number | boolean;
  referenceType: string | null;
  referenceName: string | null;
}

export interface PaymentTable extends DbRecord {
  paymentMethod: string;
  paymentType: string;
  referenceType: string | null;
}

export interface PaymentForTable extends DbRecord {
  parent: string;
  referenceName: string;
}

export interface SalesInvoiceTable extends DbRecord {
  date: string;
  outstandingAmount: number | string;
  baseGrandTotal: number | string;
  submitted: number | boolean;
  isPOS: number | boolean;
  returnAgainst: string | null;
}

export interface SalesInvoiceItemTable extends DbRecord {
  parent: string;
  quantity: number;
}

export interface StockLedgerEntryTable extends DbRecord {
  item: string;
  quantity: number;
  location: string | null;
  date: string;
  batch?: string | null;
  serialNumber?: string | null;
}

export interface DatabaseSchema {
  SingleValue: SingleValueTable;
  PatchRun: PatchRunTable;
  Account: AccountTable;
  AccountingLedgerEntry: AccountingLedgerEntryTable;
  Payment: PaymentTable;
  PaymentFor: PaymentForTable;
  SalesInvoice: SalesInvoiceTable;
  SalesInvoiceItem: SalesInvoiceItemTable;
  StockLedgerEntry: StockLedgerEntryTable;
}
