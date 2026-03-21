import { Doc } from "fyo/model/doc";
import type { ListViewSettings } from "fyo/model/types";

export class Batch extends Doc {
	static getListViewSettings(): ListViewSettings {
		return {
			columns: ["name", "expiryDate", "manufactureDate"],
		};
	}
}
