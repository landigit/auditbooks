import { Doc } from 'fyo/model/doc';
import { SchemaMap } from 'schemas/types';
import { ListsMap, ListViewSettings, ReadOnlyMap } from 'fyo/model/types';
import { ModelNameEnum } from 'models/types';
import { Fyo } from 'fyo';

export class PrintTemplate extends Doc {
  name?: string;
  type?: string;
  width?: number;
  height?: number;
  template?: string;
  isCustom?: boolean;

  override get canDelete(): boolean {
    if (this.isCustom === false) {
      return false;
    }

    return super.canDelete;
  }

  static getListViewSettings(fyo: Fyo): ListViewSettings {
    return {
      formRoute: (name) => `/template-builder/${name}`,
      columns: [
        'name',
        {
          label: fyo.t`Type`,
          fieldtype: 'AutoComplete',
          fieldname: 'type',
          display(value) {
            return fyo.schemaMap[value as string]?.label ?? '';
          },
        },
        {
          label: fyo.t`Is Custom`,
          fieldname: 'isCustom',
          fieldtype: 'Data',
          display(value) {
            return value ? fyo.t`Yes` : fyo.t`No`;
          },
        },
        {
          label: fyo.t`Created At`,
          fieldname: 'created',
          fieldtype: 'Datetime',
          display(value) {
            if (!value) return '';
            const d = new Date(String(value));
            if (isNaN(d.getTime())) return String(value);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            let hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
            return `${day}/${month}/${year} ${strTime}`;
          },
        },
      ],
    };
  }

  readOnly: ReadOnlyMap = {
    name: () => !this.isCustom,
    type: () => !this.isCustom,
    template: () => !this.isCustom,
  };

  static lists: ListsMap = {
    type(doc?: Doc) {
      let schemaMap: SchemaMap = {};
      if (doc) {
        schemaMap = doc.fyo.schemaMap;
      }

      const models = [
        ModelNameEnum.SalesInvoice,
        ModelNameEnum.SalesQuote,
        ModelNameEnum.PurchaseInvoice,
        ModelNameEnum.JournalEntry,
        ModelNameEnum.Payment,
        ModelNameEnum.Shipment,
        ModelNameEnum.PurchaseReceipt,
        ModelNameEnum.StockMovement,
      ];

      return models.map((value) => ({
        value,
        label: schemaMap[value]?.label ?? value,
      }));
    },
  };

  override duplicate(): Doc {
    const doc = super.duplicate() as PrintTemplate;
    doc.isCustom = true;
    return doc;
  }
}
