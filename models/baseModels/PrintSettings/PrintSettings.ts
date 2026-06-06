import { Attachment } from "fyo/core/types";
import { Doc } from "fyo/model/doc";
import { HiddenMap } from "fyo/model/types";

export class PrintSettings extends Doc {
  declare logo?: Attachment;
  declare email?: string;
  declare phone?: string;
  declare address?: string;
  declare companyName?: string;
  declare color?: string;
  declare font?: string;
  declare displayLogo?: boolean;
  declare displayTime?: boolean;
  declare displayDescription?: boolean;
  declare displaytermsandconditions?: boolean;
  declare termsAndConditions?: string;
  declare posPrintWidth?: number;
  declare amountInWords?: boolean;
  override hidden: HiddenMap = {
    termsAndConditions: () => !this.displaytermsandconditions,
  };
}
