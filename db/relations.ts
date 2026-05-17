import { relations } from "drizzle-orm/relations";
import { account, accountingLedgerEntry, party, address, lead, tax, itemGroup, uom, uomConversionItem, loyaltyProgram, salesInvoice, loyaltyPointEntry, paymentMethod, payment, numberSeries, journalEntry, journalEntryAccount, pricingRule, couponCode, appliedCouponCodes, priceListItem, item, pricingRuleItem, pricingRuleDetail, taxDetail, taxSummary, location, stockLedgerEntry, serialNumber, batch, stockMovement, stockMovementItem, printTemplate, posProfile, posOpeningShift, posClosingShift, salesQuote, shipment, currency, priceList, purchaseInvoice, purchaseReceipt, salesInvoiceItem, purchaseInvoiceItem, salesQuoteItem, shipmentItem, purchaseReceiptItem } from "./schema";

export const accountRelations = relations(account, ({one, many}) => ({
	account: one(account, {
		fields: [account.parentAccount],
		references: [account.name],
		relationName: "account_parentAccount_account_name"
	}),
	accounts: many(account, {
		relationName: "account_parentAccount_account_name"
	}),
	accountingLedgerEntries: many(accountingLedgerEntry),
	loyaltyPrograms: many(loyaltyProgram),
	payments_paymentAccount: many(payment, {
		relationName: "payment_paymentAccount_account_name"
	}),
	payments_account: many(payment, {
		relationName: "payment_account_account_name"
	}),
	paymentMethods: many(paymentMethod),
	journalEntryAccounts: many(journalEntryAccount),
	taxDetails_paymentAccount: many(taxDetail, {
		relationName: "taxDetail_paymentAccount_account_name"
	}),
	taxDetails_account: many(taxDetail, {
		relationName: "taxDetail_account_account_name"
	}),
	taxSummaries_fromAccount: many(taxSummary, {
		relationName: "taxSummary_fromAccount_account_name"
	}),
	taxSummaries_account: many(taxSummary, {
		relationName: "taxSummary_account_account_name"
	}),
	salesInvoices: many(salesInvoice),
	purchaseInvoices: many(purchaseInvoice),
	salesInvoiceItems: many(salesInvoiceItem),
	purchaseInvoiceItems: many(purchaseInvoiceItem),
	salesQuoteItems: many(salesQuoteItem),
	items_expenseAccount: many(item, {
		relationName: "item_expenseAccount_account_name"
	}),
	items_incomeAccount: many(item, {
		relationName: "item_incomeAccount_account_name"
	}),
	parties: many(party),
}));

export const accountingLedgerEntryRelations = relations(accountingLedgerEntry, ({one, many}) => ({
	accountingLedgerEntry: one(accountingLedgerEntry, {
		fields: [accountingLedgerEntry.reverts],
		references: [accountingLedgerEntry.name],
		relationName: "accountingLedgerEntry_reverts_accountingLedgerEntry_name"
	}),
	accountingLedgerEntries: many(accountingLedgerEntry, {
		relationName: "accountingLedgerEntry_reverts_accountingLedgerEntry_name"
	}),
	account: one(account, {
		fields: [accountingLedgerEntry.account],
		references: [account.name]
	}),
	party: one(party, {
		fields: [accountingLedgerEntry.party],
		references: [party.name]
	}),
}));

export const partyRelations = relations(party, ({one, many}) => ({
	accountingLedgerEntries: many(accountingLedgerEntry),
	loyaltyPointEntries: many(loyaltyPointEntry),
	payments: many(payment),
	posProfiles: many(posProfile),
	salesInvoices: many(salesInvoice),
	purchaseInvoices: many(purchaseInvoice),
	shipments: many(shipment),
	purchaseReceipts: many(purchaseReceipt),
	loyaltyProgram: one(loyaltyProgram, {
		fields: [party.loyaltyProgram],
		references: [loyaltyProgram.name]
	}),
	lead: one(lead, {
		fields: [party.fromLead],
		references: [lead.name]
	}),
	currency: one(currency, {
		fields: [party.currency],
		references: [currency.name]
	}),
	account: one(account, {
		fields: [party.defaultAccount],
		references: [account.name]
	}),
	address: one(address, {
		fields: [party.address],
		references: [address.name]
	}),
}));

