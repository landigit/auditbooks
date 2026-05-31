import { Doc } from 'fyo/model/doc';
import { ListViewSettings } from 'fyo/model/types';

export class ItemEnquiry extends Doc {
  declare item?: string;
  declare customer?: string;
  declare contact?: string;
  declare description?: string;
  declare similarProduct?: string;

  static override getListViewSettings(): ListViewSettings {
    return {
      columns: ['item', 'customer', 'contact', 'description', 'similarProduct'],
    };
  }
}
