import { Doc } from "fyo/model/doc";
import type { HiddenMap } from "fyo/model/types";

export class Misc extends Doc {
	openCount?: number;
	useFullWidth?: boolean;
	override hidden: HiddenMap = {};
}
