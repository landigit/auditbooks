import { type App as VueApp, createApp } from "vue";
import { IonicVue } from "@ionic/vue";
import App from "./App.vue";
import Badge from "./components/Badge.vue";
import FeatherIcon from "./components/FeatherIcon.vue";
import { fyo } from "./initFyo";
import { outsideClickDirective } from "./renderer/helpers";
import registerIpcRendererListeners from "./renderer/registerIpcRendererListeners";
import router from "./router";
import { setLanguageMap } from "./utils/language";

/* Core CSS required for Ionic components to work properly */
import "@ionic/vue/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/vue/css/normalize.css";
import "@ionic/vue/css/structure.css";
import "@ionic/vue/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/vue/css/padding.css";
import "@ionic/vue/css/float-elements.css";
import "@ionic/vue/css/text-alignment.css";
import "@ionic/vue/css/text-transformation.css";
import "@ionic/vue/css/flex-utils.css";
import "@ionic/vue/css/display.css";

// --- Portless Unified Bridge (Vercel Style) ---
const isWeb = typeof (window as any).ipc === "undefined";
// Smart origin detection: if on Vite dev port 6969, point to Deno backend on 8080
const API_URL = isWeb
	? window.location.port === "6969"
		? "http://localhost:8080"
		: window.location.origin
	: "http://localhost:8080";

if (isWeb) {
	console.log(
		"🚀 Auditbooks: Running in Unified Portless Mode... (window.ipc is undefined)",
	);
	(window as any).ipc = {
		getEnv: () =>
			Promise.resolve({
				isDevelopment: false,
				platform: "win32",
				version: "0.36.1",
			}),
		checkForUpdates: () => Promise.resolve(),
		checkDbAccess: () => Promise.resolve(true),
		initScheduler: () => Promise.resolve(),
		getDbList: () => Promise.resolve([]),
		getDbDefaultPath: () => Promise.resolve(":memory:"),
		isMaximized: () => Promise.resolve(false),
		isFullscreen: () => Promise.resolve(false),
		getLanguageMap: () => Promise.resolve({ success: true, languageMap: {} }),
		minimizeWindow: () => Promise.resolve(),
		toggleMaximize: () => Promise.resolve(),
		closeWindow: () => Promise.resolve(),
		getOpenFilePath: () => Promise.resolve({ canceled: true, filePaths: [] }),
		getSaveFilePath: () => Promise.resolve({ canceled: true, filePath: "" }),
		sendAPIRequest: (endpoint: string, options: RequestInit) =>
			fetch(endpoint, options),

		call: async (method: string, ...args: unknown[]) => {
			const [namespace, cmd] = method.split(".");
			if (namespace === "db") {
				const schemaName = args[0] as string;
				const token = localStorage.getItem("token");
				const headers = {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				};

				try {
					if (cmd === "get") {
						const name = args[1] as string;
						const res = await fetch(
							`${API_URL}/data/records/${schemaName}/${name}`,
							{ headers },
						);
						return await res.json();
					}
					if (cmd === "getAll") {
						const res = await fetch(`${API_URL}/data/records/${schemaName}`, {
							headers,
						});
						return await res.json();
					}
					if (cmd === "insert" || cmd === "update") {
						const data = args[1] as Record<string, unknown>;
						const res = await fetch(`${API_URL}/data/records/${schemaName}`, {
							method: "POST",
							headers,
							body: JSON.stringify(data),
						});
						const result = await res.json();
						return result.record || result;
					}
					if (cmd === "delete") {
						const name = args[1] as string;
						await fetch(`${API_URL}/data/records/${schemaName}/${name}`, {
							method: "DELETE",
							headers,
						});
						return true;
					}
				} catch (e) {
					console.error("Unified DB Error:", e);
					return null;
				}
			}
			return null;
		},
	};
}

const ipc = (window as any).ipc;

(async () => {
	try {
		const language = fyo.config.get("language") as string;
		if (language) {
			await setLanguageMap(language);
		}
		fyo.store.language = language || "English";

		if (!isWeb && ipc.registerListener) {
			registerIpcRendererListeners();
		}

		console.log("--- CALLING ipc.getEnv() ---");
		const env = ipc?.getEnv ? await ipc.getEnv() : { isDevelopment: false, platform: "win32", version: "0.36.1" };
		console.log("--- getEnv() RESPONSE:", JSON.stringify(env), "---");
		const { isDevelopment, platform, version } = env;

		fyo.store.isDevelopment = isDevelopment;
		fyo.store.appVersion = version;
		fyo.store.platform = platform;
		const platformName = platform === "win32" ? "Windows" : "Linux";

		const app = createApp({
			template: "<App/>",
		});
		setErrorHandlers(app);

		app.use(IonicVue);
		app.use(router);
		app.component("App", App);
		app.component("FeatherIcon", FeatherIcon);
		app.component("Badge", Badge);
		app.directive("on-outside-click", outsideClickDirective);
		app.mixin({
			computed: {
				fyo() {
					return fyo;
				},
				platform() {
					return platformName;
				},
			},
			methods: {
				t: fyo.t,
				T: fyo.T,
			},
		});
		await fyo.telemetry.logOpened();
		app.mount("body");
	} catch (err: unknown) {
		const errorString =
			err instanceof Error ? err.stack || err.message : String(err);
		console.error("CRITICAL RENDERER ERROR:", errorString);

		// Try to send to main process if possible
		const ipc = (window as any).ipc;
		if (ipc && typeof ipc.sendError === "function") {
			try {
				ipc.sendError(
					JSON.stringify({
						message: err instanceof Error ? err.message : String(err),
						stack: err instanceof Error ? err.stack : undefined,
						url: window.location.href,
						isDevelopment: window.location.hostname === "localhost",
					}),
				);
			} catch (ipcErr) {
				console.error("Failed to send error to IPC:", ipcErr);
			}
		}
	}
})();

function setErrorHandlers(app: VueApp) {
	app.config.errorHandler = (err, _vm, info) => {
		console.error("Unified App Error:", err, info);
	};
}
