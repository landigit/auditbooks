import { type Fyo, t } from "fyo";
import type { DocValue } from "fyo/core/types";
import type { Doc } from "fyo/model/doc";
import type { Action, ListViewSettings, ValidationMap } from "fyo/model/types";
import { ValidationError } from "fyo/utils/errors";
import { LedgerPosting } from "models/Transactional/LedgerPosting";
import { ModelNameEnum } from "models/types";
import type { Money } from "pesa";
import {
	getAddedLPWithGrandTotal,
	getInvoiceActions,
	getReturnLoyaltyPoints,
	getTransactionStatusColumn,
} from "../../helpers";
import { Invoice } from "../Invoice/Invoice";
import type { LoyaltyProgram } from "../LoyaltyProgram/LoyaltyProgram";
import type { Party } from "../Party/Party";
import type { SalesInvoiceItem } from "../SalesInvoiceItem/SalesInvoiceItem";

export class SalesInvoice extends Invoice {
	items?: SalesInvoiceItem[];

	async getPosting() {
		const exchangeRate = this.exchangeRate ?? 1;
		const posting: LedgerPosting = new LedgerPosting(this, this.fyo);
		const baseGrandTotal = this.baseGrandTotal || this.fyo.pesa(0);
		const account = this.account || "";

		if (this.isReturn) {
			await posting.credit(account, baseGrandTotal);
		} else {
			await posting.debit(account, baseGrandTotal);
		}

		for (const item of this.items ?? []) {
			const itemAmount = item.amount?.mul(exchangeRate) || this.fyo.pesa(0);
			const itemAccount = item.account || "";
			if (this.isReturn) {
				await posting.debit(itemAccount, itemAmount);
				continue;
			}
			await posting.credit(itemAccount, itemAmount);
		}

		if (this.redeemLoyaltyPoints) {
			const loyaltyProgramDoc = (await this.fyo.doc.getDoc(
				ModelNameEnum.LoyaltyProgram,
				this.loyaltyProgram,
			)) as LoyaltyProgram;

			let loyaltyAmount;

			if (this.isReturn) {
				loyaltyAmount = this.fyo.pesa(await getReturnLoyaltyPoints(this));
			} else {
				loyaltyAmount = await getAddedLPWithGrandTotal(
					this.fyo,
					this.loyaltyProgram as string,
					this.loyaltyPoints as number,
				);
			}

			await posting.debit(
				loyaltyProgramDoc.expenseAccount as string,
				loyaltyAmount,
			);
		}

		if (this.taxes) {
			for (const tax of this.taxes) {
				const taxAmount = tax.amount?.mul(exchangeRate) || this.fyo.pesa(0);
				const taxAccount = tax.account || "";
				if (this.isReturn) {
					await posting.debit(taxAccount, taxAmount);
					continue;
				}
				await posting.credit(taxAccount, taxAmount);
			}
		}

		const discountAmount = this.getTotalDiscount();
		const discountAccount = this.fyo.singles.AccountingSettings
			?.discountAccount as string | undefined;
		if (discountAccount && discountAmount.isPositive()) {
			if (this.isReturn) {
				await posting.credit(discountAccount, discountAmount.mul(exchangeRate));
			} else {
				await posting.debit(discountAccount, discountAmount.mul(exchangeRate));
			}
		}

		await posting.makeRoundOffEntry();
		return posting;
	}

	validations: ValidationMap = {
		loyaltyPoints: async (value: DocValue) => {
			if (!this.redeemLoyaltyPoints || this.isSubmitted || this.isReturn) {
				return;
			}

			const partyDoc = (await this.fyo.doc.getDoc(
				ModelNameEnum.Party,
				this.party,
			)) as Party;

			if ((value as number) <= 0) {
				throw new ValidationError(t`Points must be greather than 0`);
			}

			if ((value as number) > (partyDoc?.loyaltyPoints || 0)) {
				throw new ValidationError(
					t`${this.party as string} only has ${
						partyDoc.loyaltyPoints as number
					} points`,
				);
			}

			const loyaltyProgramDoc = (await this.fyo.doc.getDoc(
				ModelNameEnum.LoyaltyProgram,
				this.loyaltyProgram,
			)) as LoyaltyProgram;
			const toDate = loyaltyProgramDoc?.toDate as Date;
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (toDate && new Date(toDate).getTime() < today.getTime()) {
				return;
			}

			if (!this?.grandTotal) {
				return;
			}

			const loyaltyPoint =
				((value as number) || 0) *
				((loyaltyProgramDoc?.conversionFactor as number) || 0);

			if (!this.isReturn) {
				const totalDiscount = this.getTotalDiscount();
				let baseGrandTotal;

				if (!this.taxes?.length) {
					baseGrandTotal = (this.netTotal as Money).sub(totalDiscount);
				} else {
					baseGrandTotal = ((this.taxes ?? []) as Doc[])
						.map((doc) => doc.amount as Money)
						.reduce((a, b) => {
							if (this.isReturn) {
								return a.abs().add(b.abs()).neg();
							}
							return a.add(b.abs());
						}, (this.netTotal as Money).abs())
						.sub(totalDiscount);
				}

				if (baseGrandTotal?.lt(loyaltyPoint)) {
					throw new ValidationError(
						t`no need ${value as number} points to purchase this item`,
					);
				}
			}
		},
	};

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
		return getInvoiceActions(fyo, ModelNameEnum.SalesInvoice);
	}
}
