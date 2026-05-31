import { Doc } from 'fyo/model/doc';
import type { FormulaMap } from 'fyo/model/types';
import { ModelNameEnum } from 'models/types';
import type { Money } from 'pesa';
import type { PriceList } from './PriceList';

export class PriceListItem extends Doc {
  declare item?: string;
  declare unit?: string;
  declare rate?: Money;
  declare parentdoc?: PriceList;

  formulas: FormulaMap = {
    unit: {
      formula: async () => {
        if (!this.item) {
          return;
        }

        return await this.fyo.getValue(ModelNameEnum.Item, this.item, 'unit');
      },
      dependsOn: ['item'],
    },
  };
}