export const leadRelations = relations(lead, ({one, many}) => ({
	address: one(address, {
		fields: [lead.address],
		references: [address.name]
	}),
	parties: many(party),
}));

export const addressRelations = relations(address, ({many}) => ({
	leads: many(lead),
	locations: many(location),
	parties: many(party),
}));

export const itemGroupRelations = relations(itemGroup, ({one, many}) => ({
	tax: one(tax, {
		fields: [itemGroup.tax],
		references: [tax.name]
	}),
	items: many(item),
}));

export const taxRelations = relations(tax, ({many}) => ({
	itemGroups: many(itemGroup),
	salesInvoiceItems: many(salesInvoiceItem),
	purchaseInvoiceItems: many(purchaseInvoiceItem),
	salesQuoteItems: many(salesQuoteItem),
	items: many(item),
}));

export const uomConversionItemRelations = relations(uomConversionItem, ({one}) => ({
	uom: one(uom, {
		fields: [uomConversionItem.uom],
		references: [uom.name]
	}),
}));

export const uomRelations = relations(uom, ({many}) => ({
	uomConversionItems: many(uomConversionItem),
	priceListItems: many(priceListItem),
	pricingRules: many(pricingRule),
	pricingRuleItems: many(pricingRuleItem),
	stockMovementItems_unit: many(stockMovementItem, {
		relationName: "stockMovementItem_unit_uom_name"
	}),
	stockMovementItems_transferUnit: many(stockMovementItem, {
		relationName: "stockMovementItem_transferUnit_uom_name"
	}),
	salesInvoiceItems_unit: many(salesInvoiceItem, {
		relationName: "salesInvoiceItem_unit_uom_name"
	}),
	salesInvoiceItems_transferUnit: many(salesInvoiceItem, {
		relationName: "salesInvoiceItem_transferUnit_uom_name"
	}),
	purchaseInvoiceItems_unit: many(purchaseInvoiceItem, {
		relationName: "purchaseInvoiceItem_unit_uom_name"
	}),
	purchaseInvoiceItems_transferUnit: many(purchaseInvoiceItem, {
		relationName: "purchaseInvoiceItem_transferUnit_uom_name"
	}),
	salesQuoteItems_unit: many(salesQuoteItem, {
		relationName: "salesQuoteItem_unit_uom_name"
	}),
	salesQuoteItems_transferUnit: many(salesQuoteItem, {
		relationName: "salesQuoteItem_transferUnit_uom_name"
	}),
	shipmentItems_unit: many(shipmentItem, {
		relationName: "shipmentItem_unit_uom_name"
	}),
	shipmentItems_transferUnit: many(shipmentItem, {
		relationName: "shipmentItem_transferUnit_uom_name"
	}),
	purchaseReceiptItems_unit: many(purchaseReceiptItem, {
		relationName: "purchaseReceiptItem_unit_uom_name"
	}),
	purchaseReceiptItems_transferUnit: many(purchaseReceiptItem, {
		relationName: "purchaseReceiptItem_transferUnit_uom_name"
	}),
	items: many(item),
}));

export const loyaltyProgramRelations = relations(loyaltyProgram, ({one, many}) => ({
	account: one(account, {
		fields: [loyaltyProgram.expenseAccount],
		references: [account.name]
	}),
	salesInvoices: many(salesInvoice),
	parties: many(party),
}));

export const loyaltyPointEntryRelations = relations(loyaltyPointEntry, ({one}) => ({
	salesInvoice: one(salesInvoice, {
		fields: [loyaltyPointEntry.invoice],
		references: [salesInvoice.name]
	}),
	party: one(party, {
		fields: [loyaltyPointEntry.customer],
		references: [party.name]
	}),
}));

