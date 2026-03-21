import type { Fyo } from "fyo";
import type { Action, ListViewSettings } from "fyo/model/types";
import {
	getStockTransferActions,
	getTransactionStatusColumn,
} from "models/helpers";
import { ModelNameEnum } from "models/types";
import type { PurchaseReceiptItem } from "./PurchaseReceiptItem";
import { StockTransfer } from "./StockTransfer";

export class PurchaseReceipt extends StockTransfer {
	items?: PurchaseReceiptItem[];

	static getListViewSettings(): ListViewSettings {
		return {
			columns: [
				"name",
				getTransactionStatusColumn(),
				"party",
				"date",
				"grandTotal",
			],
		};
	}

	static getActions(fyo: Fyo): Action[] {
		return getStockTransferActions(fyo, ModelNameEnum.PurchaseReceipt);
	}
}
