import { Doc } from "fyo/model/doc";
import { HiddenMap, ListViewSettings } from "fyo/model/types";

export class ERPNextSyncQueue extends Doc {
  declare referenceType?: string;
  declare documentName?: string;

  hidden: HiddenMap = {
    name: () => true,
  };

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ["referenceType", "documentName"],
    };
  }
}