export const salesInvoiceRelations = relations(salesInvoice, ({one, many}) => ({
	loyaltyPointEntries: many(loyaltyPointEntry),
	loyaltyProgram: one(loyaltyProgram, {
		fields: [salesInvoice.loyaltyProgram],
		references: [loyaltyProgram.name]
	}),
	salesQuote: one(salesQuote, {
		fields: [salesInvoice.quote],
		references: [salesQuote.name]
	}),
	salesInvoice: one(salesInvoice, {
		fields: [salesInvoice.returnAgainst],
		references: [salesInvoice.name],
		relationName: "salesInvoice_returnAgainst_salesInvoice_name"
	}),
	salesInvoices: many(salesInvoice, {
		relationName: "salesInvoice_returnAgainst_salesInvoice_name"
	}),
	shipment: one(shipment, {
		fields: [salesInvoice.backReference],
		references: [shipment.name],
		relationName: "salesInvoice_backReference_shipment_name"
	}),
	currency: one(currency, {
		fields: [salesInvoice.currency],
		references: [currency.name]
	}),
	priceList: one(priceList, {
		fields: [salesInvoice.priceList],
		references: [priceList.name]
	}),
	account: one(account, {
		fields: [salesInvoice.account],
		references: [account.name]
	}),
	party: one(party, {
		fields: [salesInvoice.party],
		references: [party.name]
	}),
	numberSery: one(numberSeries, {
		fields: [salesInvoice.numberSeries],
		references: [numberSeries.name]
	}),
	shipments: many(shipment, {
		relationName: "shipment_backReference_salesInvoice_name"
	}),
}));

export const paymentRelations = relations(payment, ({one}) => ({
	paymentMethod: one(paymentMethod, {
		fields: [payment.paymentMethod],
		references: [paymentMethod.name]
	}),
	account_paymentAccount: one(account, {
		fields: [payment.paymentAccount],
		references: [account.name],
		relationName: "payment_paymentAccount_account_name"
	}),
	account_account: one(account, {
		fields: [payment.account],
		references: [account.name],
		relationName: "payment_account_account_name"
	}),
	party: one(party, {
		fields: [payment.party],
		references: [party.name]
	}),
	numberSery: one(numberSeries, {
		fields: [payment.numberSeries],
		references: [numberSeries.name]
	}),
}));

export const paymentMethodRelations = relations(paymentMethod, ({one, many}) => ({
	payments: many(payment),
	account: one(account, {
		fields: [paymentMethod.account],
		references: [account.name]
	}),
}));

export const numberSeriesRelations = relations(numberSeries, ({many}) => ({
	payments: many(payment),
	journalEntries: many(journalEntry),
	pricingRules: many(pricingRule),
	stockMovements: many(stockMovement),
	salesInvoices: many(salesInvoice),
	purchaseInvoices: many(purchaseInvoice),
	salesQuotes: many(salesQuote),
	shipments: many(shipment),
	purchaseReceipts: many(purchaseReceipt),
}));

export const journalEntryRelations = relations(journalEntry, ({one}) => ({
	numberSery: one(numberSeries, {
		fields: [journalEntry.numberSeries],
		references: [numberSeries.name]
	}),
}));

export const journalEntryAccountRelations = relations(journalEntryAccount, ({one}) => ({
	account: one(account, {
		fields: [journalEntryAccount.account],
		references: [account.name]
	}),
}));

export const couponCodeRelations = relations(couponCode, ({one, many}) => ({
	pricingRule: one(pricingRule, {
		fields: [couponCode.pricingRule],
		references: [pricingRule.name]
	}),
	appliedCouponCodes: many(appliedCouponCodes),
}));

export const pricingRuleRelations = relations(pricingRule, ({one, many}) => ({
	couponCodes: many(couponCode),
	uom: one(uom, {
		fields: [pricingRule.freeItemUnit],
		references: [uom.name]
	}),
	item: one(item, {
		fields: [pricingRule.freeItem],
		references: [item.name]
	}),
	numberSery: one(numberSeries, {
		fields: [pricingRule.numberSeries],
		references: [numberSeries.name]
	}),
	pricingRuleDetails: many(pricingRuleDetail),
}));

