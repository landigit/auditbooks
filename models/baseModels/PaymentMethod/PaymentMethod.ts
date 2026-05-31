import { Doc } from 'fyo/model/doc';
import { Account } from '../Account/Account';
import { ListViewSettings } from 'fyo/model/types';
import { PaymentMethodType } from 'models/types';

export class PaymentMethod extends Doc {
  declare name?: string;
  declare account?: Account;
  declare type?: PaymentMethodType;

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', 'type'],
    };
  }
}
