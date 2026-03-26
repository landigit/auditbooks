import type { ModelMap } from "fyo/model/types";
import BatchSeries from "./BatchSeries";
import { CustomField } from "./CustomField";
import { CustomForm } from "./CustomForm";
import NumberSeries from "./NumberSeries";
import SerialNumberSeries from "./SerialNumberSeries";
import SystemSettings from "./SystemSettings";

export const coreModels = {
	BatchSeries,
	NumberSeries,
	SerialNumberSeries,
	SystemSettings,
	CustomForm,
	CustomField,
} as ModelMap;
