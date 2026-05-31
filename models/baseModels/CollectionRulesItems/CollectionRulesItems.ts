import { Doc } from 'fyo/model/doc';
import { Money } from 'pesa';

export class CollectionRulesItems extends Doc {
  declare tierName?: string;
  declare collectionFactor?: number;
  declare minimumTotalSpent?: Money;
}
