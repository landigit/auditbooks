import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";

const __dirname = dirname(fileURLToPath(import.meta.url));

const commonAlias = {
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

export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin()],
		build: {
			lib: {
				entry: resolve(__dirname, "src/main/index.ts"),
				formats: ["cjs"],
			},
			rollupOptions: {
				external: ["better-sqlite3"],
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
		plugins: [externalizeDepsPlugin()],
		build: {
			lib: {
				entry: resolve(__dirname, "src/preload/index.ts"),
				formats: ["es"],
			},
		},
		resolve: {
			alias: {
				...commonAlias,
			},
		},
	},
	renderer: {
		root: resolve(__dirname, "src/renderer"),
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
