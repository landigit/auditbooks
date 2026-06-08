import {
  sqliteTable,
  AnySQLiteColumn,
  text,
  real,
  numeric,
  integer,
  foreignKey,
  index,
} from 'drizzle-orm/sqlite-core';

export const printTemplate = sqliteTable('PrintTemplate', {
  name: text().primaryKey().notNull(),
  type: text().default('SalesInvoice').notNull(),
  template: text().notNull(),
  height: real().default(29.7),
  width: real().default(21),
  isCustom: numeric().default('1'),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const color = sqliteTable('Color', {
  name: text().primaryKey().notNull(),
  hexvalue: text().notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const currency = sqliteTable('Currency', {
  name: text().primaryKey().notNull(),
  fraction: text(),
  fractionUnits: integer(),
  smallestValue: text(),
  symbol: text(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const numberSeries = sqliteTable('NumberSeries', {
  name: text().primaryKey().notNull(),
  start: integer().default(1001).notNull(),
  padZeros: integer().default(4).notNull(),
  referenceType: text().default('-').notNull(),
  current: integer().notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const serialNumberSeries = sqliteTable('SerialNumberSeries', {
  name: text().primaryKey().notNull(),
  start: integer().default(1001).notNull(),
  padZeros: integer().default(4).notNull(),
  current: integer().notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const batchSeries = sqliteTable('BatchSeries', {
  name: text().primaryKey().notNull(),
  start: integer().default(1001).notNull(),
  padZeros: integer().default(4).notNull(),
  current: integer().notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const account = sqliteTable(
  'Account',
  {
    name: text().primaryKey().notNull(),
    rootType: text().notNull(),
    parentAccount: text(),
    accountType: text(),
    isGroup: numeric().default('0'),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    created: numeric().notNull(),
    modified: numeric().notNull(),
    lft: integer().notNull(),
    rgt: integer().notNull(),
  },
  (table) => [
    foreignKey(() => ({
      columns: [table.parentAccount],
      foreignColumns: [table.name],
      name: 'Account_parentAccount_Account_name_fk',
    }))
      .onUpdate('cascade')
      .onDelete('restrict'),
  ]
);

export const accountingLedgerEntry = sqliteTable(
  'AccountingLedgerEntry',
  {
    name: text().primaryKey().notNull(),
    date: numeric(),
    party: text().references(() => party.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    account: text()
      .notNull()
      .references(() => account.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    debit: text(),
    credit: text(),
    referenceType: text(),
    referenceName: text(),
    reverted: numeric().default('0'),
    reverts: text(),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    created: numeric().notNull(),
    modified: numeric().notNull(),
  },
  (table) => [
    index('AccountingLedgerEntry_account_idx').on(table.account),
    index('AccountingLedgerEntry_party_idx').on(table.party),
    index('AccountingLedgerEntry_date_idx').on(table.date),
    foreignKey(() => ({
      columns: [table.reverts],
      foreignColumns: [table.name],
      name: 'AccountingLedgerEntry_reverts_AccountingLedgerEntry_name_fk',
    }))
      .onUpdate('cascade')
      .onDelete('restrict'),
  ]
);

export const lead = sqliteTable('Lead', {
  name: text().primaryKey().notNull(),
  status: text().default('Open').notNull(),
  email: text(),
  mobile: text(),
  address: text().references(() => address.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const address = sqliteTable('Address', {
  name: text().primaryKey().notNull(),
  addressLine1: text().notNull(),
  addressLine2: text(),
  city: text().notNull(),
  country: text().notNull(),
  state: text(),
  postalCode: text(),
  emailAddress: text(),
  phone: text(),
  fax: text(),
  addressDisplay: text(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
  pos: text(),
});

export const itemGroup = sqliteTable('ItemGroup', {
  image: text(),
  name: text().primaryKey().notNull(),
  tax: text().references(() => tax.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  hsnCode: text(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const uom = sqliteTable('UOM', {
  name: text().primaryKey().notNull(),
  isWhole: numeric().default('0'),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const uomConversionItem = sqliteTable(
  'UOMConversionItem',
  {
    name: text().primaryKey().notNull(),
    uom: text()
      .notNull()
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    conversionFactor: real().default(1).notNull(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('UOMConversionItem_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const loyaltyProgram = sqliteTable('LoyaltyProgram', {
  name: text().primaryKey().notNull(),
  fromDate: numeric().notNull(),
  toDate: numeric().notNull(),
  isEnabled: numeric().default('1').notNull(),
  conversionFactor: real().default(1).notNull(),
  expiryDuration: integer().default(1),
  expenseAccount: text()
    .notNull()
    .references(() => account.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  maximumUse: integer().default(0),
  used: integer().default(0),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const loyaltyPointEntry = sqliteTable('LoyaltyPointEntry', {
  name: text().primaryKey().notNull(),
  loyaltyProgram: text().notNull(),
  loyaltyProgramTier: text(),
  customer: text()
    .notNull()
    .references(() => party.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  invoice: text()
    .notNull()
    .references(() => salesInvoice.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  loyaltyPoints: integer(),
  purchaseAmount: text().notNull(),
  expiryDate: numeric(),
  postingDate: numeric(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const collectionRulesItems = sqliteTable(
  'CollectionRulesItems',
  {
    name: text().primaryKey().notNull(),
    tierName: text(),
    collectionFactor: real(),
    minimumTotalSpent: text(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('CollectionRulesItems_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const payment = sqliteTable('Payment', {
  name: text().primaryKey().notNull(),
  numberSeries: text()
    .default('PAY-')
    .notNull()
    .references(() => numberSeries.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  party: text()
    .notNull()
    .references(() => party.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  date: numeric().notNull(),
  paymentType: text().notNull(),
  account: text()
    .notNull()
    .references(() => account.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  paymentAccount: text()
    .notNull()
    .references(() => account.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  paymentMethod: text()
    .default('Cash')
    .notNull()
    .references(() => paymentMethod.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  clearanceDate: numeric(),
  referenceId: text(),
  referenceDate: numeric(),
  amount: text().notNull(),
  writeoff: text(),
  attachment: text(),
  referenceType: text(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
  submitted: numeric().notNull(),
  cancelled: numeric().notNull(),
});

export const paymentMethod = sqliteTable('PaymentMethod', {
  name: text().primaryKey(),
  type: text().notNull(),
  account: text().references(() => account.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const paymentFor = sqliteTable(
  'PaymentFor',
  {
    name: text().primaryKey().notNull(),
    referenceType: text().notNull(),
    referenceName: text().notNull(),
    amount: text().notNull(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('PaymentFor_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const journalEntry = sqliteTable('JournalEntry', {
  name: text().primaryKey().notNull(),
  numberSeries: text()
    .default('JV-')
    .notNull()
    .references(() => numberSeries.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  entryType: text().notNull(),
  date: numeric().notNull(),
  referenceNumber: text(),
  referenceDate: numeric(),
  userRemark: text(),
  attachment: text(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
  submitted: numeric().notNull(),
  cancelled: numeric().notNull(),
});

export const journalEntryAccount = sqliteTable(
  'JournalEntryAccount',
  {
    name: text().primaryKey().notNull(),
    account: text()
      .notNull()
      .references(() => account.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    debit: text(),
    credit: text(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('JournalEntryAccount_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const itemEnquiry = sqliteTable('ItemEnquiry', {
  name: text().primaryKey().notNull(),
  item: text().notNull(),
  customer: text(),
  contact: text(),
  description: text(),
  similarProduct: text(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const couponCode = sqliteTable('CouponCode', {
  name: text().primaryKey().notNull(),
  couponName: text().notNull(),
  isEnabled: numeric().default('1').notNull(),
  pricingRule: text()
    .notNull()
    .references(() => pricingRule.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  minAmount: text(),
  maxAmount: text(),
  validFrom: numeric().notNull(),
  validTo: numeric().notNull(),
  maximumUse: integer().default(0).notNull(),
  used: integer().default(0).notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const appliedCouponCodes = sqliteTable(
  'AppliedCouponCodes',
  {
    name: text().primaryKey().notNull(),
    coupons: text().references(() => couponCode.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('AppliedCouponCodes_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const priceList = sqliteTable('PriceList', {
  name: text().primaryKey().notNull(),
  isEnabled: numeric().default('1'),
  isSales: numeric().default('1'),
  isPurchase: numeric().default('0'),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const priceListItem = sqliteTable(
  'PriceListItem',
  {
    name: text().primaryKey().notNull(),
    item: text()
      .notNull()
      .references(() => item.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    unit: text().references(() => uom.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    rate: text().notNull(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('PriceListItem_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const pricingRule = sqliteTable('PricingRule', {
  name: text().primaryKey().notNull(),
  numberSeries: text()
    .default('PRLE-')
    .notNull()
    .references(() => numberSeries.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  isEnabled: numeric().default('1'),
  title: text().notNull(),
  discountType: text().notNull(),
  isCouponCodeBased: numeric().default('0'),
  priority: text().notNull(),
  priceDiscountType: text(),
  discountRate: text(),
  discountPercentage: real(),
  discountAmount: text(),
  freeItem: text().references(() => item.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  freeItemQuantity: real(),
  freeItemUnit: text().references(() => uom.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  roundFreeItemQty: numeric().default('0'),
  roundingMethod: text().default('round').notNull(),
  isRecursive: numeric().default('0'),
  recurseEvery: real(),
  minQuantity: real(),
  maxQuantity: real(),
  minAmount: text(),
  maxAmount: text(),
  validFrom: numeric(),
  validTo: numeric(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const pricingRuleItem = sqliteTable(
  'PricingRuleItem',
  {
    name: text().primaryKey().notNull(),
    item: text()
      .notNull()
      .references(() => item.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    unit: text().references(() => uom.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('PricingRuleItem_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const pricingRuleDetail = sqliteTable(
  'PricingRuleDetail',
  {
    name: text().primaryKey().notNull(),
    referenceName: text().references(() => pricingRule.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    referenceItem: text().references(() => item.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('PricingRuleDetail_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const tax = sqliteTable('Tax', {
  name: text().primaryKey().notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const taxDetail = sqliteTable(
  'TaxDetail',
  {
    name: text().primaryKey().notNull(),
    account: text()
      .notNull()
      .references(() => account.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    paymentAccount: text('payment_account').references(() => account.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    rate: real().notNull(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('TaxDetail_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const taxSummary = sqliteTable(
  'TaxSummary',
  {
    name: text().primaryKey().notNull(),
    account: text()
      .notNull()
      .references(() => account.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    fromAccount: text('from_account').references(() => account.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    rate: real().notNull(),
    amount: text().notNull(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('TaxSummary_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const location = sqliteTable('Location', {
  name: text().primaryKey().notNull(),
  address: text().references(() => address.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const stockLedgerEntry = sqliteTable('StockLedgerEntry', {
  name: text().primaryKey().notNull(),
  date: numeric(),
  location: text().references(() => location.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  batch: text().references(() => batch.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  serialNumber: text().references(() => serialNumber.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  item: text().references(() => item.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  rate: text(),
  quantity: real(),
  referenceType: text(),
  referenceName: text(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const stockMovement = sqliteTable('StockMovement', {
  name: text().primaryKey().notNull(),
  numberSeries: text()
    .default('SMOV-')
    .notNull()
    .references(() => numberSeries.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  movementType: text().notNull(),
  date: numeric().notNull(),
  amount: text(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
  submitted: numeric().notNull(),
  cancelled: numeric().notNull(),
});

export const stockMovementItem = sqliteTable(
  'StockMovementItem',
  {
    name: text().primaryKey().notNull(),
    item: text()
      .notNull()
      .references(() => item.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    fromLocation: text().references(() => location.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    toLocation: text().references(() => location.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    transferUnit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    transferQuantity: real().default(1).notNull(),
    unit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    batch: text().references(() => batch.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    serialNumber: text(),
    quantity: real().default(1).notNull(),
    unitConversionFactor: real().default(1).notNull(),
    rate: text().notNull(),
    amount: text(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('StockMovementItem_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const batch = sqliteTable('Batch', {
  name: text().primaryKey().notNull(),
  item: text().references(() => item.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  expiryDate: numeric(),
  manufactureDate: numeric(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const serialNumber = sqliteTable('SerialNumber', {
  name: text().primaryKey().notNull(),
  item: text()
    .notNull()
    .references(() => item.name, { onDelete: 'restrict', onUpdate: 'cascade' }),
  description: text(),
  status: text().default('Inactive'),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const customForm = sqliteTable('CustomForm', {
  name: text().primaryKey().notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const customField = sqliteTable(
  'CustomField',
  {
    name: text().primaryKey().notNull(),
    label: text().notNull(),
    fieldname: text().notNull(),
    fieldtype: text().default('Data').notNull(),
    isRequired: numeric().default('0'),
    default: text(),
    section: text().default('Default'),
    tab: text().default('Custom'),
    options: text(),
    target: text(),
    references: text(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('CustomField_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const posProfile = sqliteTable('POSProfile', {
  name: text().primaryKey(),
  posCustomer: text().references(() => party.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  inventory: text()
    .notNull()
    .references(() => location.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  posPrintTemplate: text().references(() => printTemplate.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  posUi: text().default('Classic').notNull(),
  isShiftOpen: numeric().default('0'),
  itemVisibility: text().default('Inventory Items').notNull(),
  canChangeRate: numeric().default('0'),
  hideUnavailableItems: numeric().default('0'),
  canEditDiscount: numeric().default('0'),
  ignorePricingRule: numeric().default('0'),
  saveButtonColour: text().default('#86efac'),
  cancelButtonColour: text().default('#f98080'),
  submitButtonColour: text().default('#86efac'),
  heldButtonColour: text().default('#f98080'),
  returnButtonColour: text().default('#f98080'),
  payButtonColour: text().default('#86efac'),
  payAndPrintButtonColour: text().default('#86efac'),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const posOpeningShift = sqliteTable('POSOpeningShift', {
  name: text().primaryKey().notNull(),
  openingDate: numeric(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const posClosingShift = sqliteTable('POSClosingShift', {
  name: text().primaryKey().notNull(),
  closingDate: numeric(),
  openingShift: text().references(() => posOpeningShift.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const erpNextSyncQueue = sqliteTable('ERPNextSyncQueue', {
  name: text().primaryKey().notNull(),
  referenceType: text().notNull(),
  documentName: text().notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const fetchFromErpNextQueue = sqliteTable('FetchFromERPNextQueue', {
  name: text().primaryKey().notNull(),
  referenceType: text().notNull(),
  documentName: text().notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const integrationErrorLog = sqliteTable('IntegrationErrorLog', {
  name: text().primaryKey().notNull(),
  spacer: text(),
  data: text(),
  error: text(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const salesInvoice = sqliteTable(
  'SalesInvoice',
  {
    name: text().primaryKey().notNull(),
    numberSeries: text()
      .default('SINV-')
      .notNull()
      .references(() => numberSeries.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    party: text()
      .notNull()
      .references(() => party.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    account: text()
      .notNull()
      .references(() => account.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    date: numeric().notNull(),
    priceList: text().references(() => priceList.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    netTotal: text(),
    baseGrandTotal: text(),
    grandTotal: text(),
    setDiscountAmount: numeric().default('0'),
    discountAmount: text(),
    discountPercent: real(),
    entryCurrency: text().default('Party'),
    currency: text().references(() => currency.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    exchangeRate: real().default(1),
    discountAfterTax: numeric().default('0'),
    makeAutoPayment: numeric().default('0'),
    makeAutoStockTransfer: numeric().default('0'),
    outstandingAmount: text(),
    stockNotTransferred: real(),
    terms: text(),
    attachment: text(),
    isReturned: numeric().default('0'),
    isFullyReturned: numeric().default('0'),
    isSyncedWithErp: numeric().default('0'),
    backReference: text().references((): AnySQLiteColumn => shipment.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    returnAgainst: text(),
    quote: text().references(() => salesQuote.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    loyaltyProgram: text().references(() => loyaltyProgram.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    availableLoyaltyPoints: integer(),
    redeemLoyaltyPoints: numeric().default('0'),
    loyaltyPoints: integer(),
    isPos: numeric().default('0'),
    isPricingRuleApplied: numeric().default('0'),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    created: numeric().notNull(),
    modified: numeric().notNull(),
    submitted: numeric().notNull(),
    cancelled: numeric().notNull(),
  },
  (table) => [
    foreignKey(() => ({
      columns: [table.returnAgainst],
      foreignColumns: [table.name],
      name: 'SalesInvoice_returnAgainst_SalesInvoice_name_fk',
    }))
      .onUpdate('cascade')
      .onDelete('restrict'),
  ]
);

export const purchaseInvoice = sqliteTable(
  'PurchaseInvoice',
  {
    name: text().primaryKey().notNull(),
    numberSeries: text()
      .default('PINV-')
      .notNull()
      .references(() => numberSeries.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    party: text()
      .notNull()
      .references(() => party.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    account: text()
      .notNull()
      .references(() => account.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    date: numeric().notNull(),
    priceList: text().references(() => priceList.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    netTotal: text(),
    baseGrandTotal: text(),
    grandTotal: text(),
    setDiscountAmount: numeric().default('0'),
    discountAmount: text(),
    discountPercent: real(),
    entryCurrency: text().default('Party'),
    currency: text().references(() => currency.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    exchangeRate: real().default(1),
    discountAfterTax: numeric().default('0'),
    makeAutoPayment: numeric().default('0'),
    makeAutoStockTransfer: numeric().default('0'),
    outstandingAmount: text(),
    stockNotTransferred: real(),
    terms: text(),
    attachment: text(),
    isReturned: numeric().default('0'),
    isFullyReturned: numeric().default('0'),
    isSyncedWithErp: numeric().default('0'),
    backReference: text().references(
      (): AnySQLiteColumn => purchaseReceipt.name,
      {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }
    ),
    returnAgainst: text(),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    created: numeric().notNull(),
    modified: numeric().notNull(),
    submitted: numeric().notNull(),
    cancelled: numeric().notNull(),
  },
  (table) => [
    foreignKey(() => ({
      columns: [table.returnAgainst],
      foreignColumns: [table.name],
      name: 'PurchaseInvoice_returnAgainst_PurchaseInvoice_name_fk',
    }))
      .onUpdate('cascade')
      .onDelete('restrict'),
  ]
);

export const salesQuote = sqliteTable('SalesQuote', {
  name: text().primaryKey().notNull(),
  numberSeries: text()
    .default('SQUOT-')
    .notNull()
    .references(() => numberSeries.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  party: text().notNull(),
  date: numeric().notNull(),
  priceList: text().references(() => priceList.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  netTotal: text(),
  baseGrandTotal: text(),
  grandTotal: text(),
  setDiscountAmount: numeric().default('0'),
  discountAmount: text(),
  discountPercent: real(),
  entryCurrency: text().default('Party'),
  currency: text().references(() => currency.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  exchangeRate: real().default(1),
  discountAfterTax: numeric().default('0'),
  makeAutoPayment: numeric().default('0'),
  outstandingAmount: text(),
  terms: text(),
  attachment: text(),
  isFullyReturned: numeric().default('0'),
  isSyncedWithErp: numeric().default('0'),
  referenceType: text().default('Party').notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
  submitted: numeric().notNull(),
  cancelled: numeric().notNull(),
});

export const salesInvoiceItem = sqliteTable(
  'SalesInvoiceItem',
  {
    name: text().primaryKey().notNull(),
    item: text()
      .notNull()
      .references(() => item.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    itemCode: text(),
    description: text(),
    rate: text().notNull(),
    transferUnit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    transferQuantity: real().default(1).notNull(),
    unit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    batch: text().references(() => batch.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    quantity: real().default(1).notNull(),
    unitConversionFactor: real().default(1).notNull(),
    account: text()
      .notNull()
      .references(() => account.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    tax: text().references(() => tax.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    amount: text(),
    setItemDiscountAmount: numeric().default('0'),
    itemDiscountAmount: text(),
    itemDiscountPercent: real(),
    hsnCode: integer(),
    stockNotTransferred: real(),
    isFreeItem: numeric().default('0'),
    pricingRule: text(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('SalesInvoiceItem_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const purchaseInvoiceItem = sqliteTable(
  'PurchaseInvoiceItem',
  {
    name: text().primaryKey().notNull(),
    item: text()
      .notNull()
      .references(() => item.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    itemCode: text(),
    description: text(),
    rate: text().notNull(),
    transferUnit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    transferQuantity: real().default(1).notNull(),
    unit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    batch: text().references(() => batch.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    quantity: real().default(1).notNull(),
    unitConversionFactor: real().default(1).notNull(),
    account: text()
      .notNull()
      .references(() => account.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    tax: text().references(() => tax.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    amount: text(),
    setItemDiscountAmount: numeric().default('0'),
    itemDiscountAmount: text(),
    itemDiscountPercent: real(),
    hsnCode: integer(),
    stockNotTransferred: real(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('PurchaseInvoiceItem_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const salesQuoteItem = sqliteTable(
  'SalesQuoteItem',
  {
    name: text().primaryKey().notNull(),
    item: text()
      .notNull()
      .references(() => item.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    itemCode: text(),
    description: text(),
    rate: text().notNull(),
    transferUnit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    transferQuantity: real().default(1).notNull(),
    unit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    batch: text().references(() => batch.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    quantity: real().default(1).notNull(),
    unitConversionFactor: real().default(1).notNull(),
    account: text()
      .notNull()
      .references(() => account.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    tax: text().references(() => tax.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    amount: text(),
    setItemDiscountAmount: numeric().default('0'),
    itemDiscountAmount: text(),
    itemDiscountPercent: real(),
    hsnCode: integer(),
    stockNotTransferred: real(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('SalesQuoteItem_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const shipment = sqliteTable(
  'Shipment',
  {
    name: text().primaryKey().notNull(),
    numberSeries: text()
      .default('SHPM-')
      .notNull()
      .references(() => numberSeries.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    party: text()
      .notNull()
      .references(() => party.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    date: numeric().notNull(),
    grandTotal: text(),
    terms: text(),
    attachment: text(),
    isReturned: numeric().default('0'),
    backReference: text().references((): AnySQLiteColumn => salesInvoice.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    returnAgainst: text(),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    created: numeric().notNull(),
    modified: numeric().notNull(),
    submitted: numeric().notNull(),
    cancelled: numeric().notNull(),
  },
  (table) => [
    foreignKey(() => ({
      columns: [table.returnAgainst],
      foreignColumns: [table.name],
      name: 'Shipment_returnAgainst_Shipment_name_fk',
    }))
      .onUpdate('cascade')
      .onDelete('restrict'),
  ]
);

export const shipmentItem = sqliteTable(
  'ShipmentItem',
  {
    name: text().primaryKey().notNull(),
    item: text()
      .notNull()
      .references(() => item.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    location: text()
      .notNull()
      .references(() => location.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    transferUnit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    transferQuantity: real().default(1).notNull(),
    unit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    batch: text().references(() => batch.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    serialNumber: text(),
    quantity: real().default(1).notNull(),
    unitConversionFactor: real().default(1).notNull(),
    rate: text().notNull(),
    amount: text(),
    itemDiscountAmount: text(),
    itemDiscountPercent: real(),
    description: text(),
    hsnCode: integer(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('ShipmentItem_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const purchaseReceipt = sqliteTable(
  'PurchaseReceipt',
  {
    name: text().primaryKey().notNull(),
    numberSeries: text()
      .default('PREC-')
      .notNull()
      .references(() => numberSeries.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    party: text()
      .notNull()
      .references(() => party.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    date: numeric().notNull(),
    grandTotal: text(),
    terms: text(),
    attachment: text(),
    isReturned: numeric().default('0'),
    backReference: text().references(
      (): AnySQLiteColumn => purchaseInvoice.name,
      {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }
    ),
    returnAgainst: text(),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    created: numeric().notNull(),
    modified: numeric().notNull(),
    submitted: numeric().notNull(),
    cancelled: numeric().notNull(),
  },
  (table) => [
    foreignKey(() => ({
      columns: [table.returnAgainst],
      foreignColumns: [table.name],
      name: 'PurchaseReceipt_returnAgainst_PurchaseReceipt_name_fk',
    }))
      .onUpdate('cascade')
      .onDelete('restrict'),
  ]
);

export const purchaseReceiptItem = sqliteTable(
  'PurchaseReceiptItem',
  {
    name: text().primaryKey().notNull(),
    item: text()
      .notNull()
      .references(() => item.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    location: text()
      .notNull()
      .references(() => location.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    transferUnit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    transferQuantity: real().default(1).notNull(),
    unit: text()
      .default('Unit')
      .references(() => uom.name, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    batch: text().references(() => batch.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    serialNumber: text(),
    quantity: real().default(1).notNull(),
    unitConversionFactor: real().default(1).notNull(),
    rate: text().notNull(),
    amount: text(),
    itemDiscountAmount: text(),
    itemDiscountPercent: real(),
    description: text(),
    hsnCode: integer(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('PurchaseReceiptItem_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const closingAmounts = sqliteTable(
  'ClosingAmounts',
  {
    name: text().primaryKey().notNull(),
    paymentMethod: text().notNull(),
    openingAmount: text(),
    closingAmount: text(),
    expectedAmount: text(),
    differenceAmount: text(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('ClosingAmounts_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const closingCash = sqliteTable(
  'ClosingCash',
  {
    name: text().primaryKey().notNull(),
    denomination: text().notNull(),
    count: integer().default(0).notNull(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('ClosingCash_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const defaultCashDenominations = sqliteTable(
  'DefaultCashDenominations',
  {
    name: text().primaryKey().notNull(),
    denomination: text().notNull(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('DefaultCashDenominations_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const openingAmounts = sqliteTable(
  'OpeningAmounts',
  {
    name: text().primaryKey().notNull(),
    paymentMethod: text().notNull(),
    amount: text(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('OpeningAmounts_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const openingCash = sqliteTable(
  'OpeningCash',
  {
    name: text().primaryKey().notNull(),
    denomination: text().notNull(),
    count: integer().default(0).notNull(),
    idx: integer().notNull(),
    parent: text().notNull(),
    parentSchemaName: text().notNull(),
    parentFieldname: text().notNull(),
  },
  (table) => [
    index('OpeningCash_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const patchRun = sqliteTable('PatchRun', {
  name: text().primaryKey().notNull(),
  failed: numeric().default('0'),
  version: text().default('0.0.0'),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const singleValue = sqliteTable('SingleValue', {
  name: text().primaryKey().notNull(),
  parent: text().notNull(),
  fieldname: text().notNull(),
  value: text().notNull(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const item = sqliteTable('Item', {
  image: text(),
  name: text().primaryKey().notNull(),
  itemCode: text(),
  itemGroup: text().references(() => itemGroup.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  for: text().default('Both').notNull(),
  itemType: text().default('Product'),
  unit: text()
    .default('Unit')
    .references(() => uom.name, { onDelete: 'restrict', onUpdate: 'cascade' }),
  rate: text(),
  description: text(),
  incomeAccount: text()
    .notNull()
    .references(() => account.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  expenseAccount: text()
    .notNull()
    .references(() => account.name, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
  tax: text().references(() => tax.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  hsnCode: text(),
  barcode: text(),
  trackItem: numeric().default('0'),
  hasBatch: numeric().default('0'),
  batchSeries: text(),
  hasSerialNumber: numeric().default('0'),
  serialNumberSeries: text(),
  datafromErp: numeric().default('0'),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
});

export const party = sqliteTable('Party', {
  image: text(),
  name: text().primaryKey().notNull(),
  role: text().default('Both').notNull(),
  email: text(),
  phone: text(),
  address: text().references(() => address.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  defaultAccount: text().references(() => account.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  currency: text().references(() => currency.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  fromLead: text().references(() => lead.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  loyaltyProgram: text().references(() => loyaltyProgram.name, {
    onDelete: 'restrict',
    onUpdate: 'cascade',
  }),
  loyaltyPoints: integer().default(0),
  outstandingAmount: text(),
  createdBy: text().notNull(),
  modifiedBy: text().notNull(),
  created: numeric().notNull(),
  modified: numeric().notNull(),
  gstType: text().default('Unregistered'),
  gstin: text(),
});

export const cashDenominations = sqliteTable(
  'CashDenominations',
  {
    name: text().primaryKey().notNull(),
    created: text().notNull(),
    modified: text().notNull(),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    idx: integer().default(0),
    parent: text(),
    parentSchemaName: text(),
    parentFieldname: text(),
    denomination: real().notNull(),
  },
  (table) => [
    index('CashDenominations_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const invoice = sqliteTable(
  'Invoice',
  {
    name: text().primaryKey().notNull(),
    created: text().notNull(),
    modified: text().notNull(),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    idx: integer().default(0),
    parent: text(),
    parentSchemaName: text(),
    parentFieldname: text(),
    account: text().notNull(),
    date: text().notNull(),
    priceList: text(),
    netTotal: real(),
    baseGrandTotal: real(),
    grandTotal: real(),
    setDiscountAmount: integer().default(0),
    discountAmount: real(),
    discountPercent: real(),
    entryCurrency: text().default('Party'),
    currency: text(),
    exchangeRate: real().default(1),
    discountAfterTax: integer().default(0),
    makeAutoPayment: integer().default(0),
    outstandingAmount: real(),
    terms: text(),
    isReturned: integer().default(0),
    isFullyReturned: integer().default(0),
    isSyncedWithErp: integer().default(0),
  },
  (table) => [
    index('Invoice_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const invoiceItem = sqliteTable(
  'InvoiceItem',
  {
    name: text().primaryKey().notNull(),
    created: text().notNull(),
    modified: text().notNull(),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    idx: integer().default(0),
    parent: text(),
    parentSchemaName: text(),
    parentFieldname: text(),
    item: text().notNull(),
    itemCode: text(),
    description: text(),
    rate: real().notNull(),
    transferUnit: text().default('Unit'),
    transferQuantity: real().default(1).notNull(),
    qty: real().default(1),
    unit: text().default('Unit'),
    batch: text(),
    quantity: real().default(1).notNull(),
    unitConversionFactor: real().default(1).notNull(),
    account: text().notNull(),
    tax: text(),
    amount: real(),
    setItemDiscountAmount: integer().default(0),
    itemDiscountAmount: real(),
    itemDiscountPercent: real(),
    itemDiscountedTotal: real(),
    itemTaxedTotal: real(),
    hsnCode: integer(),
    stockNotTransferred: real(),
  },
  (table) => [
    index('InvoiceItem_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const posShiftAmounts = sqliteTable(
  'POSShiftAmounts',
  {
    name: text().primaryKey().notNull(),
    created: text().notNull(),
    modified: text().notNull(),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    idx: integer().default(0),
    parent: text(),
    parentSchemaName: text(),
    parentFieldname: text(),
    paymentMethod: text().notNull(),
  },
  (table) => [
    index('POSShiftAmounts_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const stockTransfer = sqliteTable(
  'StockTransfer',
  {
    name: text().primaryKey().notNull(),
    created: text().notNull(),
    modified: text().notNull(),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    idx: integer().default(0),
    parent: text(),
    parentSchemaName: text(),
    parentFieldname: text(),
    party: text().notNull(),
    date: text().notNull(),
    grandTotal: real(),
    terms: text(),
    isReturned: integer().default(0),
  },
  (table) => [
    index('StockTransfer_parent_idx').on(table.parent, table.parentSchemaName),
  ]
);

export const stockTransferItem = sqliteTable(
  'StockTransferItem',
  {
    name: text().primaryKey().notNull(),
    created: text().notNull(),
    modified: text().notNull(),
    createdBy: text().notNull(),
    modifiedBy: text().notNull(),
    idx: integer().default(0),
    parent: text(),
    parentSchemaName: text(),
    parentFieldname: text(),
    item: text().notNull(),
    location: text().notNull(),
    transferUnit: text().default('Unit'),
    transferQuantity: real().default(1).notNull(),
    unit: text().default('Unit'),
    batch: text(),
    serialNumber: text(),
    quantity: real().default(1).notNull(),
    unitConversionFactor: real().default(1).notNull(),
    rate: real().notNull(),
    amount: real(),
    itemDiscountAmount: real(),
    itemDiscountPercent: real(),
    description: text(),
    hsnCode: integer(),
  },
  (table) => [
    index('StockTransferItem_parent_idx').on(
      table.parent,
      table.parentSchemaName
    ),
  ]
);

export const singleValue = sqliteTable('SingleValue', {
  name: text().primaryKey().notNull(),
  parent: text(),
  fieldname: text(),
  value: text(),
  created: text(),
  modified: text(),
  modifiedBy: text(),
  createdBy: text(),
});