export const appliedCouponCodesRelations = relations(appliedCouponCodes, ({one}) => ({
	couponCode: one(couponCode, {
		fields: [appliedCouponCodes.coupons],
		references: [couponCode.name]
	}),
}));

export const priceListItemRelations = relations(priceListItem, ({one}) => ({
	uom: one(uom, {
		fields: [priceListItem.unit],
		references: [uom.name]
	}),
	item: one(item, {
		fields: [priceListItem.item],
		references: [item.name]
	}),
}));

export const itemRelations = relations(item, ({one, many}) => ({
	priceListItems: many(priceListItem),
	pricingRules: many(pricingRule),
	pricingRuleItems: many(pricingRuleItem),
	pricingRuleDetails: many(pricingRuleDetail),
	stockLedgerEntries: many(stockLedgerEntry),
	stockMovementItems: many(stockMovementItem),
	batches: many(batch),
	serialNumbers: many(serialNumber),
	salesInvoiceItems: many(salesInvoiceItem),
	purchaseInvoiceItems: many(purchaseInvoiceItem),
	salesQuoteItems: many(salesQuoteItem),
	shipmentItems: many(shipmentItem),
	purchaseReceiptItems: many(purchaseReceiptItem),
	tax: one(tax, {
		fields: [item.tax],
		references: [tax.name]
	}),
	account_expenseAccount: one(account, {
		fields: [item.expenseAccount],
		references: [account.name],
		relationName: "item_expenseAccount_account_name"
	}),
	account_incomeAccount: one(account, {
		fields: [item.incomeAccount],
		references: [account.name],
		relationName: "item_incomeAccount_account_name"
	}),
	uom: one(uom, {
		fields: [item.unit],
		references: [uom.name]
	}),
	itemGroup: one(itemGroup, {
		fields: [item.itemGroup],
		references: [itemGroup.name]
	}),
}));

export const pricingRuleItemRelations = relations(pricingRuleItem, ({one}) => ({
	uom: one(uom, {
		fields: [pricingRuleItem.unit],
		references: [uom.name]
	}),
	item: one(item, {
		fields: [pricingRuleItem.item],
		references: [item.name]
	}),
}));

export const pricingRuleDetailRelations = relations(pricingRuleDetail, ({one}) => ({
	item: one(item, {
		fields: [pricingRuleDetail.referenceItem],
		references: [item.name]
	}),
	pricingRule: one(pricingRule, {
		fields: [pricingRuleDetail.referenceName],
		references: [pricingRule.name]
	}),
}));

export const taxDetailRelations = relations(taxDetail, ({one}) => ({
	account_paymentAccount: one(account, {
		fields: [taxDetail.paymentAccount],
		references: [account.name],
		relationName: "taxDetail_paymentAccount_account_name"
	}),
	account_account: one(account, {
		fields: [taxDetail.account],
		references: [account.name],
		relationName: "taxDetail_account_account_name"
	}),
}));

export const taxSummaryRelations = relations(taxSummary, ({one}) => ({
	account_fromAccount: one(account, {
		fields: [taxSummary.fromAccount],
		references: [account.name],
		relationName: "taxSummary_fromAccount_account_name"
	}),
	account_account: one(account, {
		fields: [taxSummary.account],
		references: [account.name],
		relationName: "taxSummary_account_account_name"
	}),
}));

export const locationRelations = relations(location, ({one, many}) => ({
	address: one(address, {
		fields: [location.address],
		references: [address.name]
	}),
	stockLedgerEntries: many(stockLedgerEntry),
	stockMovementItems_toLocation: many(stockMovementItem, {
		relationName: "stockMovementItem_toLocation_location_name"
	}),
	stockMovementItems_fromLocation: many(stockMovementItem, {
		relationName: "stockMovementItem_fromLocation_location_name"
	}),
	posProfiles: many(posProfile),
	shipmentItems: many(shipmentItem),
	purchaseReceiptItems: many(purchaseReceiptItem),
}));

