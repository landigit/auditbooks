import { Doc } from 'fyo/model/doc';
import { HiddenMap } from 'fyo/model/types';

export class Misc extends Doc {
  declare openCount?: number;
  declare useFullWidth?: boolean;
  override hidden: HiddenMap = {};
}
