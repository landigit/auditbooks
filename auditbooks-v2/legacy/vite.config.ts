import path from "node:path";
import { builtinModules } from "node:module";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron";
import renderer from "vite-plugin-electron-renderer";

const external = [
	"electron",
	"better-sqlite3",
	"electron-store",
	"bree",
	...builtinModules,
	...builtinModules.map((m) => `node:${m}`),
];

const alias = {
	// ... existing aliases
	vue: "vue/dist/vue.esm-bundler.js",
	fyo: path.resolve(__dirname, "./fyo"),
	src: path.resolve(__dirname, "./src"),
	main: path.resolve(__dirname, "./main"),
	schemas: path.resolve(__dirname, "./schemas"),
	backend: path.resolve(__dirname, "./backend"),
	models: path.resolve(__dirname, "./models"),
	utils: path.resolve(__dirname, "./utils"),
	regional: path.resolve(__dirname, "./regional"),
	reports: path.resolve(__dirname, "./reports"),
	dummy: path.resolve(__dirname, "./dummy"),
	fixtures: path.resolve(__dirname, "./fixtures"),
};

export default defineConfig(({ mode }) => ({
	root: path.resolve(__dirname, "./src"),
	plugins: [
		vue(),
		mode !== "test" &&
			electron([
				{
					// Main-process entry file of the Electron App.
					entry: path.resolve(__dirname, "main.ts"),
					vite: {
						resolve: { alias },
						build: {
							outDir: path.resolve(__dirname, "dist-electron"),
							sourcemap: true,
							minify: false,
							rollupOptions: {
								external,
							},
						},
					},
				},
				{
					entry: path.resolve(__dirname, "main/preload.ts"),
					vite: {
						resolve: { alias },
						build: {
							ssr: true,
							lib: {
								entry: path.resolve(__dirname, "main/preload.ts"),
								formats: ["cjs"],
								fileName: "preload",
							},
							outDir: path.resolve(__dirname, "dist-electron/main"),
							sourcemap: true,
							minify: false,
							rollupOptions: {
								output: {
									format: "cjs",
									exports: "none",
									inlineDynamicImports: true,
								},
								external,
							},
						},
					},
				},
			]),
		mode !== "test" && renderer(),
	].filter(Boolean) as unknown[],
	server: {
		host: process.env.VITE_HOST || "127.0.0.1",
		port: Number(process.env.VITE_PORT) || 6969,
		strictPort: true,
	},
	resolve: {
		alias,
	},
	build: {
		outDir: path.resolve(__dirname, "./dist"),
		emptyOutDir: true,
	},
	// @ts-ignore
	test: {
		globals: true,
		environment: "jsdom",
		alias,
		include: ["../tests/**/*.{test,spec}.ts", "../backend/**/*.spec.ts"],
		testTimeout: 60000,
		hookTimeout: 60000,
		pool: "threads",
		poolOptions: {
			threads: {
				singleThread: true,
			},
		},
	},
}));
