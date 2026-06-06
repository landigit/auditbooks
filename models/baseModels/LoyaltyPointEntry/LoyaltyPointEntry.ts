import { Doc } from "fyo/model/doc";
import { ListViewSettings } from "fyo/model/types";

export class LoyaltyPointEntry extends Doc {
  declare loyaltyProgram?: string;
  declare loyaltyProgramTier?: string;
  declare customer?: string;
  declare invoice?: string;
  declare purchaseAmount?: number;
  declare postingDate?: Date;
  declare expiryDate?: Date;

  static override getListViewSettings(): ListViewSettings {
    return {
      columns: [
        "loyaltyProgram",
        "customer",
        "purchaseAmount",
        "loyaltyPoints",
      ],
    };
  }
}
