import { Doc } from 'fyo/model/doc';
import type { ListViewSettings } from 'fyo/model/types';
import type { PaymentMethodType } from 'models/types';
import type { Account } from '../Account/Account';

export class PaymentMethod extends Doc {
  name?: string;
  account?: Account;
  type?: PaymentMethodType;

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', 'type'],
    };
  }
}
