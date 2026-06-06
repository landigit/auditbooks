import { Doc } from "fyo/model/doc";
import { ListViewSettings } from "fyo/model/types";
import { Money } from "pesa";

export class StockLedgerEntry extends Doc {
  declare date?: Date;
  declare item?: string;
  declare rate?: Money;
  declare quantity?: number;
  declare location?: string;
  declare referenceName?: string;
  declare referenceType?: string;
  declare batch?: string;
  declare serialNumber?: string;

  static override getListViewSettings(): ListViewSettings {
    return {
      columns: [
        "date",
        "item",
        "location",
        "rate",
        "quantity",
        "referenceName",
      ],
    };
  }
}
