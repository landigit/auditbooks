import { boot } from "quasar/wrappers";
import { fyo } from "src/initFyo";
import registerIpcRendererListeners from "src/renderer/registerIpcRendererListeners";
import { useFyoStore } from "src/stores/useFyoStore";
import type { App } from "vue"; // Import App type from Vue

/**
 * Modular Init Boot File
 * Coordinating all subsystems
 */
export default boot(async ({ app, store }: { app: App; store: any }) => {
	// 1. Core Logic Listeners
	registerIpcRendererListeners();

	// 2. State Management Initialization
	const fyoStore = useFyoStore(store);
	await fyoStore.initialize();

	// 3. Global Telemetry
	await fyo.telemetry.logOpened();

	// 4. Global Injection (Legacy Support)
	// @ts-expect-error
	window.ipc = window.auditbooksIpc;
	app.config.globalProperties.$fyo = fyo;
	app.config.globalProperties.$platform = fyoStore.platformName;
	app.config.globalProperties.t = fyo.t;
	app.config.globalProperties.T = fyo.T;
});
