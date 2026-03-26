import type { DocValue } from "fyo/core/types";
import type { ValidationMap } from "fyo/model/types";
import { validateCouponCode } from "models/helpers";
import { InvoiceItem } from "../InvoiceItem/InvoiceItem";

export class AppliedCouponCodes extends InvoiceItem {
	coupons?: string;

	validations: ValidationMap = {
		coupons: async (value: DocValue) => {
			if (!value) {
				return;
			}

			await validateCouponCode(this as AppliedCouponCodes, value as string);
		},
	};
}
