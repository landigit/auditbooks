import { Doc } from "fyo/model/doc";
import { FiltersMap, HiddenMap } from "fyo/model/types";
import {
  AccountRootTypeEnum,
  AccountTypeEnum,
} from "models/baseModels/Account/types";

export class POSSettings extends Doc {
  declare isShiftOpen?: boolean;
  declare inventory?: string;
  declare cashAccount?: string;
  declare writeOffAccount?: string;
  declare weightEnabledBarcode?: boolean;
  declare checkDigits?: number;
  declare itemCodeDigits?: number;
  declare itemWeightDigits?: number;
  declare defaultAccount?: string;
  declare itemVisibility?: string;
  declare itemVisibilityERP?: "ERP Sync Items";
  declare posUI?: "Classic" | "Modern";
  declare canChangeRate?: boolean;
  declare canEditDiscount?: boolean;
  declare ignorePricingRule?: boolean;

  static filters: FiltersMap = {
    cashAccount: () => ({
      rootType: AccountRootTypeEnum.Asset,
      accountType: AccountTypeEnum.Cash,
      isGroup: false,
    }),
    defaultAccount: () => ({
      isGroup: false,
      accountType: AccountTypeEnum.Receivable,
    }),
  };

  hidden: HiddenMap = {
    weightEnabledBarcode: () =>
      !this.fyo.singles.InventorySettings?.enableBarcodes,
    checkDigits: () =>
      !this.fyo.singles.InventorySettings?.enableBarcodes ||
      !this.weightEnabledBarcode,
    itemCodeDigits: () =>
      !this.fyo.singles.InventorySettings?.enableBarcodes ||
      !this.weightEnabledBarcode,
    itemWeightDigits: () =>
      !this.fyo.singles.InventorySettings?.enableBarcodes ||
      !this.weightEnabledBarcode,
    itemVisibility: () =>
      !this.fyo.singles.AccountingSettings?.enablePointOfSaleWithOutInventory ||
      !!this.fyo.singles.AccountingSettings?.enableERPNextSync,
    itemVisibilityERP: () =>
      !this.fyo.singles.AccountingSettings?.enableERPNextSync,
  };
}
