import { Doc } from "fyo/model/doc";
import { ListViewSettings } from "fyo/model/types";
import { ModelNameEnum } from "models/types";
import { Money } from "pesa";

export class AccountingLedgerEntry extends Doc {
  declare date?: string | Date;
  declare account?: string;
  declare party?: string;
  declare debit?: Money;
  declare credit?: Money;
  declare referenceType?: string;
  declare referenceName?: string;
  declare reverted?: boolean;

  async revert() {
    if (this.reverted) {
      return;
    }

    await this.set("reverted", true);
    const revertedEntry = this.fyo.doc.getNewDoc(
      ModelNameEnum.AccountingLedgerEntry,
      {
        account: this.account,
        party: this.party,
        date: new Date(),
        referenceType: this.referenceType,
        referenceName: this.referenceName,
        debit: this.credit,
        credit: this.debit,
        reverted: true,
        reverts: this.name,
      },
    );

    await this.sync();
    await revertedEntry.sync();
  }

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ["date", "account", "party", "debit", "credit", "referenceName"],
    };
  }
}
