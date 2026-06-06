import { Doc } from "fyo/model/doc";
import { FormulaMap } from "fyo/model/types";
import { Money } from "pesa";

export class ClosingAmounts extends Doc {
  declare closingAmount?: Money;
  declare differenceAmount?: Money;
  declare expectedAmount?: Money;
  declare openingAmount?: Money;
  declare paymentMethod?: string;

  formulas: FormulaMap = {
    differenceAmount: {
      formula: () => {
        if (!this.closingAmount) {
          return this.fyo.pesa(0);
        }

        if (!this.expectedAmount) {
          return this.fyo.pesa(0);
        }

        return this.closingAmount.sub(this.expectedAmount);
      },
    },
  };
}
