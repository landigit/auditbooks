import { Doc } from 'fyo/model/doc';
import { FormulaMap } from 'fyo/model/types';
import { ModelNameEnum } from 'models/types';

export class PricingRuleItem extends Doc {
  declare item?: string;
  declare unit?: string;

  formulas: FormulaMap = {
    unit: {
      formula: () => {
        if (!this.item) {
          return;
        }
        return this.fyo.getValue(ModelNameEnum.Item, this.item, 'unit');
      },
    },
  };
}
