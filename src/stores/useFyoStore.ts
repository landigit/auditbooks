import { defineStore } from "pinia";
import { fyo } from "src/initFyo";

export const useFyoStore = defineStore("fyo", {
	state: () => ({
		isDevelopment: false,
		platform: "",
		platformName: "",
		version: "",
		language: "English",
	}),

	actions: {
		async initialize() {
			const { isDevelopment, platform, version } =
				await window.auditbooksIpc.getEnv();

			this.isDevelopment = isDevelopment;
			this.platform = platform;
			this.version = version;

			const language = fyo.config.get("language") as string;
			this.language = language || "English";

			// Legacy cross-population
			fyo.store.isDevelopment = isDevelopment;
			fyo.store.appVersion = version;
			fyo.store.platform = platform;
			fyo.store.language = this.language;

			this.platformName = this.getPlatformName(platform);
		},

		getPlatformName(platform: string) {
			switch (platform) {
				case "win32":
					return "Windows";
				case "darwin":
					return "Mac";
				case "linux":
					return "Linux";
				default:
					return "Linux";
			}
		},
	},
});