export const stockLedgerEntryRelations = relations(stockLedgerEntry, ({one}) => ({
	item: one(item, {
		fields: [stockLedgerEntry.item],
		references: [item.name]
	}),
	serialNumber: one(serialNumber, {
		fields: [stockLedgerEntry.serialNumber],
		references: [serialNumber.name]
	}),
	batch: one(batch, {
		fields: [stockLedgerEntry.batch],
		references: [batch.name]
	}),
	location: one(location, {
		fields: [stockLedgerEntry.location],
		references: [location.name]
	}),
}));

export const serialNumberRelations = relations(serialNumber, ({one, many}) => ({
	stockLedgerEntries: many(stockLedgerEntry),
	item: one(item, {
		fields: [serialNumber.item],
		references: [item.name]
	}),
}));

export const batchRelations = relations(batch, ({one, many}) => ({
	stockLedgerEntries: many(stockLedgerEntry),
	stockMovementItems: many(stockMovementItem),
	item: one(item, {
		fields: [batch.item],
		references: [item.name]
	}),
	salesInvoiceItems: many(salesInvoiceItem),
	purchaseInvoiceItems: many(purchaseInvoiceItem),
	salesQuoteItems: many(salesQuoteItem),
	shipmentItems: many(shipmentItem),
	purchaseReceiptItems: many(purchaseReceiptItem),
}));

export const stockMovementRelations = relations(stockMovement, ({one}) => ({
	numberSery: one(numberSeries, {
		fields: [stockMovement.numberSeries],
		references: [numberSeries.name]
	}),
}));

export const stockMovementItemRelations = relations(stockMovementItem, ({one}) => ({
	batch: one(batch, {
		fields: [stockMovementItem.batch],
		references: [batch.name]
	}),
	uom_unit: one(uom, {
		fields: [stockMovementItem.unit],
		references: [uom.name],
		relationName: "stockMovementItem_unit_uom_name"
	}),
	uom_transferUnit: one(uom, {
		fields: [stockMovementItem.transferUnit],
		references: [uom.name],
		relationName: "stockMovementItem_transferUnit_uom_name"
	}),
	location_toLocation: one(location, {
		fields: [stockMovementItem.toLocation],
		references: [location.name],
		relationName: "stockMovementItem_toLocation_location_name"
	}),
	location_fromLocation: one(location, {
		fields: [stockMovementItem.fromLocation],
		references: [location.name],
		relationName: "stockMovementItem_fromLocation_location_name"
	}),
	item: one(item, {
		fields: [stockMovementItem.item],
		references: [item.name]
	}),
}));

export const posProfileRelations = relations(posProfile, ({one}) => ({
	printTemplate: one(printTemplate, {
		fields: [posProfile.posPrintTemplate],
		references: [printTemplate.name]
	}),
	location: one(location, {
		fields: [posProfile.inventory],
		references: [location.name]
	}),
	party: one(party, {
		fields: [posProfile.posCustomer],
		references: [party.name]
	}),
}));

export const printTemplateRelations = relations(printTemplate, ({many}) => ({
	posProfiles: many(posProfile),
}));

export const posClosingShiftRelations = relations(posClosingShift, ({one}) => ({
	posOpeningShift: one(posOpeningShift, {
		fields: [posClosingShift.openingShift],
		references: [posOpeningShift.name]
	}),
}));

export const posOpeningShiftRelations = relations(posOpeningShift, ({many}) => ({
	posClosingShifts: many(posClosingShift),
}));

export const salesQuoteRelations = relations(salesQuote, ({one, many}) => ({
	salesInvoices: many(salesInvoice),
	currency: one(currency, {
		fields: [salesQuote.currency],
		references: [currency.name]
	}),
	priceList: one(priceList, {
		fields: [salesQuote.priceList],
		references: [priceList.name]
	}),
	numberSery: one(numberSeries, {
		fields: [salesQuote.numberSeries],
		references: [numberSeries.name]
	}),
}));

