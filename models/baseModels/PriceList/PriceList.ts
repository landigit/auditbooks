import { Doc } from 'fyo/model/doc';
import type { ListViewSettings } from 'fyo/model/types';
import {
  getIsDocEnabledColumn,
  getPriceListStatusColumn,
} from 'models/helpers';
import type { PriceListItem } from './PriceListItem';

export class PriceList extends Doc {
  isEnabled?: boolean;
  isSales?: boolean;
  isPurchase?: boolean;
  priceListItem?: PriceListItem[];

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', getIsDocEnabledColumn(), getPriceListStatusColumn()],
    };
  }
}
