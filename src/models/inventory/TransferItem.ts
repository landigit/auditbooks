import { Doc } from 'fyo/model/doc';
import type { Transfer } from './Transfer';
import type { Money } from 'pesa';

export class TransferItem extends Doc {
  declare item?: string;

  declare unit?: string;
  declare transferUnit?: string;
  declare quantity?: number;
  declare transferQuantity?: number;
  declare unitConversionFactor?: number;

  declare rate?: Money;
  declare amount?: Money;

  declare batch?: string;
  declare serialNumber?: string;

  declare parentdoc?: Transfer;
}
