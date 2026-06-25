import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseCSV, generateCSV } from '../utils/csvParser';

function getPaths(filename: string, convertedFilename: string) {
  const path = join(process.cwd(), '..', 'GRVEP', filename);
  if (existsSync(path)) {
    return {
      input: path,
      output: join(process.cwd(), '..', 'GRVEP', convertedFilename),
    };
  }
  const path1 = join(process.cwd(), 'GRVEP', filename);
  if (existsSync(path1)) {
    return {
      input: path1,
      output: join(process.cwd(), 'GRVEP', convertedFilename),
    };
  }
  const path2 = join(process.cwd(), filename);
  if (existsSync(path2)) {
    return {
      input: path2,
      output: join(process.cwd(), convertedFilename),
    };
  }
  return {
    input: path,
    output: join(process.cwd(), '..', 'GRVEP', convertedFilename),
  };
}

function convert() {
  const paths = getPaths('Item.csv', 'Item_converted.csv');
  const inputPath = paths.input;
  const outputPath = paths.output;

  if (!existsSync(inputPath)) {
    console.log(`Zoho Item CSV not found at: ${inputPath}, skipping.`);
    return;
  }

  console.log(`Reading Zoho Item CSV from: ${inputPath}`);
  const csvContent = readFileSync(inputPath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error('No rows found in Zoho Item CSV');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  // Find column indices
  const getIndex = (name: string) => header.indexOf(name);

  const idxId = getIndex('Item ID');
  const idxName = getIndex('Item Name');
  const idxHsn = getIndex('HSN/SAC');
  const idxDesc = getIndex('Description');
  const idxRate = getIndex('Rate');
  const idxAccount = getIndex('Account');
  const idxProductType = getIndex('Product Type');
  const idxTaxName = getIndex('Intra State Tax Name');
  const idxTaxRate = getIndex('Intra State Tax Rate');
  const idxUnit = getIndex('Usage unit');
  const idxPurchaseAccount = getIndex('Purchase Account');
  const idxSellable = getIndex('Sellable');
  const idxPurchasable = getIndex('Purchasable');
  const idxTrackInv = getIndex('Track Inventory');

  // Headers for target import model
  // Line 1: Schema labels
  const schemaLabels = [
    'Item',
    'Item',
    'Item',
    'Item',
    'Item',
    'Item',
    'Item',
    'Item',
    'Item',
    'Item',
    'Item',
    'Item',
  ];
  // Line 2: Field labels (human friendly)
  const fieldLabels = [
    'Item Name',
    'Item Code',
    'Purpose',
    'Type',
    'Unit Type',
    'Rate',
    'Description',
    'Sales Acc.',
    'Purchase Acc.',
    'Tax',
    'HSN/SAC',
    'Track Inventory',
  ];
  // Line 3: Field keys
  const fieldKeys = [
    'Item.name',
    'Item.itemCode',
    'Item.for',
    'Item.itemType',
    'Item.unit',
    'Item.rate',
    'Item.description',
    'Item.incomeAccount',
    'Item.expenseAccount',
    'Item.tax',
    'Item.hsnCode',
    'Item.trackItem',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];

  for (const row of dataRows) {
    if (!row || row.length === 0 || !row[idxName]) continue;

    const name = row[idxName] || '';
    const itemCode = row[idxId] || '';

    // Purpose / For: "Sales", "Purchases", "Both"
    const sellable = row[idxSellable] === 'true';
    const purchasable = row[idxPurchasable] === 'true';
    let purpose = 'Both';
    if (sellable && !purchasable) purpose = 'Sales';
    if (!sellable && purchasable) purpose = 'Purchases';

    // Type: "Product", "Service"
    const productType = (row[idxProductType] || '').toLowerCase();
    const type = productType === 'service' ? 'Service' : 'Product';

    // Unit Type
    const unitRaw = row[idxUnit] || 'Unit';
    const unit = unifyUom(unitRaw);

    // Rate (extract number)
    const rateRaw = row[idxRate] || '0';
    const rate = rateRaw.replace(/[^0-9.]/g, '');

    const description = row[idxDesc] || '';
    const salesAccRaw = row[idxAccount] || 'Sales';
    const purchaseAccRaw = row[idxPurchaseAccount] || 'Cost of Goods Sold';

    const salesAcc = unifyAccount(salesAccRaw);
    const purchaseAcc = unifyAccount(purchaseAccRaw);

    // Tax (extract rate to format like GST-18)
    const taxRateRaw = row[idxTaxRate] || '';
    const taxNameRaw = row[idxTaxName] || '';
    let tax = '';
    const taxMatch = taxRateRaw.match(/\d+/) || taxNameRaw.match(/\d+/);
    if (taxMatch) {
      tax = `GST-${taxMatch[0]}`;
    }

    const hsn = row[idxHsn] || '';
    const trackInv = row[idxTrackInv] === 'true' ? 'true' : 'false';

    convertedRows.push([
      name,
      itemCode,
      purpose,
      type,
      unit,
      rate,
      description,
      salesAcc,
      purchaseAcc,
      tax,
      hsn,
      trackInv,
    ]);
  }

  // Ensure a default "Services" item is present in converted items
  const hasServicesItem = convertedRows.some((r) => r[0] === 'Services');
  if (!hasServicesItem) {
    convertedRows.push([
      'Services', // Item Name
      'SERVICES', // Item Code
      'Both', // Purpose
      'Service', // Type
      'Unit', // Unit Type
      '0.00', // Rate
      'Default service item for missing item names', // Description
      'Sales', // Sales Acc
      'Cost of Goods Sold', // Purchase Acc
      'GST-18', // Tax
      '', // HSN/SAC
      'false', // Track Inventory
    ]);
  }

  const outputCSV = generateCSV(convertedRows);
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(`Successfully wrote converted Zoho Item CSV to: ${outputPath}`);
}

function convertJournal() {
  const paths = getPaths('Journal.csv', 'Journal_converted.csv');
  const inputPath = paths.input;
  const outputPath = paths.output;

  if (!existsSync(inputPath)) {
    console.log(`Zoho Journal CSV not found at: ${inputPath}, skipping.`);
    return;
  }

  console.log(`Reading Zoho Journal CSV from: ${inputPath}`);
  const csvContent = readFileSync(inputPath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error('No rows found in Zoho Journal CSV');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  // Find column indices
  const getIndex = (name: string) => header.indexOf(name);

  const idxNumber = getIndex('Journal Number');
  const idxDate = getIndex('Journal Date');
  const idxNotes = getIndex('Notes');
  const idxDesc = getIndex('Description');
  const idxDebit = getIndex('Debit');
  const idxCredit = getIndex('Credit');
  const idxAccount = getIndex('Account');

  // Headers for target import model
  // Line 1: Schema labels
  const schemaLabels = [
    'JournalEntry',
    'JournalEntry',
    'JournalEntry',
    'JournalEntry',
    'JournalEntry',
    'JournalEntry',
    'JournalEntryAccount',
    'JournalEntryAccount',
    'JournalEntryAccount',
  ];
  // Line 2: Field labels
  const fieldLabels = [
    'Entry No',
    'Number Series',
    'Entry Type',
    'Date',
    'User Remark',
    'Submitted',
    'Account',
    'Debit',
    'Credit',
  ];
  // Line 3: Field keys
  const fieldKeys = [
    'JournalEntry.name',
    'JournalEntry.numberSeries',
    'JournalEntry.entryType',
    'JournalEntry.date',
    'JournalEntry.userRemark',
    'JournalEntry.submitted',
    'JournalEntryAccount.account',
    'JournalEntryAccount.debit',
    'JournalEntryAccount.credit',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];

  for (const row of dataRows) {
    if (!row || row.length === 0 || !row[idxNumber]) continue;

    const name = row[idxNumber] || '';
    const numberSeries = 'JV-';
    const entryType = 'Journal Entry';
    const date = row[idxDate] || '';

    // Notes or Description for user remark
    const userRemark = row[idxNotes] || row[idxDesc] || '';

    // Account
    const accountRaw = row[idxAccount] || '';
    const account = unifyAccount(accountRaw);

    // Debit and Credit
    const debit = parseFloat(row[idxDebit] || '0').toFixed(2);
    const credit = parseFloat(row[idxCredit] || '0').toFixed(2);

    convertedRows.push([
      name,
      numberSeries,
      entryType,
      date,
      userRemark,
      '1',
      account,
      debit,
      credit,
    ]);
  }

  const outputCSV = generateCSV(convertedRows);
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(
    `Successfully wrote converted Zoho Journal CSV to: ${outputPath}`
  );
}

function convertCOA() {
  const paths = getPaths(
    'Chart_of_Accounts.csv',
    'Chart_of_Accounts_converted.csv'
  );
  const inputPath = paths.input;
  const outputPath = paths.output;

  if (!existsSync(inputPath)) {
    console.log(
      `Zoho Chart of Accounts CSV not found at: ${inputPath}, skipping.`
    );
    return;
  }

  console.log(`Reading Zoho Chart of Accounts CSV from: ${inputPath}`);
  const csvContent = readFileSync(inputPath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error('No rows found in Zoho Chart of Accounts CSV');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  // Find column indices
  const getIndex = (name: string) => header.indexOf(name);

  const idxName = getIndex('Account Name');
  const idxType = getIndex('Account Type');
  const idxParent = getIndex('Parent Account');

  // Headers for target import model
  // Line 1: Schema labels
  const schemaLabels = ['Account', 'Account', 'Account', 'Account', 'Account'];
  // Line 2: Field labels
  const fieldLabels = [
    'Account Name',
    'Root Type',
    'Account Type',
    'Parent Account',
    'Is Group',
  ];
  // Line 3: Field keys
  const fieldKeys = [
    'Account.name',
    'Account.rootType',
    'Account.accountType',
    'Account.parentAccount',
    'Account.isGroup',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];

  const getDefaultParentAccount = (
    rootType: string,
    accountType: string
  ): string => {
    const root = rootType.trim().toLowerCase();
    const type = accountType.trim().toLowerCase();

    if (root === 'expense') {
      if (type === 'cost of goods sold') return 'Direct Expenses';
      return 'Indirect Expenses';
    }
    if (root === 'income') {
      return 'Direct Income';
    }
    if (root === 'asset') {
      if (type === 'bank') return 'Bank Accounts';
      if (type === 'cash') return 'Cash In Hand';
      if (type === 'fixed asset') return 'Fixed Assets';
      if (type === 'stock') return 'Stock Assets';
      return 'Current Assets';
    }
    if (root === 'liability') {
      return 'Current Liabilities';
    }
    if (root === 'equity') {
      return 'Capital Account';
    }
    return 'Indirect Expenses';
  };

  for (const row of dataRows) {
    if (!row || row.length === 0 || !row[idxName]) continue;

    const nameRaw = row[idxName] || '';
    const name = unifyAccount(nameRaw);
    const zohoType = row[idxType] || '';
    const { rootType, accountType } = mapAccountType(zohoType);

    const parentRaw = row[idxParent] || '';
    let parentAccount = parentRaw ? unifyAccount(parentRaw) : '';

    // If parent account is empty, default it based on the rootType/accountType to conform to validations
    if (!parentAccount) {
      parentAccount = getDefaultParentAccount(rootType, accountType);
    }

    const isGroup = 'false';

    convertedRows.push([name, rootType, accountType, parentAccount, isGroup]);
  }

  const outputCSV = generateCSV(convertedRows);
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(
    `Successfully wrote converted Zoho Chart of Accounts CSV to: ${outputPath}`
  );
}

function unifyUom(unit: string): string {
  const u = unit.trim().toLowerCase();
  if (u === 'unit' || u === 'units') return 'Unit';
  if (u === 'nos' || u === 'no') return 'Nos';
  if (u === 'pcs' || u === 'pc' || u === 'pieces' || u === 'piece')
    return 'Pcs';
  if (u === 'bun' || u === 'bundle') return 'Bundle';
  if (u === 'book' || u === 'books') return 'Book';
  if (u === 'pkt' || u === 'packet' || u === 'packets') return 'Pkt';
  if (u === 'box' || u === 'boxes') return 'Box';
  if (u === 'ft' || u === 'feet' || u === 'foot') return 'Ft';
  if (!unit) return 'Unit';
  return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
}

function unifyAccount(acc: string): string {
  const a = acc.trim().toLowerCase();
  if (a === 'sales') return 'Sales';
  if (a === 'cost of goods sold') return 'Cost of Goods Sold';
  if (a === 'stock received but not billed')
    return 'Stock Received But Not Billed';
  // Capitalize first letter of each word as fallback
  return acc.replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapAccountType(zohoType: string): {
  rootType: string;
  accountType: string;
} {
  const type = zohoType.trim().toLowerCase();

  // Asset Types
  if (type === 'cash') return { rootType: 'Asset', accountType: 'Cash' };
  if (type === 'bank') return { rootType: 'Asset', accountType: 'Bank' };
  if (type === 'fixed asset')
    return { rootType: 'Asset', accountType: 'Fixed Asset' };
  if (type === 'stock') return { rootType: 'Asset', accountType: 'Stock' };
  if (
    type === 'other asset' ||
    type === 'other current asset' ||
    type === 'accounts receivable'
  ) {
    return { rootType: 'Asset', accountType: 'Receivable' };
  }

  // Expense Types
  if (type === 'expense' || type === 'other expense')
    return { rootType: 'Expense', accountType: 'Expense Account' };
  if (type === 'cost of goods sold')
    return { rootType: 'Expense', accountType: 'Cost of Goods Sold' };

  // Income Types
  if (type === 'income' || type === 'other income')
    return { rootType: 'Income', accountType: 'Income Account' };

  // Equity Types
  if (type === 'equity') return { rootType: 'Equity', accountType: 'Equity' };

  // Liability Types
  if (type === 'accounts payable')
    return { rootType: 'Liability', accountType: 'Payable' };
  if (
    type === 'long term liability' ||
    type === 'other liability' ||
    type === 'other current liability' ||
    type === 'credit card'
  ) {
    return { rootType: 'Liability', accountType: 'Payable' };
  }

  // Fallback
  return { rootType: 'Asset', accountType: 'Receivable' };
}

function convertQuote() {
  const paths = getPaths('Quote.csv', 'Quote_converted.csv');
  const inputPath = paths.input;
  const outputPath = paths.output;

  if (!existsSync(inputPath)) {
    console.log(`Zoho Quote CSV not found at: ${inputPath}, skipping.`);
    return;
  }

  console.log(`Reading Zoho Quote CSV from: ${inputPath}`);
  const csvContent = readFileSync(inputPath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error('No rows found in Zoho Quote CSV');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  // Find column indices
  const getIndex = (name: string) => header.indexOf(name);

  const idxNumber = getIndex('Quote Number');
  const idxDate = getIndex('Quote Date');
  const idxNotes = getIndex('Notes');
  const idxCustomer = getIndex('Customer Name');
  const idxSubTotal = getIndex('SubTotal');
  const idxTotal = getIndex('Total');

  const idxItemName = getIndex('Item Name');
  const idxItemDesc = getIndex('Item Desc');
  const idxQuantity = getIndex('Quantity');
  const idxItemPrice = getIndex('Item Price');
  const idxItemTotal = getIndex('Item Total');
  const idxAccount = getIndex('Account');
  const idxItemTax = getIndex('Item Tax');

  // Headers for target import model
  // Line 1: Schema labels
  const schemaLabels = [
    'SalesQuote',
    'SalesQuote',
    'SalesQuote',
    'SalesQuote',
    'SalesQuote',
    'SalesQuote',
    'SalesQuote',
    'SalesQuote',
    'SalesQuoteItem',
    'SalesQuoteItem',
    'SalesQuoteItem',
    'SalesQuoteItem',
    'SalesQuoteItem',
    'SalesQuoteItem',
    'SalesQuoteItem',
  ];
  // Line 2: Field labels
  const fieldLabels = [
    'Quote No',
    'Number Series',
    'Type',
    'Customer',
    'Date',
    'Notes',
    'Net Total',
    'Grand Total',
    'Item',
    'Description',
    'Quantity',
    'Rate',
    'Amount',
    'Account',
    'Tax',
  ];
  // Line 3: Field keys
  const fieldKeys = [
    'SalesQuote.name',
    'SalesQuote.numberSeries',
    'SalesQuote.referenceType',
    'SalesQuote.party',
    'SalesQuote.date',
    'SalesQuote.terms',
    'SalesQuote.netTotal',
    'SalesQuote.grandTotal',
    'SalesQuoteItem.item',
    'SalesQuoteItem.description',
    'SalesQuoteItem.quantity',
    'SalesQuoteItem.rate',
    'SalesQuoteItem.amount',
    'SalesQuoteItem.account',
    'SalesQuoteItem.tax',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];

  for (const row of dataRows) {
    if (!row || row.length === 0 || !row[idxNumber]) continue;

    const name = row[idxNumber] || '';
    const numberSeries = 'SQUOT-';
    const referenceType = 'Party';
    const party = row[idxCustomer] || '';
    const date = row[idxDate] || '';
    const terms = row[idxNotes] || '';

    // Totals
    const netTotal = parseFloat(row[idxSubTotal] || '0').toFixed(2);
    const grandTotal = parseFloat(row[idxTotal] || '0').toFixed(2);

    // Item child fields
    let item = row[idxItemName] || '';
    if (!item && (row[idxItemDesc] || row[idxItemTotal] || row[idxItemPrice])) {
      item = 'Services';
    }
    const description = row[idxItemDesc] || '';
    const quantity = parseFloat(row[idxQuantity] || '0').toFixed(2);
    const rate = parseFloat(row[idxItemPrice] || '0').toFixed(2);
    const amount = parseFloat(row[idxItemTotal] || '0').toFixed(2);

    const accountRaw = row[idxAccount] || 'Sales';
    const account = unifyAccount(accountRaw);

    const taxRaw = row[idxItemTax] || '';
    let tax = '';
    const taxMatch = taxRaw.match(/\d+/);
    if (taxMatch) {
      tax = `GST-${taxMatch[0]}`;
    }

    convertedRows.push([
      name,
      numberSeries,
      referenceType,
      party,
      date,
      terms,
      netTotal,
      grandTotal,
      item,
      description,
      quantity,
      rate,
      amount,
      account,
      tax,
    ]);
  }

  const outputCSV = generateCSV(convertedRows);
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(`Successfully wrote converted Zoho Quote CSV to: ${outputPath}`);
}

function convertInvoice() {
  const paths = getPaths('Invoice.csv', 'Invoice_converted.csv');
  const inputPath = paths.input;
  const outputPath = paths.output;

  if (!existsSync(inputPath)) {
    console.log(`Zoho Invoice CSV not found at: ${inputPath}, skipping.`);
    return;
  }

  console.log(`Reading Zoho Invoice CSV from: ${inputPath}`);
  const csvContent = readFileSync(inputPath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error('No rows found in Zoho Invoice CSV');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  // Find column indices
  const getIndex = (name: string) => header.indexOf(name);

  const idxNumber = getIndex('Invoice Number');
  const idxDate = getIndex('Invoice Date');
  const idxNotes = getIndex('Notes');
  const idxCustomer = getIndex('Customer Name');
  const idxCurrency = getIndex('Currency Code');
  const idxExchangeRate = getIndex('Exchange Rate');
  const idxSubTotal = getIndex('SubTotal');
  const idxTotal = getIndex('Total');

  const idxItemName = getIndex('Item Name');
  const idxItemDesc = getIndex('Item Desc');
  const idxQuantity = getIndex('Quantity');
  const idxItemPrice = getIndex('Item Price');
  const idxItemTotal = getIndex('Item Total');
  const idxAccount = getIndex('Account');
  const idxItemTax = getIndex('Item Tax');

  // Headers for target import model
  // Line 1: Schema labels
  const schemaLabels = [
    'SalesInvoice',
    'SalesInvoice',
    'SalesInvoice',
    'SalesInvoice',
    'SalesInvoice',
    'SalesInvoice',
    'SalesInvoice',
    'SalesInvoice',
    'SalesInvoice',
    'SalesInvoice',
    'SalesInvoiceItem',
    'SalesInvoiceItem',
    'SalesInvoiceItem',
    'SalesInvoiceItem',
    'SalesInvoiceItem',
    'SalesInvoiceItem',
    'SalesInvoiceItem',
  ];
  // Line 2: Field labels
  const fieldLabels = [
    'Invoice No',
    'Number Series',
    'Account',
    'Party',
    'Date',
    'Customer Currency',
    'Exchange Rate',
    'Net Total',
    'Grand Total',
    'Notes',
    'Item',
    'Description',
    'Quantity',
    'Rate',
    'Amount',
    'Account',
    'Tax',
  ];
  // Line 3: Field keys
  const fieldKeys = [
    'SalesInvoice.name',
    'SalesInvoice.numberSeries',
    'SalesInvoice.account',
    'SalesInvoice.party',
    'SalesInvoice.date',
    'SalesInvoice.currency',
    'SalesInvoice.exchangeRate',
    'SalesInvoice.netTotal',
    'SalesInvoice.grandTotal',
    'SalesInvoice.terms',
    'SalesInvoiceItem.item',
    'SalesInvoiceItem.description',
    'SalesInvoiceItem.quantity',
    'SalesInvoiceItem.rate',
    'SalesInvoiceItem.amount',
    'SalesInvoiceItem.account',
    'SalesInvoiceItem.tax',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];

  for (const row of dataRows) {
    if (!row || row.length === 0 || !row[idxNumber]) continue;

    const name = row[idxNumber] || '';
    const numberSeries = 'SINV-';
    const account = 'Debtors';
    const party = row[idxCustomer] || '';
    const date = row[idxDate] || '';
    const currency = row[idxCurrency] || 'INR';
    const exchangeRate = parseFloat(row[idxExchangeRate] || '1').toFixed(6);
    const terms = row[idxNotes] || '';

    // Totals
    const netTotal = parseFloat(row[idxSubTotal] || '0').toFixed(2);
    const grandTotal = parseFloat(row[idxTotal] || '0').toFixed(2);

    // Item child fields
    let item = row[idxItemName] || '';
    if (!item && (row[idxItemDesc] || row[idxItemTotal] || row[idxItemPrice])) {
      item = 'Services';
    }
    const description = row[idxItemDesc] || '';
    const quantity = parseFloat(row[idxQuantity] || '0').toFixed(2);
    const rate = parseFloat(row[idxItemPrice] || '0').toFixed(2);
    const amount = parseFloat(row[idxItemTotal] || '0').toFixed(2);

    const accountRaw = row[idxAccount] || 'Sales';
    const itemAccount = unifyAccount(accountRaw);

    const taxRaw = row[idxItemTax] || '';
    let tax = '';
    const taxMatch = taxRaw.match(/\d+/);
    if (taxMatch) {
      tax = `GST-${taxMatch[0]}`;
    }

    convertedRows.push([
      name,
      numberSeries,
      account,
      party,
      date,
      currency,
      exchangeRate,
      netTotal,
      grandTotal,
      terms,
      item,
      description,
      quantity,
      rate,
      amount,
      itemAccount,
      tax,
    ]);
  }

  const outputCSV = generateCSV(convertedRows);
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(
    `Successfully wrote converted Zoho Invoice CSV to: ${outputPath}`
  );
}

function convertContacts() {
  const customerPaths = getPaths('Contacts.csv', 'Contacts_converted.csv');
  const vendorPaths = getPaths('Vendors.csv', 'Contacts_converted.csv');

  const contactsMap = new Map<
    string,
    {
      name: string;
      role: string;
      email: string;
      phone: string;
      gstin: string;
      gstType: string;
    }
  >();

  const processFile = (inputPath: string, defaultRole: string) => {
    if (!existsSync(inputPath)) {
      console.log(`CSV not found at: ${inputPath}, skipping.`);
      return;
    }

    console.log(`Reading Contacts/Vendors CSV from: ${inputPath}`);
    const csvContent = readFileSync(inputPath, 'utf8');
    const rows = parseCSV(csvContent);
    if (rows.length === 0) return;

    const header = rows[0];
    const dataRows = rows.slice(1);
    const getIndex = (name: string) => header.indexOf(name);

    const idxDisplayName = getIndex('Display Name');
    const idxContactType = getIndex('Contact Type');
    const idxEmail = getIndex('EmailID');
    const idxPhone = getIndex('Phone');
    const idxMobile = getIndex('MobilePhone');
    const idxGstin = getIndex('GST Identification Number (GSTIN)');
    const idxGstTreatment = getIndex('GST Treatment');

    for (const row of dataRows) {
      if (!row || row.length === 0 || !row[idxDisplayName]) continue;

      const name = row[idxDisplayName].trim();
      const nameKey = name.toLowerCase();

      // Role: customer -> Customer, vendor -> Supplier
      let role = defaultRole;
      if (idxContactType !== -1 && row[idxContactType]) {
        const typeRaw = row[idxContactType].toLowerCase();
        role = typeRaw === 'vendor' ? 'Supplier' : 'Customer';
      }

      const email = idxEmail !== -1 ? row[idxEmail] || '' : '';
      const phone =
        (idxMobile !== -1 ? row[idxMobile] : '') ||
        (idxPhone !== -1 ? row[idxPhone] : '') ||
        '';
      const gstin = idxGstin !== -1 ? row[idxGstin] || '' : '';

      // GST Type mapping
      const gstTreatmentRaw =
        idxGstTreatment !== -1
          ? (row[idxGstTreatment] || '').toLowerCase()
          : '';
      let gstType = 'Unregistered';
      if (gstTreatmentRaw.includes('gst')) {
        gstType = 'Registered Regular';
      } else if (gstTreatmentRaw.includes('consumer')) {
        gstType = 'Consumer';
      }

      const existing = contactsMap.get(nameKey);
      if (existing) {
        // If it exists and the role is different, update to "Both"
        if (existing.role !== role) {
          existing.role = 'Both';
        }
        if (!existing.email && email) existing.email = email;
        if (!existing.phone && phone) existing.phone = phone;
        if (!existing.gstin && gstin) existing.gstin = gstin;
        if (existing.gstType === 'Unregistered' && gstType !== 'Unregistered')
          existing.gstType = gstType;
      } else {
        contactsMap.set(nameKey, {
          name,
          role,
          email,
          phone,
          gstin,
          gstType,
        });
      }
    }
  };

  processFile(customerPaths.input, 'Customer');
  processFile(vendorPaths.input, 'Supplier');

  // Headers for target import model
  const schemaLabels = [
    'Party',
    'Party',
    'Party',
    'Party',
    'Party',
    'Party',
    'Party',
  ];
  const fieldLabels = [
    'Name',
    'Role',
    'Email',
    'Phone',
    'GSTIN No.',
    'GST Registration',
    'Address',
  ];
  const fieldKeys = [
    'Party.name',
    'Party.role',
    'Party.email',
    'Party.phone',
    'Party.gstin',
    'Party.gstType',
    'Party.address',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];

  for (const contact of contactsMap.values()) {
    convertedRows.push([
      contact.name,
      contact.role,
      contact.email,
      contact.phone,
      contact.gstin,
      contact.gstType,
      contact.name,
    ]);
  }

  const outputPath = customerPaths.output;
  const outputCSV = generateCSV(convertedRows);
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(
    `Successfully wrote converted Zoho Contacts CSV to: ${outputPath}`
  );
}

function convertAddress() {
  const customerPaths = getPaths('Address.csv', 'Address_converted.csv');
  const vendorPaths = getPaths('Address (1).csv', 'Address_converted.csv');
  const contactsPaths = getPaths('Contacts.csv', 'Address_converted.csv');
  const vendorsPaths = getPaths('Vendors.csv', 'Address_converted.csv');

  const schemaLabels = [
    'Address',
    'Address',
    'Address',
    'Address',
    'Address',
    'Address',
    'Address',
    'Address',
    'Address',
    'Address',
  ];
  const fieldLabels = [
    'Address Name',
    'Address Line 1',
    'Address Line 2',
    'City / Town',
    'Country',
    'State',
    'Postal Code',
    'Phone',
    'Fax',
    'Place of Supply',
  ];
  const fieldKeys = [
    'Address.name',
    'Address.addressLine1',
    'Address.addressLine2',
    'Address.city',
    'Address.country',
    'Address.state',
    'Address.postalCode',
    'Address.phone',
    'Address.fax',
    'Address.pos',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];
  const seenNames = new Set<string>();

  const stateList = {
    '01': 'Jammu and Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '26': 'Dadra and Nagar Haveli and Daman and Diu',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
  } as Record<string, string>;

  const normalizeState = (stateStr: string): string => {
    if (!stateStr) return 'Tamil Nadu';
    const clean = stateStr.trim().toLowerCase();

    // Direct mappings for common variants/codes
    if (clean === 'tamil' || clean === 'tn' || clean === 'tamilnadu')
      return 'Tamil Nadu';
    if (clean === 'orissa' || clean === 'odisha' || clean === 'od')
      return 'Odisha';
    if (clean === 'pondicherry' || clean === 'py') return 'Puducherry';
    if (clean === 'up') return 'Uttar Pradesh';
    if (clean === 'ap') return 'Andhra Pradesh';
    if (clean === 'mh' || clean === 'maharashtra') return 'Maharashtra';
    if (clean === 'dl' || clean === 'delhi') return 'Delhi';
    if (clean === 'ka' || clean === 'karnataka') return 'Karnataka';
    if (clean === 'kl' || clean === 'kerala') return 'Kerala';
    if (clean === 'ts' || clean === 'telangana') return 'Telangana';
    if (clean === 'wb' || clean === 'west bengal') return 'West Bengal';
    if (clean === 'gj' || clean === 'gujarat') return 'Gujarat';
    if (clean === 'mp' || clean === 'madhya pradesh') return 'Madhya Pradesh';

    // Substring or exact match
    const states = Object.values(stateList);
    for (const s of states) {
      if (
        s.toLowerCase() === clean ||
        s.toLowerCase().includes(clean) ||
        clean.includes(s.toLowerCase())
      ) {
        return s;
      }
    }

    // Numeric state code check
    if ((stateList as Record<string, string>)[stateStr]) {
      return (stateList as Record<string, string>)[stateStr];
    }
    const padded = stateStr.padStart(2, '0');
    if ((stateList as Record<string, string>)[padded]) {
      return (stateList as Record<string, string>)[padded];
    }

    return stateStr.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Helper to map and push addresses
  const addAddress = (
    name: string,
    addrLine1: string,
    addrLine2: string,
    cityVal: string,
    countryVal: string,
    stateVal: string,
    postalVal: string,
    phoneVal: string,
    faxVal: string,
    posRawVal: string
  ) => {
    const nameKey = name.trim().toLowerCase();
    if (!name.trim() || seenNames.has(nameKey)) return;
    seenNames.add(nameKey);

    const addressLine1 = addrLine1 || cityVal || 'No Address';
    const addressLine2 = addrLine2 || '';
    const city = cityVal || 'Unknown';
    const country = countryVal || 'India';
    const state = normalizeState(stateVal);
    const postalCode = postalVal || '';
    const phone = phoneVal || '';
    const fax = faxVal || '';

    let pos = 'Tamil Nadu';
    if (posRawVal) {
      pos =
        stateList[posRawVal] ||
        stateList[posRawVal.padStart(2, '0')] ||
        normalizeState(posRawVal);
    } else {
      pos = state || 'Tamil Nadu';
    }

    convertedRows.push([
      name.trim(),
      addressLine1,
      addressLine2,
      city,
      country,
      state,
      postalCode,
      phone,
      fax,
      pos,
    ]);
  };

  const processFile = (inputPath: string) => {
    if (!existsSync(inputPath)) return;
    console.log(`Reading Zoho Address CSV from: ${inputPath}`);
    const csvContent = readFileSync(inputPath, 'utf8');
    const rows = parseCSV(csvContent);
    if (rows.length === 0) return;

    const header = rows[0];
    const dataRows = rows.slice(1);

    const getIndex = (name: string) => header.indexOf(name);
    const idxName = getIndex('Display Name');
    const idxAddress = getIndex('Address');
    const idxStreet2 = getIndex('Street2');
    const idxCity = getIndex('City');
    const idxState = getIndex('State');
    const idxCountry = getIndex('Country');
    const idxCode = getIndex('Code');
    const idxPhone = getIndex('Phone');
    const idxFax = getIndex('Fax');
    const idxPlaceOfSupply = getIndex('Place Of Supply');

    for (const row of dataRows) {
      if (!row || row.length === 0 || !row[idxName]) continue;
      addAddress(
        row[idxName],
        row[idxAddress],
        row[idxStreet2],
        row[idxCity],
        row[idxCountry],
        row[idxState],
        row[idxCode],
        row[idxPhone],
        row[idxFax],
        row[idxPlaceOfSupply]
      );
    }
  };

  processFile(customerPaths.input);
  processFile(vendorPaths.input);

  // Fallback: Read Contacts.csv and Vendors.csv to inject missing addresses
  const processContactsFallback = (inputPath: string) => {
    if (!existsSync(inputPath)) return;
    console.log(
      `Reading Fallback Addresses from Contact/Vendor CSV: ${inputPath}`
    );
    const csvContent = readFileSync(inputPath, 'utf8');
    const rows = parseCSV(csvContent);
    if (rows.length === 0) return;

    const header = rows[0];
    const dataRows = rows.slice(1);
    const getIndex = (name: string) => header.indexOf(name);

    const idxName = getIndex('Display Name');
    const idxAddr = getIndex('Billing Address');
    const idxStreet2 = getIndex('Billing Street2');
    const idxCity = getIndex('Billing City');
    const idxState = getIndex('Billing State');
    const idxCountry = getIndex('Billing Country');
    const idxCode = getIndex('Billing Code');
    const idxPhone = getIndex('Billing Phone');
    const idxFax = getIndex('Billing Fax');

    for (const row of dataRows) {
      if (!row || row.length === 0 || !row[idxName]) continue;
      const name = row[idxName].trim();
      if (!seenNames.has(name.toLowerCase())) {
        const addrLine1 = idxAddr !== -1 ? row[idxAddr] : '';
        const addrLine2 = idxStreet2 !== -1 ? row[idxStreet2] : '';
        const city = idxCity !== -1 ? row[idxCity] : '';
        const state = idxState !== -1 ? row[idxState] : '';
        const country = idxCountry !== -1 ? row[idxCountry] : '';
        const code = idxCode !== -1 ? row[idxCode] : '';
        const phone = idxPhone !== -1 ? row[idxPhone] : '';
        const fax = idxFax !== -1 ? row[idxFax] : '';

        addAddress(
          name,
          addrLine1,
          addrLine2,
          city,
          country,
          state,
          code,
          phone,
          fax,
          state
        );
      }
    }
  };

  processContactsFallback(contactsPaths.input);
  processContactsFallback(vendorsPaths.input);

  const outputCSV = generateCSV(convertedRows);
  const outputPath = customerPaths.output;
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(
    `Successfully wrote converted Zoho Address CSV to: ${outputPath}`
  );
}

function convertExpense() {
  const paths = getPaths('Expense.csv', 'Expense_converted.csv');
  const inputPath = paths.input;
  const outputPath = paths.output;

  if (!existsSync(inputPath)) {
    console.log(`Zoho Expense CSV not found at: ${inputPath}, skipping.`);
    return;
  }

  console.log(`Reading Zoho Expense CSV from: ${inputPath}`);
  const csvContent = readFileSync(inputPath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error('No rows found in Zoho Expense CSV');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  const getIndex = (name: string) => header.indexOf(name);

  const idxDate = getIndex('Expense Date');
  const idxDesc = getIndex('Expense Description');
  const idxExpenseAcc = getIndex('Expense Account');
  const idxPaidThrough = getIndex('Paid Through');
  const idxEntryNo = getIndex('Entry Number');
  const idxAmount = getIndex('Expense Amount');

  // Headers for target import model (JournalEntry)
  const schemaLabels = [
    'JournalEntry',
    'JournalEntry',
    'JournalEntry',
    'JournalEntry',
    'JournalEntry',
    'JournalEntry',
    'JournalEntryAccount',
    'JournalEntryAccount',
    'JournalEntryAccount',
  ];
  const fieldLabels = [
    'Entry No',
    'Number Series',
    'Entry Type',
    'Date',
    'User Remark',
    'Submitted',
    'Account',
    'Debit',
    'Credit',
  ];
  const fieldKeys = [
    'JournalEntry.name',
    'JournalEntry.numberSeries',
    'JournalEntry.entryType',
    'JournalEntry.date',
    'JournalEntry.userRemark',
    'JournalEntry.submitted',
    'JournalEntryAccount.account',
    'JournalEntryAccount.debit',
    'JournalEntryAccount.credit',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];

  for (const row of dataRows) {
    if (!row || row.length === 0 || !row[idxEntryNo]) continue;

    const entryNo = 'EXP-' + row[idxEntryNo].trim();
    const date = row[idxDate] || '';
    const desc = row[idxDesc] || '';
    const expenseAcc = unifyAccount(row[idxExpenseAcc] || 'Other Expenses');
    const paidThrough = unifyAccount(row[idxPaidThrough] || 'Petty Cash');
    const amount = parseFloat(row[idxAmount] || '0').toFixed(2);

    if (parseFloat(amount) === 0) continue;

    // Debit row
    convertedRows.push([
      entryNo,
      'JV-',
      'Journal Entry',
      date,
      desc,
      '1',
      expenseAcc,
      amount,
      '0.00',
    ]);

    // Credit row
    convertedRows.push([
      entryNo,
      'JV-',
      'Journal Entry',
      date,
      desc,
      '1',
      paidThrough,
      '0.00',
      amount,
    ]);
  }

  const outputCSV = generateCSV(convertedRows);
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(
    `Successfully wrote converted Zoho Expense CSV to: ${outputPath}`
  );
}

function convertBill() {
  const paths = getPaths('Bill.csv', 'Bill_converted.csv');
  const inputPath = paths.input;
  const outputPath = paths.output;

  if (!existsSync(inputPath)) {
    console.log(`Zoho Bill CSV not found at: ${inputPath}, skipping.`);
    return;
  }

  console.log(`Reading Zoho Bill CSV from: ${inputPath}`);
  const csvContent = readFileSync(inputPath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error('No rows found in Zoho Bill CSV');
    return;
  }

  const header = rows[0];
  const dataRows = rows.slice(1);

  const getIndex = (name: string) => header.indexOf(name);

  const idxNumber = getIndex('Bill Number');
  const idxDate = getIndex('Bill Date');
  const idxNotes = getIndex('Vendor Notes');
  const idxVendor = getIndex('Vendor Name');
  const idxCurrency = getIndex('Currency Code');
  const idxExchangeRate = getIndex('Exchange Rate');
  const idxSubTotal = getIndex('SubTotal');
  const idxTotal = getIndex('Total');

  const idxItemName = getIndex('Item Name');
  const idxItemDesc = getIndex('Description');
  const idxQuantity = getIndex('Quantity');
  const idxItemPrice = getIndex('Rate');
  const idxItemTotal = getIndex('Item Total');
  const idxAccount = getIndex('Account');
  const idxItemTax = getIndex('Tax Name');

  // Headers for target import model
  const schemaLabels = [
    'PurchaseInvoice',
    'PurchaseInvoice',
    'PurchaseInvoice',
    'PurchaseInvoice',
    'PurchaseInvoice',
    'PurchaseInvoice',
    'PurchaseInvoice',
    'PurchaseInvoice',
    'PurchaseInvoice',
    'PurchaseInvoice',
    'PurchaseInvoiceItem',
    'PurchaseInvoiceItem',
    'PurchaseInvoiceItem',
    'PurchaseInvoiceItem',
    'PurchaseInvoiceItem',
    'PurchaseInvoiceItem',
    'PurchaseInvoiceItem',
  ];
  const fieldLabels = [
    'Bill No',
    'Number Series',
    'Account',
    'Party',
    'Date',
    'Supplier Currency',
    'Exchange Rate',
    'Net Total',
    'Grand Total',
    'Notes',
    'Item',
    'Description',
    'Quantity',
    'Rate',
    'Amount',
    'Account',
    'Tax',
  ];
  const fieldKeys = [
    'PurchaseInvoice.name',
    'PurchaseInvoice.numberSeries',
    'PurchaseInvoice.account',
    'PurchaseInvoice.party',
    'PurchaseInvoice.date',
    'PurchaseInvoice.currency',
    'PurchaseInvoice.exchangeRate',
    'PurchaseInvoice.netTotal',
    'PurchaseInvoice.grandTotal',
    'PurchaseInvoice.terms',
    'PurchaseInvoiceItem.item',
    'PurchaseInvoiceItem.description',
    'PurchaseInvoiceItem.quantity',
    'PurchaseInvoiceItem.rate',
    'PurchaseInvoiceItem.amount',
    'PurchaseInvoiceItem.account',
    'PurchaseInvoiceItem.tax',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];

  for (const row of dataRows) {
    if (!row || row.length === 0 || !row[idxNumber]) continue;

    const name = row[idxNumber] || '';
    const numberSeries = 'PINV-';
    const account = 'Creditors';
    const party = row[idxVendor] || '';
    const date = row[idxDate] || '';
    const currency = row[idxCurrency] || 'INR';
    const exchangeRate = parseFloat(row[idxExchangeRate] || '1').toFixed(6);
    const terms = row[idxNotes] || '';

    // Totals
    const netTotal = parseFloat(row[idxSubTotal] || '0').toFixed(2);
    const grandTotal = parseFloat(row[idxTotal] || '0').toFixed(2);

    // Item child fields
    let item = row[idxItemName] || '';
    if (!item && (row[idxItemDesc] || row[idxItemTotal] || row[idxItemPrice])) {
      item = 'Services';
    }
    const description = row[idxItemDesc] || '';
    const quantity = parseFloat(row[idxQuantity] || '0').toFixed(2);
    const rate = parseFloat(row[idxItemPrice] || '0').toFixed(2);
    const amount = parseFloat(row[idxItemTotal] || '0').toFixed(2);

    const accountRaw = row[idxAccount] || 'Cost of Goods Sold';
    const itemAccount = unifyAccount(accountRaw);

    const taxRaw = row[idxItemTax] || '';
    let tax = '';
    const taxMatch = taxRaw.match(/\d+/);
    if (taxMatch) {
      tax = `GST-${taxMatch[0]}`;
    }

    convertedRows.push([
      name,
      numberSeries,
      account,
      party,
      date,
      currency,
      exchangeRate,
      netTotal,
      grandTotal,
      terms,
      item,
      description,
      quantity,
      rate,
      amount,
      itemAccount,
      tax,
    ]);
  }

  const outputCSV = generateCSV(convertedRows);
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(`Successfully wrote converted Zoho Bill CSV to: ${outputPath}`);
}

function convertVendorPayment() {
  const paths = getPaths('Vendor_Payment.csv', 'Vendor_Payment_converted.csv');
  const inputPath = paths.input;
  const outputPath = paths.output;

  if (!existsSync(inputPath)) {
    console.log(
      `Zoho Vendor Payment CSV not found at: ${inputPath}, skipping.`
    );
    return;
  }

  console.log(`Reading Zoho Vendor Payment CSV from: ${inputPath}`);
  const csvContent = readFileSync(inputPath, 'utf8');
  const rows = parseCSV(csvContent);
  if (rows.length === 0) return;

  const header = rows[0];
  const dataRows = rows.slice(1);

  const getIndex = (name: string) => header.indexOf(name);
  const idxNumber = getIndex('Payment Number');
  const idxMode = getIndex('Mode');
  const idxAmount = getIndex('Amount');
  const idxDate = getIndex('Date');
  const idxVendor = getIndex('Vendor Name');
  const idxPaidThrough = getIndex('Paid Through');
  const idxBillNumber = getIndex('Bill Number');
  const idxRefNumber = getIndex('Reference Number');

  const schemaLabels = [
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'PaymentFor',
    'PaymentFor',
    'PaymentFor',
  ];
  const fieldLabels = [
    'Payment No',
    'Number Series',
    'Payment Type',
    'Party',
    'Amount',
    'Payment Method',
    'From Account',
    'To Account',
    'Ref. Type',
    'Date',
    'Clearance Date',
    'Reference Id',
    'Reference Type',
    'Reference Name',
    'Amount',
  ];
  const fieldKeys = [
    'Payment.name',
    'Payment.numberSeries',
    'Payment.paymentType',
    'Payment.party',
    'Payment.amount',
    'Payment.paymentMethod',
    'Payment.account',
    'Payment.paymentAccount',
    'Payment.referenceType',
    'Payment.date',
    'Payment.clearanceDate',
    'Payment.referenceId',
    'PaymentFor.referenceType',
    'PaymentFor.referenceName',
    'PaymentFor.amount',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];

  for (const row of dataRows) {
    if (!row || row.length === 0 || !row[idxNumber]) continue;

    const name = 'VPAY-' + (row[idxNumber] || '').trim();
    const paymentType = 'Pay';
    const party = (row[idxVendor] || '').trim();
    const amount = parseFloat(row[idxAmount] || '0').toFixed(2);
    const paymentMethod = (row[idxMode] || '').trim() || 'Cash';
    const account = unifyAccount((row[idxPaidThrough] || 'Petty Cash').trim());
    const paymentAccount = 'Creditors';
    const date = (row[idxDate] || '').trim();
    const referenceName = (row[idxBillNumber] || '').trim();
    const refType = referenceName ? 'PurchaseInvoice' : '';
    const allocationAmount = referenceName ? amount : '';

    const clearanceDate = date;
    const referenceId =
      (row[idxRefNumber] || '').trim() ||
      row[idxNumber].trim() ||
      'REF-' + row[idxNumber].trim();

    convertedRows.push([
      name,
      'VPAY-',
      paymentType,
      party,
      amount,
      paymentMethod,
      account,
      paymentAccount,
      'PurchaseInvoice',
      date,
      clearanceDate,
      referenceId,
      refType,
      referenceName,
      allocationAmount,
    ]);
  }

  const outputCSV = generateCSV(convertedRows);
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(
    `Successfully wrote converted Zoho Vendor Payment CSV to: ${outputPath}`
  );
}

function convertCustomerPayment() {
  const paths = getPaths(
    'Customer_Payment.csv',
    'Customer_Payment_converted.csv'
  );
  const inputPath = paths.input;
  const outputPath = paths.output;

  if (!existsSync(inputPath)) {
    console.log(
      `Zoho Customer Payment CSV not found at: ${inputPath}, skipping.`
    );
    return;
  }

  console.log(`Reading Zoho Customer Payment CSV from: ${inputPath}`);
  const csvContent = readFileSync(inputPath, 'utf8');
  const rows = parseCSV(csvContent);
  if (rows.length === 0) return;

  const header = rows[0];
  const dataRows = rows.slice(1);

  const getIndex = (name: string) => header.indexOf(name);
  const idxNumber = getIndex('Payment Number');
  const idxMode = getIndex('Mode');
  const idxAmount = getIndex('Amount');
  const idxDate = getIndex('Date');
  const idxCustomer = getIndex('Customer Name');
  const idxDepositTo = getIndex('Deposit To');
  const idxInvoiceNumber = getIndex('Invoice Number');
  const idxRefNumber = getIndex('Reference Number');
  const idxAmountApplied = getIndex('Amount Applied to Invoice');

  const schemaLabels = [
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'Payment',
    'PaymentFor',
    'PaymentFor',
    'PaymentFor',
  ];
  const fieldLabels = [
    'Payment No',
    'Number Series',
    'Payment Type',
    'Party',
    'Amount',
    'Payment Method',
    'From Account',
    'To Account',
    'Ref. Type',
    'Date',
    'Clearance Date',
    'Reference Id',
    'Reference Type',
    'Reference Name',
    'Amount',
  ];
  const fieldKeys = [
    'Payment.name',
    'Payment.numberSeries',
    'Payment.paymentType',
    'Payment.party',
    'Payment.amount',
    'Payment.paymentMethod',
    'Payment.account',
    'Payment.paymentAccount',
    'Payment.referenceType',
    'Payment.date',
    'Payment.clearanceDate',
    'Payment.referenceId',
    'PaymentFor.referenceType',
    'PaymentFor.referenceName',
    'PaymentFor.amount',
  ];

  const convertedRows: string[][] = [schemaLabels, fieldLabels, fieldKeys];

  for (const row of dataRows) {
    if (!row || row.length === 0 || !row[idxNumber]) continue;

    const name = 'CPAY-' + (row[idxNumber] || '').trim();
    const paymentType = 'Receive';
    const party = (row[idxCustomer] || '').trim();
    const amount = parseFloat(row[idxAmount] || '0').toFixed(2);
    const paymentMethod = (row[idxMode] || '').trim() || 'Cash';
    const account = 'Debtors';
    const paymentAccount = unifyAccount(
      (row[idxDepositTo] || 'Petty Cash').trim()
    );
    const date = (row[idxDate] || '').trim();
    const referenceName = (row[idxInvoiceNumber] || '').trim();
    const refType = referenceName ? 'SalesInvoice' : '';

    // Use the actual applied amount instead of the total payment amount
    const allocationAmount = referenceName
      ? parseFloat(row[idxAmountApplied] || '0').toFixed(2)
      : '';

    const clearanceDate = date;
    const referenceId =
      (row[idxRefNumber] || '').trim() ||
      row[idxNumber].trim() ||
      'REF-' + row[idxNumber].trim();

    convertedRows.push([
      name,
      'CPAY-',
      paymentType,
      party,
      amount,
      paymentMethod,
      account,
      paymentAccount,
      'SalesInvoice',
      date,
      clearanceDate,
      referenceId,
      refType,
      referenceName,
      allocationAmount,
    ]);
  }

  const outputCSV = generateCSV(convertedRows);
  writeFileSync(outputPath, outputCSV, 'utf8');
  console.log(
    `Successfully wrote converted Zoho Customer Payment CSV to: ${outputPath}`
  );
}

convert();
convertJournal();
convertCOA();
convertQuote();
convertInvoice();
convertContacts();
convertAddress();
convertExpense();
convertBill();
convertVendorPayment();
convertCustomerPayment();
