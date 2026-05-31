import { Doc } from 'fyo/model/doc';
import { FiltersMap } from 'fyo/model/types';
import { ModelNameEnum } from 'models/types';

export class POSProfile extends Doc {
  declare posProfile?: string;
  declare posCustomer?: string;
  declare defaultLocation?: string;
  declare posPrintTemplate?: string;
  declare inventory?: string;
  declare posUI?: 'Classic' | 'Modern';
  declare isShiftOpen?: boolean;
  declare itemVisibility?: string;
  declare canChangeRate?: boolean;
  declare hideUnavailableItems?: boolean;
  declare canEditDiscount?: boolean;
  declare ignorePricingRule?: boolean;

  static filters: FiltersMap = {
    posPrintTemplate: () => ({ type: ModelNameEnum.SalesInvoice }),
  };
}
