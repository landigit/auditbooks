-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `PrintTemplate` (
	`name` text PRIMARY KEY NOT NULL,
	`type` text DEFAULT 'SalesInvoice' NOT NULL,
	`template` text NOT NULL,
	`height` real DEFAULT '29.7',
	`width` real DEFAULT '21',
	`isCustom` numeric DEFAULT '1',
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Color` (
	`name` text PRIMARY KEY NOT NULL,
	`hexvalue` text NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Currency` (
	`name` text PRIMARY KEY NOT NULL,
	`fraction` text,
	`fractionUnits` integer,
	`smallestValue` text,
	`symbol` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `NumberSeries` (
	`name` text PRIMARY KEY NOT NULL,
	`start` integer DEFAULT '1001' NOT NULL,
	`padZeros` integer DEFAULT '4' NOT NULL,
	`referenceType` text DEFAULT '-' NOT NULL,
	`current` integer NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `SerialNumberSeries` (
	`name` text PRIMARY KEY NOT NULL,
	`start` integer DEFAULT '1001' NOT NULL,
	`padZeros` integer DEFAULT '4' NOT NULL,
	`current` integer NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `BatchSeries` (
	`name` text PRIMARY KEY NOT NULL,
	`start` integer DEFAULT '1001' NOT NULL,
	`padZeros` integer DEFAULT '4' NOT NULL,
	`current` integer NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Account` (
	`name` text PRIMARY KEY NOT NULL,
	`rootType` text NOT NULL,
	`parentAccount` text,
	`accountType` text,
	`isGroup` numeric DEFAULT '0',
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`lft` integer NOT NULL,
	`rgt` integer NOT NULL,
	FOREIGN KEY (`parentAccount`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `AccountingLedgerEntry` (
	`name` text PRIMARY KEY NOT NULL,
	`date` numeric,
	`party` text,
	`account` text NOT NULL,
	`debit` text,
	`credit` text,
	`referenceType` text,
	`referenceName` text,
	`reverted` numeric DEFAULT '0',
	`reverts` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`reverts`) REFERENCES `AccountingLedgerEntry`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`party`) REFERENCES `Party`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `Lead` (
	`name` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'Open' NOT NULL,
	`email` text,
	`mobile` text,
	`address` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`address`) REFERENCES `Address`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `Address` (
	`name` text PRIMARY KEY NOT NULL,
	`addressLine1` text NOT NULL,
	`addressLine2` text,
	`city` text NOT NULL,
	`country` text NOT NULL,
	`state` text,
	`postalCode` text,
	`emailAddress` text,
	`phone` text,
	`fax` text,
	`addressDisplay` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`pos` text
);
--> statement-breakpoint
CREATE TABLE `ItemGroup` (
	`image` text,
	`name` text PRIMARY KEY NOT NULL,
	`tax` text,
	`hsnCode` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`tax`) REFERENCES `Tax`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `UOM` (
	`name` text PRIMARY KEY NOT NULL,
	`isWhole` numeric DEFAULT '0',
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `UOMConversionItem` (
	`name` text PRIMARY KEY NOT NULL,
	`uom` text NOT NULL,
	`conversionFactor` real DEFAULT '1' NOT NULL,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`uom`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `LoyaltyProgram` (
	`name` text PRIMARY KEY NOT NULL,
	`fromDate` numeric NOT NULL,
	`toDate` numeric NOT NULL,
	`isEnabled` numeric DEFAULT '1' NOT NULL,
	`conversionFactor` real DEFAULT '1' NOT NULL,
	`expiryDuration` integer DEFAULT '1',
	`expenseAccount` text NOT NULL,
	`maximumUse` integer DEFAULT '0',
	`used` integer DEFAULT '0',
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`expenseAccount`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `LoyaltyPointEntry` (
	`name` text PRIMARY KEY NOT NULL,
	`loyaltyProgram` text NOT NULL,
	`loyaltyProgramTier` text,
	`customer` text NOT NULL,
	`invoice` text NOT NULL,
	`loyaltyPoints` integer,
	`purchaseAmount` text NOT NULL,
	`expiryDate` numeric,
	`postingDate` numeric,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`invoice`) REFERENCES `SalesInvoice`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`customer`) REFERENCES `Party`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `CollectionRulesItems` (
	`name` text PRIMARY KEY NOT NULL,
	`tierName` text,
	`collectionFactor` real,
	`minimumTotalSpent` text,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Payment` (
	`name` text PRIMARY KEY NOT NULL,
	`numberSeries` text DEFAULT 'PAY-' NOT NULL,
	`party` text NOT NULL,
	`date` numeric NOT NULL,
	`paymentType` text NOT NULL,
	`account` text NOT NULL,
	`paymentAccount` text NOT NULL,
	`paymentMethod` text DEFAULT 'Cash' NOT NULL,
	`clearanceDate` numeric,
	`referenceId` text,
	`referenceDate` numeric,
	`amount` text NOT NULL,
	`writeoff` text,
	`attachment` text,
	`referenceType` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`submitted` numeric NOT NULL,
	`cancelled` numeric NOT NULL,
	FOREIGN KEY (`paymentMethod`) REFERENCES `PaymentMethod`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`paymentAccount`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`party`) REFERENCES `Party`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`numberSeries`) REFERENCES `NumberSeries`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `PaymentMethod` (
	`name` text PRIMARY KEY,
	`type` text NOT NULL,
	`account` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `PaymentFor` (
	`name` text PRIMARY KEY NOT NULL,
	`referenceType` text NOT NULL,
	`referenceName` text NOT NULL,
	`amount` text NOT NULL,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `JournalEntry` (
	`name` text PRIMARY KEY NOT NULL,
	`numberSeries` text DEFAULT 'JV-' NOT NULL,
	`entryType` text NOT NULL,
	`date` numeric NOT NULL,
	`referenceNumber` text,
	`referenceDate` numeric,
	`userRemark` text,
	`attachment` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`submitted` numeric NOT NULL,
	`cancelled` numeric NOT NULL,
	FOREIGN KEY (`numberSeries`) REFERENCES `NumberSeries`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `JournalEntryAccount` (
	`name` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`debit` text,
	`credit` text,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `ItemEnquiry` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`customer` text,
	`contact` text,
	`description` text,
	`similarProduct` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `CouponCode` (
	`name` text PRIMARY KEY NOT NULL,
	`couponName` text NOT NULL,
	`isEnabled` numeric DEFAULT '1' NOT NULL,
	`pricingRule` text NOT NULL,
	`minAmount` text,
	`maxAmount` text,
	`validFrom` numeric NOT NULL,
	`validTo` numeric NOT NULL,
	`maximumUse` integer DEFAULT '0' NOT NULL,
	`used` integer DEFAULT '0' NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`pricingRule`) REFERENCES `PricingRule`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `AppliedCouponCodes` (
	`name` text PRIMARY KEY NOT NULL,
	`coupons` text,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`coupons`) REFERENCES `CouponCode`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `PriceList` (
	`name` text PRIMARY KEY NOT NULL,
	`isEnabled` numeric DEFAULT '1',
	`isSales` numeric DEFAULT '1',
	`isPurchase` numeric DEFAULT '0',
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `PriceListItem` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`unit` text,
	`rate` text NOT NULL,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`unit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `PricingRule` (
	`name` text PRIMARY KEY NOT NULL,
	`numberSeries` text DEFAULT 'PRLE-' NOT NULL,
	`isEnabled` numeric DEFAULT '1',
	`title` text NOT NULL,
	`discountType` text NOT NULL,
	`isCouponCodeBased` numeric DEFAULT '0',
	`priority` text NOT NULL,
	`priceDiscountType` text,
	`discountRate` text,
	`discountPercentage` real,
	`discountAmount` text,
	`freeItem` text,
	`freeItemQuantity` real,
	`freeItemUnit` text,
	`roundFreeItemQty` numeric DEFAULT '0',
	`roundingMethod` text DEFAULT 'round' NOT NULL,
	`isRecursive` numeric DEFAULT '0',
	`recurseEvery` real,
	`minQuantity` real,
	`maxQuantity` real,
	`minAmount` text,
	`maxAmount` text,
	`validFrom` numeric,
	`validTo` numeric,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`freeItemUnit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`freeItem`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`numberSeries`) REFERENCES `NumberSeries`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `PricingRuleItem` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`unit` text,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`unit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `PricingRuleDetail` (
	`name` text PRIMARY KEY NOT NULL,
	`referenceName` text,
	`referenceItem` text,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`referenceItem`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`referenceName`) REFERENCES `PricingRule`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `Tax` (
	`name` text PRIMARY KEY NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `TaxDetail` (
	`name` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`payment_account` text,
	`rate` real NOT NULL,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`payment_account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `TaxSummary` (
	`name` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`from_account` text,
	`rate` real NOT NULL,
	`amount` text NOT NULL,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`from_account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `Location` (
	`name` text PRIMARY KEY NOT NULL,
	`address` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`address`) REFERENCES `Address`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `StockLedgerEntry` (
	`name` text PRIMARY KEY NOT NULL,
	`date` numeric,
	`location` text,
	`batch` text,
	`serialNumber` text,
	`item` text,
	`rate` text,
	`quantity` real,
	`referenceType` text,
	`referenceName` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`serialNumber`) REFERENCES `SerialNumber`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`batch`) REFERENCES `Batch`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`location`) REFERENCES `Location`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `StockMovement` (
	`name` text PRIMARY KEY NOT NULL,
	`numberSeries` text DEFAULT 'SMOV-' NOT NULL,
	`movementType` text NOT NULL,
	`date` numeric NOT NULL,
	`amount` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`submitted` numeric NOT NULL,
	`cancelled` numeric NOT NULL,
	FOREIGN KEY (`numberSeries`) REFERENCES `NumberSeries`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `StockMovementItem` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`fromLocation` text,
	`toLocation` text,
	`transferUnit` text DEFAULT 'Unit',
	`transferQuantity` real DEFAULT '1' NOT NULL,
	`unit` text DEFAULT 'Unit',
	`batch` text,
	`serialNumber` text,
	`quantity` real DEFAULT '1' NOT NULL,
	`unitConversionFactor` real DEFAULT '1' NOT NULL,
	`rate` text NOT NULL,
	`amount` text,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`batch`) REFERENCES `Batch`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`unit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`transferUnit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`toLocation`) REFERENCES `Location`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`fromLocation`) REFERENCES `Location`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `Batch` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text,
	`expiryDate` numeric,
	`manufactureDate` numeric,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `SerialNumber` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'Inactive',
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `CustomForm` (
	`name` text PRIMARY KEY NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `CustomField` (
	`name` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`fieldname` text NOT NULL,
	`fieldtype` text DEFAULT 'Data' NOT NULL,
	`isRequired` numeric DEFAULT '0',
	`default` text,
	`section` text DEFAULT 'Default',
	`tab` text DEFAULT 'Custom',
	`options` text,
	`target` text,
	`references` text,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `POSProfile` (
	`name` text PRIMARY KEY,
	`posCustomer` text,
	`inventory` text NOT NULL,
	`posPrintTemplate` text,
	`posUI` text DEFAULT 'Classic' NOT NULL,
	`isShiftOpen` numeric DEFAULT '0',
	`itemVisibility` text DEFAULT 'Inventory Items' NOT NULL,
	`canChangeRate` numeric DEFAULT '0',
	`hideUnavailableItems` numeric DEFAULT '0',
	`canEditDiscount` numeric DEFAULT '0',
	`ignorePricingRule` numeric DEFAULT '0',
	`saveButtonColour` text DEFAULT '#86efac',
	`cancelButtonColour` text DEFAULT '#f98080',
	`submitButtonColour` text DEFAULT '#86efac',
	`heldButtonColour` text DEFAULT '#f98080',
	`returnButtonColour` text DEFAULT '#f98080',
	`payButtonColour` text DEFAULT '#86efac',
	`payAndPrintButtonColour` text DEFAULT '#86efac',
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`posPrintTemplate`) REFERENCES `PrintTemplate`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`inventory`) REFERENCES `Location`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`posCustomer`) REFERENCES `Party`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `POSOpeningShift` (
	`name` text PRIMARY KEY NOT NULL,
	`openingDate` numeric,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `POSClosingShift` (
	`name` text PRIMARY KEY NOT NULL,
	`closingDate` numeric,
	`openingShift` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`openingShift`) REFERENCES `POSOpeningShift`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `ERPNextSyncQueue` (
	`name` text PRIMARY KEY NOT NULL,
	`referenceType` text NOT NULL,
	`documentName` text NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `FetchFromERPNextQueue` (
	`name` text PRIMARY KEY NOT NULL,
	`referenceType` text NOT NULL,
	`documentName` text NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `IntegrationErrorLog` (
	`name` text PRIMARY KEY NOT NULL,
	`spacer` text,
	`data` text,
	`error` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `SalesInvoice` (
	`name` text PRIMARY KEY NOT NULL,
	`numberSeries` text DEFAULT 'SINV-' NOT NULL,
	`party` text NOT NULL,
	`account` text NOT NULL,
	`date` numeric NOT NULL,
	`priceList` text,
	`netTotal` text,
	`baseGrandTotal` text,
	`grandTotal` text,
	`setDiscountAmount` numeric DEFAULT '0',
	`discountAmount` text,
	`discountPercent` real,
	`entryCurrency` text DEFAULT 'Party',
	`currency` text,
	`exchangeRate` real DEFAULT '1',
	`discountAfterTax` numeric DEFAULT '0',
	`makeAutoPayment` numeric DEFAULT '0',
	`makeAutoStockTransfer` numeric DEFAULT '0',
	`outstandingAmount` text,
	`stockNotTransferred` real,
	`terms` text,
	`attachment` text,
	`isReturned` numeric DEFAULT '0',
	`isFullyReturned` numeric DEFAULT '0',
	`isSyncedWithErp` numeric DEFAULT '0',
	`backReference` text,
	`returnAgainst` text,
	`quote` text,
	`loyaltyProgram` text,
	`availableLoyaltyPoints` integer,
	`redeemLoyaltyPoints` numeric DEFAULT '0',
	`loyaltyPoints` integer,
	`isPOS` numeric DEFAULT '0',
	`isPricingRuleApplied` numeric DEFAULT '0',
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`submitted` numeric NOT NULL,
	`cancelled` numeric NOT NULL,
	FOREIGN KEY (`loyaltyProgram`) REFERENCES `LoyaltyProgram`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`quote`) REFERENCES `SalesQuote`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`returnAgainst`) REFERENCES `SalesInvoice`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`backReference`) REFERENCES `Shipment`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`currency`) REFERENCES `Currency`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`priceList`) REFERENCES `PriceList`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`party`) REFERENCES `Party`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`numberSeries`) REFERENCES `NumberSeries`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `PurchaseInvoice` (
	`name` text PRIMARY KEY NOT NULL,
	`numberSeries` text DEFAULT 'PINV-' NOT NULL,
	`party` text NOT NULL,
	`account` text NOT NULL,
	`date` numeric NOT NULL,
	`priceList` text,
	`netTotal` text,
	`baseGrandTotal` text,
	`grandTotal` text,
	`setDiscountAmount` numeric DEFAULT '0',
	`discountAmount` text,
	`discountPercent` real,
	`entryCurrency` text DEFAULT 'Party',
	`currency` text,
	`exchangeRate` real DEFAULT '1',
	`discountAfterTax` numeric DEFAULT '0',
	`makeAutoPayment` numeric DEFAULT '0',
	`makeAutoStockTransfer` numeric DEFAULT '0',
	`outstandingAmount` text,
	`stockNotTransferred` real,
	`terms` text,
	`attachment` text,
	`isReturned` numeric DEFAULT '0',
	`isFullyReturned` numeric DEFAULT '0',
	`isSyncedWithErp` numeric DEFAULT '0',
	`backReference` text,
	`returnAgainst` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`submitted` numeric NOT NULL,
	`cancelled` numeric NOT NULL,
	FOREIGN KEY (`returnAgainst`) REFERENCES `PurchaseInvoice`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`backReference`) REFERENCES `PurchaseReceipt`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`currency`) REFERENCES `Currency`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`priceList`) REFERENCES `PriceList`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`party`) REFERENCES `Party`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`numberSeries`) REFERENCES `NumberSeries`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `SalesQuote` (
	`name` text PRIMARY KEY NOT NULL,
	`numberSeries` text DEFAULT 'SQUOT-' NOT NULL,
	`party` text NOT NULL,
	`date` numeric NOT NULL,
	`priceList` text,
	`netTotal` text,
	`baseGrandTotal` text,
	`grandTotal` text,
	`setDiscountAmount` numeric DEFAULT '0',
	`discountAmount` text,
	`discountPercent` real,
	`entryCurrency` text DEFAULT 'Party',
	`currency` text,
	`exchangeRate` real DEFAULT '1',
	`discountAfterTax` numeric DEFAULT '0',
	`makeAutoPayment` numeric DEFAULT '0',
	`outstandingAmount` text,
	`terms` text,
	`attachment` text,
	`isFullyReturned` numeric DEFAULT '0',
	`isSyncedWithErp` numeric DEFAULT '0',
	`referenceType` text DEFAULT 'Party' NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`submitted` numeric NOT NULL,
	`cancelled` numeric NOT NULL,
	FOREIGN KEY (`currency`) REFERENCES `Currency`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`priceList`) REFERENCES `PriceList`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`numberSeries`) REFERENCES `NumberSeries`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `SalesInvoiceItem` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`itemCode` text,
	`description` text,
	`rate` text NOT NULL,
	`transferUnit` text DEFAULT 'Unit',
	`transferQuantity` real DEFAULT '1' NOT NULL,
	`unit` text DEFAULT 'Unit',
	`batch` text,
	`quantity` real DEFAULT '1' NOT NULL,
	`unitConversionFactor` real DEFAULT '1' NOT NULL,
	`account` text NOT NULL,
	`tax` text,
	`amount` text,
	`setItemDiscountAmount` numeric DEFAULT '0',
	`itemDiscountAmount` text,
	`itemDiscountPercent` real,
	`hsnCode` integer,
	`stockNotTransferred` real,
	`isFreeItem` numeric DEFAULT '0',
	`pricingRule` text,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`tax`) REFERENCES `Tax`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`batch`) REFERENCES `Batch`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`unit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`transferUnit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `PurchaseInvoiceItem` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`itemCode` text,
	`description` text,
	`rate` text NOT NULL,
	`transferUnit` text DEFAULT 'Unit',
	`transferQuantity` real DEFAULT '1' NOT NULL,
	`unit` text DEFAULT 'Unit',
	`batch` text,
	`quantity` real DEFAULT '1' NOT NULL,
	`unitConversionFactor` real DEFAULT '1' NOT NULL,
	`account` text NOT NULL,
	`tax` text,
	`amount` text,
	`setItemDiscountAmount` numeric DEFAULT '0',
	`itemDiscountAmount` text,
	`itemDiscountPercent` real,
	`hsnCode` integer,
	`stockNotTransferred` real,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`tax`) REFERENCES `Tax`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`batch`) REFERENCES `Batch`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`unit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`transferUnit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `SalesQuoteItem` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`itemCode` text,
	`description` text,
	`rate` text NOT NULL,
	`transferUnit` text DEFAULT 'Unit',
	`transferQuantity` real DEFAULT '1' NOT NULL,
	`unit` text DEFAULT 'Unit',
	`batch` text,
	`quantity` real DEFAULT '1' NOT NULL,
	`unitConversionFactor` real DEFAULT '1' NOT NULL,
	`account` text NOT NULL,
	`tax` text,
	`amount` text,
	`setItemDiscountAmount` numeric DEFAULT '0',
	`itemDiscountAmount` text,
	`itemDiscountPercent` real,
	`hsnCode` integer,
	`stockNotTransferred` real,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`tax`) REFERENCES `Tax`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`account`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`batch`) REFERENCES `Batch`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`unit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`transferUnit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `Shipment` (
	`name` text PRIMARY KEY NOT NULL,
	`numberSeries` text DEFAULT 'SHPM-' NOT NULL,
	`party` text NOT NULL,
	`date` numeric NOT NULL,
	`grandTotal` text,
	`terms` text,
	`attachment` text,
	`isReturned` numeric DEFAULT '0',
	`backReference` text,
	`returnAgainst` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`submitted` numeric NOT NULL,
	`cancelled` numeric NOT NULL,
	FOREIGN KEY (`returnAgainst`) REFERENCES `Shipment`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`backReference`) REFERENCES `SalesInvoice`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`party`) REFERENCES `Party`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`numberSeries`) REFERENCES `NumberSeries`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `ShipmentItem` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`location` text NOT NULL,
	`transferUnit` text DEFAULT 'Unit',
	`transferQuantity` real DEFAULT '1' NOT NULL,
	`unit` text DEFAULT 'Unit',
	`batch` text,
	`serialNumber` text,
	`quantity` real DEFAULT '1' NOT NULL,
	`unitConversionFactor` real DEFAULT '1' NOT NULL,
	`rate` text NOT NULL,
	`amount` text,
	`itemDiscountAmount` text,
	`itemDiscountPercent` real,
	`description` text,
	`hsnCode` integer,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`batch`) REFERENCES `Batch`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`unit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`transferUnit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`location`) REFERENCES `Location`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `PurchaseReceipt` (
	`name` text PRIMARY KEY NOT NULL,
	`numberSeries` text DEFAULT 'PREC-' NOT NULL,
	`party` text NOT NULL,
	`date` numeric NOT NULL,
	`grandTotal` text,
	`terms` text,
	`attachment` text,
	`isReturned` numeric DEFAULT '0',
	`backReference` text,
	`returnAgainst` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`submitted` numeric NOT NULL,
	`cancelled` numeric NOT NULL,
	FOREIGN KEY (`returnAgainst`) REFERENCES `PurchaseReceipt`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`backReference`) REFERENCES `PurchaseInvoice`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`party`) REFERENCES `Party`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`numberSeries`) REFERENCES `NumberSeries`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `PurchaseReceiptItem` (
	`name` text PRIMARY KEY NOT NULL,
	`item` text NOT NULL,
	`location` text NOT NULL,
	`transferUnit` text DEFAULT 'Unit',
	`transferQuantity` real DEFAULT '1' NOT NULL,
	`unit` text DEFAULT 'Unit',
	`batch` text,
	`serialNumber` text,
	`quantity` real DEFAULT '1' NOT NULL,
	`unitConversionFactor` real DEFAULT '1' NOT NULL,
	`rate` text NOT NULL,
	`amount` text,
	`itemDiscountAmount` text,
	`itemDiscountPercent` real,
	`description` text,
	`hsnCode` integer,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL,
	FOREIGN KEY (`batch`) REFERENCES `Batch`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`unit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`transferUnit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`location`) REFERENCES `Location`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`item`) REFERENCES `Item`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `ClosingAmounts` (
	`name` text PRIMARY KEY NOT NULL,
	`paymentMethod` text NOT NULL,
	`openingAmount` text,
	`closingAmount` text,
	`expectedAmount` text,
	`differenceAmount` text,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ClosingCash` (
	`name` text PRIMARY KEY NOT NULL,
	`denomination` text NOT NULL,
	`count` integer DEFAULT '0' NOT NULL,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `DefaultCashDenominations` (
	`name` text PRIMARY KEY NOT NULL,
	`denomination` text NOT NULL,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `OpeningAmounts` (
	`name` text PRIMARY KEY NOT NULL,
	`paymentMethod` text NOT NULL,
	`amount` text,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `OpeningCash` (
	`name` text PRIMARY KEY NOT NULL,
	`denomination` text NOT NULL,
	`count` integer DEFAULT '0' NOT NULL,
	`idx` integer NOT NULL,
	`parent` text NOT NULL,
	`parentSchemaName` text NOT NULL,
	`parentFieldname` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `PatchRun` (
	`name` text PRIMARY KEY NOT NULL,
	`failed` numeric DEFAULT '0',
	`version` text DEFAULT '0.0.0',
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `SingleValue` (
	`name` text PRIMARY KEY NOT NULL,
	`parent` text NOT NULL,
	`fieldname` text NOT NULL,
	`value` text NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Item` (
	`image` text,
	`name` text PRIMARY KEY NOT NULL,
	`itemCode` text,
	`itemGroup` text,
	`for` text DEFAULT 'Both' NOT NULL,
	`itemType` text DEFAULT 'Product',
	`unit` text DEFAULT 'Unit',
	`rate` text,
	`description` text,
	`incomeAccount` text NOT NULL,
	`expenseAccount` text NOT NULL,
	`tax` text,
	`hsnCode` text,
	`barcode` text,
	`trackItem` numeric DEFAULT '0',
	`hasBatch` numeric DEFAULT '0',
	`batchSeries` text,
	`hasSerialNumber` numeric DEFAULT '0',
	`serialNumberSeries` text,
	`datafromErp` numeric DEFAULT '0',
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	FOREIGN KEY (`tax`) REFERENCES `Tax`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`expenseAccount`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`incomeAccount`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`unit`) REFERENCES `UOM`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`itemGroup`) REFERENCES `ItemGroup`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `Party` (
	`image` text,
	`name` text PRIMARY KEY NOT NULL,
	`role` text DEFAULT 'Both' NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`defaultAccount` text,
	`currency` text,
	`fromLead` text,
	`loyaltyProgram` text,
	`loyaltyPoints` integer DEFAULT '0',
	`outstandingAmount` text,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`created` numeric NOT NULL,
	`modified` numeric NOT NULL,
	`gstType` text DEFAULT 'Unregistered',
	`gstin` text,
	FOREIGN KEY (`loyaltyProgram`) REFERENCES `LoyaltyProgram`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`fromLead`) REFERENCES `Lead`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`currency`) REFERENCES `Currency`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`defaultAccount`) REFERENCES `Account`(`name`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`address`) REFERENCES `Address`(`name`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `CashDenominations` (
	`name` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL,
	`modified` text NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`idx` integer DEFAULT 0,
	`parent` text,
	`parentSchemaName` text,
	`parentFieldname` text,
	`denomination` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Invoice` (
	`name` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL,
	`modified` text NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`idx` integer DEFAULT 0,
	`parent` text,
	`parentSchemaName` text,
	`parentFieldname` text,
	`account` text NOT NULL,
	`date` text NOT NULL,
	`priceList` text,
	`netTotal` real,
	`baseGrandTotal` real,
	`grandTotal` real,
	`setDiscountAmount` integer DEFAULT false,
	`discountAmount` real,
	`discountPercent` real,
	`entryCurrency` text DEFAULT 'Party',
	`currency` text,
	`exchangeRate` real DEFAULT 1,
	`discountAfterTax` integer DEFAULT false,
	`makeAutoPayment` integer DEFAULT false,
	`outstandingAmount` real,
	`terms` text,
	`isReturned` integer DEFAULT false,
	`isFullyReturned` integer DEFAULT false,
	`isSyncedWithErp` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `InvoiceItem` (
	`name` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL,
	`modified` text NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`idx` integer DEFAULT 0,
	`parent` text,
	`parentSchemaName` text,
	`parentFieldname` text,
	`item` text NOT NULL,
	`itemCode` text,
	`description` text,
	`rate` real NOT NULL,
	`transferUnit` text DEFAULT 'Unit',
	`transferQuantity` real DEFAULT 1 NOT NULL,
	`qty` real DEFAULT 1,
	`unit` text DEFAULT 'Unit',
	`batch` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`unitConversionFactor` real DEFAULT 1 NOT NULL,
	`account` text NOT NULL,
	`tax` text,
	`amount` real,
	`setItemDiscountAmount` integer DEFAULT false,
	`itemDiscountAmount` real,
	`itemDiscountPercent` real,
	`itemDiscountedTotal` real,
	`itemTaxedTotal` real,
	`hsnCode` integer,
	`stockNotTransferred` real
);
--> statement-breakpoint
CREATE TABLE `POSShiftAmounts` (
	`name` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL,
	`modified` text NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`idx` integer DEFAULT 0,
	`parent` text,
	`parentSchemaName` text,
	`parentFieldname` text,
	`paymentMethod` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `StockTransfer` (
	`name` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL,
	`modified` text NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`idx` integer DEFAULT 0,
	`parent` text,
	`parentSchemaName` text,
	`parentFieldname` text,
	`party` text NOT NULL,
	`date` text NOT NULL,
	`grandTotal` real,
	`terms` text,
	`isReturned` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `StockTransferItem` (
	`name` text PRIMARY KEY NOT NULL,
	`created` text NOT NULL,
	`modified` text NOT NULL,
	`createdBy` text NOT NULL,
	`modifiedBy` text NOT NULL,
	`idx` integer DEFAULT 0,
	`parent` text,
	`parentSchemaName` text,
	`parentFieldname` text,
	`item` text NOT NULL,
	`location` text NOT NULL,
	`transferUnit` text DEFAULT 'Unit',
	`transferQuantity` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT 'Unit',
	`batch` text,
	`serialNumber` text,
	`quantity` real DEFAULT 1 NOT NULL,
	`unitConversionFactor` real DEFAULT 1 NOT NULL,
	`rate` real NOT NULL,
	`amount` real,
	`itemDiscountAmount` real,
	`itemDiscountPercent` real,
	`description` text,
	`hsnCode` integer
);

*/