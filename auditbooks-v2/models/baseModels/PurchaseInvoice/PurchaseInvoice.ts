import type { Fyo } from "fyo";
import type { Action, ListViewSettings } from "fyo/model/types";
import { LedgerPosting } from "models/Transactional/LedgerPosting";
import { createBatch } from "models/inventory/helpers";
import { ModelNameEnum } from "models/types";
import { getInvoiceActions, getTransactionStatusColumn } from "../../helpers";
import { Invoice } from "../Invoice/Invoice";
import type { PurchaseInvoiceItem } from "../PurchaseInvoiceItem/PurchaseInvoiceItem";

export class PurchaseInvoice extends Invoice {
	items?: PurchaseInvoiceItem[];

	async beforeSubmit(): Promise<void> {
		await super.beforeSubmit();

		if (this.isReturn) {
			return;
		}

		const batchesToCreate: { item: string; batch: string }[] = [];

		for (const item of this.items ?? []) {
			if (!item.item || !item.batch) {
				continue;
			}

			const hasBatch = await this.fyo.getValue(
				ModelNameEnum.Item,
				item.item,
				"hasBatch",
			);

			if (hasBatch) {
				batchesToCreate.push({
					item: item.item,
					batch: item.batch,
				});
			}
		}

		for (const { item, batch } of batchesToCreate) {
			await createBatch(this.fyo, item, batch);
		}
	}

	async getPosting() {
		const exchangeRate = this.exchangeRate ?? 1;
		const posting: LedgerPosting = new LedgerPosting(this, this.fyo);
		const baseGrandTotal = this.baseGrandTotal || this.fyo.pesa(0);
		const account = this.account || "";

		if (this.isReturn) {
			await posting.debit(account, baseGrandTotal);
		} else {
			await posting.credit(account, baseGrandTotal);
		}

		for (const item of this.items ?? []) {
			const itemAmount = item.amount?.mul(exchangeRate) || this.fyo.pesa(0);
			const itemAccount = item.account || "";
			if (this.isReturn) {
				await posting.credit(itemAccount, itemAmount);
				continue;
			}
			await posting.debit(itemAccount, itemAmount);
		}

		if (this.taxes) {
			for (const tax of this.taxes) {
				const taxAmount = tax.amount?.mul(exchangeRate) || this.fyo.pesa(0);
				const taxAccount = tax.account || "";
				if (this.isReturn) {
					await posting.credit(taxAccount, taxAmount);
					continue;
				}
				await posting.debit(taxAccount, taxAmount);
			}
		}

		const discountAmount = this.getTotalDiscount();
		const discountAccount = this.fyo.singles.AccountingSettings
			?.discountAccount as string | undefined;
		if (discountAccount && discountAmount.isPositive()) {
			if (this.isReturn) {
				await posting.debit(discountAccount, discountAmount.mul(exchangeRate));
			} else {
				await posting.credit(discountAccount, discountAmount.mul(exchangeRate));
			}
		}

		await posting.makeRoundOffEntry();
		return posting;
	}

	static getListViewSettings(): ListViewSettings {
		return {
			columns: [
				"name",
				getTransactionStatusColumn(),
				"party",
				"date",
				"baseGrandTotal",
				"outstandingAmount",
			],
		};
	}

	static getActions(fyo: Fyo): Action[] {
		return getInvoiceActions(fyo, ModelNameEnum.PurchaseInvoice);
	}
}
