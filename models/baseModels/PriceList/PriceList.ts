import { Doc } from 'fyo/model/doc';
import { ListViewSettings } from 'fyo/model/types';
import { PriceListItem } from './PriceListItem';
import {
  getIsDocEnabledColumn,
  getPriceListStatusColumn,
} from 'models/helpers';

export class PriceList extends Doc {
  declare isEnabled?: boolean;
  declare isSales?: boolean;
  declare isPurchase?: boolean;
  declare priceListItem?: PriceListItem[];

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', getIsDocEnabledColumn(), getPriceListStatusColumn()],
    };
  }
}
