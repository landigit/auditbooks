import { Doc } from 'fyo/model/doc';
import type { ListViewSettings } from 'fyo/model/types';

export class ItemGroup extends Doc {
  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', 'tax', 'hsnCode'],
    };
  }
}
