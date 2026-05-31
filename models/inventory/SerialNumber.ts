import { Doc } from 'fyo/model/doc';
import { ListViewSettings } from 'fyo/model/types';
import { getSerialNumberStatusColumn } from 'models/helpers';
import { SerialNumberStatus } from './types';

export class SerialNumber extends Doc {
  declare name?: string;
  declare item?: string;
  declare description?: string;
  declare status?: SerialNumberStatus;

  static getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'name',
        getSerialNumberStatusColumn(),
        'item',
        'description',
        'party',
      ],
    };
  }
}
