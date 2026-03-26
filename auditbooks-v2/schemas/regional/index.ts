import type { SchemaStub } from "schemas/types";
import SwissSchemas from "./ch";
import IndianSchemas from "./in";

/**
 * Regional Schemas are exported by country code.
 */
export default { in: IndianSchemas, ch: SwissSchemas } as Record<
	string,
	SchemaStub[]
>;
