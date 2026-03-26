import { Doc } from "fyo/model/doc";
import type { ListViewSettings } from "fyo/model/types";
import type { ClosingAmounts } from "./ClosingAmounts";
import type { ClosingCash } from "./ClosingCash";

export class POSClosingShift extends Doc {
	closingAmounts?: ClosingAmounts[];
	closingCash?: ClosingCash[];
	closingDate?: Date;
	openingShift?: string;

	get closingCashAmount() {
		if (!this.closingCash) {
			return this.fyo.pesa(0);
		}

		let closingAmount = this.fyo.pesa(0);

		this.closingCash.map((row: ClosingCash) => {
			const denomination = row.denomination ?? this.fyo.pesa(0);
			const count = row.count ?? 0;

			const amount = denomination.mul(count);
			closingAmount = closingAmount.add(amount);
		});
		return closingAmount;
	}

	static getListViewSettings(): ListViewSettings {
		return {
			columns: ["name", "closingDate"],
		};
	}
}
