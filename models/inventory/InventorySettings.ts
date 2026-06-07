import { Doc } from 'fyo/model/doc';
import { FiltersMap, ReadOnlyMap } from 'fyo/model/types';
import { AccountTypeEnum } from 'models/baseModels/Account/types';

export class InventorySettings extends Doc {
  declare defaultLocation?: string;
  declare stockInHand?: string;
  declare stockReceivedButNotBilled?: string;
  declare costOfGoodsSold?: string;
  declare enableBarcodes?: boolean;
  declare enableBatches?: boolean;
  declare enableSerialNumber?: boolean;
  declare enableUomConversions?: boolean;
  declare enableStockReturns?: boolean;
  declare enablePointOfSale?: boolean;

  static filters: FiltersMap = {
    stockInHand: () => ({
      isGroup: false,
      accountType: AccountTypeEnum.Stock,
    }),
    stockReceivedButNotBilled: () => ({
      isGroup: false,
      accountType: AccountTypeEnum['Stock Received But Not Billed'],
    }),
    costOfGoodsSold: () => ({
      isGroup: false,
      accountType: AccountTypeEnum['Cost of Goods Sold'],
    }),
  };

  readOnly: ReadOnlyMap = {
    enableBarcodes: () => {
      return !!this.enableBarcodes;
    },
    enableBatches: () => {
      return !!this.enableBatches;
    },
    enableSerialNumber: () => {
      return !!this.enableSerialNumber;
    },
    enableUomConversions: () => {
      return !!this.enableUomConversions;
    },
    enableStockReturns: () => {
      return !!this.enableStockReturns;
    },
    enablePointOfSale: () => {
      return !!this.fyo.singles.POSSettings?.isShiftOpen;
    },
  };
}
