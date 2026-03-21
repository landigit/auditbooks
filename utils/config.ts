// @ts-expect-error
const Store =
	typeof require !== "undefined" ? require("electron-store") : class {};

import type { ConfigMap } from "fyo/core/types";

const config = new Store<ConfigMap>();
export default config;
