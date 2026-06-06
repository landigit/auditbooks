import { Doc } from "fyo/model/doc";
import { Money } from "pesa";

export class OpeningAmounts extends Doc {
  declare amount?: Money;
  declare paymentMethod?: "Cash" | "Transfer";

  get openingCashAmount() {
    return this.parentdoc?.openingCashAmount as Money;
  }
}