export const shipmentRelations = relations(shipment, ({one, many}) => ({
	salesInvoices: many(salesInvoice, {
		relationName: "salesInvoice_backReference_shipment_name"
	}),
	shipment: one(shipment, {
		fields: [shipment.returnAgainst],
		references: [shipment.name],
		relationName: "shipment_returnAgainst_shipment_name"
	}),
	shipments: many(shipment, {
		relationName: "shipment_returnAgainst_shipment_name"
	}),
	salesInvoice: one(salesInvoice, {
		fields: [shipment.backReference],
		references: [salesInvoice.name],
		relationName: "shipment_backReference_salesInvoice_name"
	}),
	party: one(party, {
		fields: [shipment.party],
		references: [party.name]
	}),
	numberSery: one(numberSeries, {
		fields: [shipment.numberSeries],
		references: [numberSeries.name]
	}),
}));

export const currencyRelations = relations(currency, ({many}) => ({
	salesInvoices: many(salesInvoice),
	purchaseInvoices: many(purchaseInvoice),
	salesQuotes: many(salesQuote),
	parties: many(party),
}));

export const priceListRelations = relations(priceList, ({many}) => ({
	salesInvoices: many(salesInvoice),
	purchaseInvoices: many(purchaseInvoice),
	salesQuotes: many(salesQuote),
}));

export const purchaseInvoiceRelations = relations(purchaseInvoice, ({one, many}) => ({
	purchaseInvoice: one(purchaseInvoice, {
		fields: [purchaseInvoice.returnAgainst],
		references: [purchaseInvoice.name],
		relationName: "purchaseInvoice_returnAgainst_purchaseInvoice_name"
	}),
	purchaseInvoices: many(purchaseInvoice, {
		relationName: "purchaseInvoice_returnAgainst_purchaseInvoice_name"
	}),
	purchaseReceipt: one(purchaseReceipt, {
		fields: [purchaseInvoice.backReference],
		references: [purchaseReceipt.name],
		relationName: "purchaseInvoice_backReference_purchaseReceipt_name"
	}),
	currency: one(currency, {
		fields: [purchaseInvoice.currency],
		references: [currency.name]
	}),
	priceList: one(priceList, {
		fields: [purchaseInvoice.priceList],
		references: [priceList.name]
	}),
	account: one(account, {
		fields: [purchaseInvoice.account],
		references: [account.name]
	}),
	party: one(party, {
		fields: [purchaseInvoice.party],
		references: [party.name]
	}),
	numberSery: one(numberSeries, {
		fields: [purchaseInvoice.numberSeries],
		references: [numberSeries.name]
	}),
	purchaseReceipts: many(purchaseReceipt, {
		relationName: "purchaseReceipt_backReference_purchaseInvoice_name"
	}),
}));

export const purchaseReceiptRelations = relations(purchaseReceipt, ({one, many}) => ({
	purchaseInvoices: many(purchaseInvoice, {
		relationName: "purchaseInvoice_backReference_purchaseReceipt_name"
	}),
	purchaseReceipt: one(purchaseReceipt, {
		fields: [purchaseReceipt.returnAgainst],
		references: [purchaseReceipt.name],
		relationName: "purchaseReceipt_returnAgainst_purchaseReceipt_name"
	}),
	purchaseReceipts: many(purchaseReceipt, {
		relationName: "purchaseReceipt_returnAgainst_purchaseReceipt_name"
	}),
	purchaseInvoice: one(purchaseInvoice, {
		fields: [purchaseReceipt.backReference],
		references: [purchaseInvoice.name],
		relationName: "purchaseReceipt_backReference_purchaseInvoice_name"
	}),
	party: one(party, {
		fields: [purchaseReceipt.party],
		references: [party.name]
	}),
	numberSery: one(numberSeries, {
		fields: [purchaseReceipt.numberSeries],
		references: [numberSeries.name]
	}),
}));

