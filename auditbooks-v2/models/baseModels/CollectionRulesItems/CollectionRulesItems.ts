import { Doc } from "fyo/model/doc";
import type { Money } from "pesa";

export class CollectionRulesItems extends Doc {
	tierName?: string;
	collectionFactor?: number;
	minimumTotalSpent?: Money;
}
