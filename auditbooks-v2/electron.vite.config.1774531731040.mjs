// electron.vite.config.ts
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "electron-vite";
import vue from "@vitejs/plugin-vue";
var __electron_vite_injected_import_meta_url =
	"file:///E:/Repository/auditbooks-v1/auditbooks-v2/electron.vite.config.ts";
var __dirname = dirname(
	fileURLToPath(__electron_vite_injected_import_meta_url),
);
var commonAlias = {
	fyo: resolve(__dirname, "fyo"),
	models: resolve(__dirname, "models"),
	schemas: resolve(__dirname, "schemas"),
	backend: resolve(__dirname, "backend"),
	utils: resolve(__dirname, "utils"),
	regional: resolve(__dirname, "regional"),
	reports: resolve(__dirname, "reports"),
	dummy: resolve(__dirname, "dummy"),
	fixtures: resolve(__dirname, "fixtures"),
};
var electron_vite_config_default = defineConfig({
	main: {
		plugins: [],
		build: {
			lib: {
				formats: ["cjs"],
			},
			rollupOptions: {
				external: ["electron"],
			},
		},
		resolve: {
			alias: {
				"@main": resolve(__dirname, "src/main"),
				"@shared": resolve(__dirname, "src/shared"),
				...commonAlias,
			},
		},
	},
	preload: {
		plugins: [],
		build: {
			lib: {
				formats: ["cjs"],
			},
			rollupOptions: {
				external: ["electron"],
			},
		},
		resolve: {
			alias: {
				...commonAlias,
			},
		},
	},
	renderer: {
		resolve: {
			alias: {
				"@renderer": resolve(__dirname, "src/renderer/src"),
				src: resolve(__dirname, "src/renderer/src"),
				vue: "vue/dist/vue.esm-bundler.js",
				...commonAlias,
			},
		},
		server: {
			port: 6969,
		},
		plugins: [vue()],
	},
});
export { electron_vite_config_default as default };