export const salesInvoiceItemRelations = relations(salesInvoiceItem, ({one}) => ({
	tax: one(tax, {
		fields: [salesInvoiceItem.tax],
		references: [tax.name]
	}),
	account: one(account, {
		fields: [salesInvoiceItem.account],
		references: [account.name]
	}),
	batch: one(batch, {
		fields: [salesInvoiceItem.batch],
		references: [batch.name]
	}),
	uom_unit: one(uom, {
		fields: [salesInvoiceItem.unit],
		references: [uom.name],
		relationName: "salesInvoiceItem_unit_uom_name"
	}),
	uom_transferUnit: one(uom, {
		fields: [salesInvoiceItem.transferUnit],
		references: [uom.name],
		relationName: "salesInvoiceItem_transferUnit_uom_name"
	}),
	item: one(item, {
		fields: [salesInvoiceItem.item],
		references: [item.name]
	}),
}));

export const purchaseInvoiceItemRelations = relations(purchaseInvoiceItem, ({one}) => ({
	tax: one(tax, {
		fields: [purchaseInvoiceItem.tax],
		references: [tax.name]
	}),
	account: one(account, {
		fields: [purchaseInvoiceItem.account],
		references: [account.name]
	}),
	batch: one(batch, {
		fields: [purchaseInvoiceItem.batch],
		references: [batch.name]
	}),
	uom_unit: one(uom, {
		fields: [purchaseInvoiceItem.unit],
		references: [uom.name],
		relationName: "purchaseInvoiceItem_unit_uom_name"
	}),
	uom_transferUnit: one(uom, {
		fields: [purchaseInvoiceItem.transferUnit],
		references: [uom.name],
		relationName: "purchaseInvoiceItem_transferUnit_uom_name"
	}),
	item: one(item, {
		fields: [purchaseInvoiceItem.item],
		references: [item.name]
	}),
}));

export const salesQuoteItemRelations = relations(salesQuoteItem, ({one}) => ({
	tax: one(tax, {
		fields: [salesQuoteItem.tax],
		references: [tax.name]
	}),
	account: one(account, {
		fields: [salesQuoteItem.account],
		references: [account.name]
	}),
	batch: one(batch, {
		fields: [salesQuoteItem.batch],
		references: [batch.name]
	}),
	uom_unit: one(uom, {
		fields: [salesQuoteItem.unit],
		references: [uom.name],
		relationName: "salesQuoteItem_unit_uom_name"
	}),
	uom_transferUnit: one(uom, {
		fields: [salesQuoteItem.transferUnit],
		references: [uom.name],
		relationName: "salesQuoteItem_transferUnit_uom_name"
	}),
	item: one(item, {
		fields: [salesQuoteItem.item],
		references: [item.name]
	}),
}));

export const shipmentItemRelations = relations(shipmentItem, ({one}) => ({
	batch: one(batch, {
		fields: [shipmentItem.batch],
		references: [batch.name]
	}),
	uom_unit: one(uom, {
		fields: [shipmentItem.unit],
		references: [uom.name],
		relationName: "shipmentItem_unit_uom_name"
	}),
	uom_transferUnit: one(uom, {
		fields: [shipmentItem.transferUnit],
		references: [uom.name],
		relationName: "shipmentItem_transferUnit_uom_name"
	}),
	location: one(location, {
		fields: [shipmentItem.location],
		references: [location.name]
	}),
	item: one(item, {
		fields: [shipmentItem.item],
		references: [item.name]
	}),
}));

export const purchaseReceiptItemRelations = relations(purchaseReceiptItem, ({one}) => ({
	batch: one(batch, {
		fields: [purchaseReceiptItem.batch],
		references: [batch.name]
	}),
	uom_unit: one(uom, {
		fields: [purchaseReceiptItem.unit],
		references: [uom.name],
		relationName: "purchaseReceiptItem_unit_uom_name"
	}),
	uom_transferUnit: one(uom, {
		fields: [purchaseReceiptItem.transferUnit],
		references: [uom.name],
		relationName: "purchaseReceiptItem_transferUnit_uom_name"
	}),
	location: one(location, {
		fields: [purchaseReceiptItem.location],
		references: [location.name]
	}),
	item: one(item, {
		fields: [purchaseReceiptItem.item],
		references: [item.name]
	}),
}));