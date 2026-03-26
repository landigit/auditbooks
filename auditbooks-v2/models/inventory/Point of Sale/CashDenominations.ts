import { Doc } from "fyo/model/doc";
import type { Money } from "pesa";

export abstract class CashDenominations extends Doc {
	denomination?: Money;
}
