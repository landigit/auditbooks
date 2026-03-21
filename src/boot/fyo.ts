import { boot } from "quasar/wrappers";
import { fyo } from "src/initFyo";
import { setLanguageMap } from "src/utils/language";

// @ts-expect-error type inference failure
export default boot(async ({ app }) => {
	// 1. Language Setup
	const language = fyo.config.get("language") as string;
	if (language) {
		await setLanguageMap(language);
	}
	fyo.store.language = language || "English";

	// 2. Fetch Environment from Main Process
	const { isDevelopment, platform, version } =
		await window.auditbooksIpc.getEnv();

	// 3. Populate Legacy Global fyo.store
	fyo.store.isDevelopment = isDevelopment;
	fyo.store.appVersion = version;
	fyo.store.platform = platform;

	// 4. Inject into Vue 3 Global Properties
	app.config.globalProperties.fyo = fyo;
	app.config.globalProperties.platform = platform;
	app.config.globalProperties.t = fyo.t;
});
