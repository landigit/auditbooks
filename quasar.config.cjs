module.exports = (_ctx) => {
	const root = process.cwd();

	return {
		boot: ["error-handler", "fyo", "components", "init"],
		css: ["index.css"], // Now in src/css/index.css
		extras: ["roboto-font", "material-icons"],
		build: {
			target: {
				browser: ["es2019", "edge88", "firefox78", "chrome87", "safari13.1"],
				node: "node14",
			},
			vueRouterMode: "hash",
			alias: {
				src: `${root}/src`,
				models: `${root}/models`,
				backend: `${root}/backend`,
				utils: `${root}/utils`, // Root utils
				schemas: `${root}/schemas`,
				fyo: `${root}/fyo`,
				regional: `${root}/regional`,
				fixtures: `${root}/fixtures`,
				reports: `${root}/reports`,
				accounting: `${root}/accounting`,
				jobs: `${root}/jobs`,
				dummy: `${root}/dummy`,
				main: `${root}/src-electron/main`,
			},
		},
		sourceFiles: {
			electronMain: "src-electron/electron-main.ts",
			electronPreload: "src-electron/electron-preload.ts",
		},
		framework: {
			config: {},
			plugins: ["Notify", "Dialog"],
		},
		electron: {
			inspectPort: 5858,
			bundler: "builder",
			builder: {
				appId: "agency.landigit.auditbooks",
			},
			extendElectronMainConf(esbuildConf) {
				esbuildConf.format = "cjs";
				esbuildConf.platform = "node";
				esbuildConf.target = "node14";
				esbuildConf.bundle = true;
				esbuildConf.external = [
					// Electron & Native
					"electron",
					"electron-updater",
					"electron-store",
					"electron-devtools-installer",
					"better-sqlite3",
					"knex",
					"lodash",
					"luxon",
					"pesa",
					"bree",
					"fs-extra",
					"node-fetch",
					"eval-require",
					// Node built-ins
					"fs",
					"fs/promises",
					"path",
					"os",
					"url",
					"crypto",
					"stream",
					"http",
					"https",
					"util",
					"zlib",
					"module",
					"v8",
					"vm",
					"worker_threads",
					"child_process",
					"net",
					"tls",
					"events",
					"buffer",
					"assert",
					"dns",
					"node:fs",
					"node:fs/promises",
					"node:path",
					"node:os",
					"node:url",
					"node:crypto",
					"node:stream",
					"node:http",
					"node:https",
					"node:util",
					"node:zlib",
					"node:module",
					"node:v8",
					"node:vm",
					"node:worker_threads",
					"node:child_process",
					"node:net",
					"node:tls",
					"node:events",
					"node:buffer",
					"node:assert",
					"node:dns",
				];
				esbuildConf.alias = {
					...esbuildConf.alias,
					backend: `${root}/backend`,
					models: `${root}/models`,
					schemas: `${root}/schemas`,
					utils: `${root}/utils`, // Root utils
					fyo: `${root}/fyo`,
					regional: `${root}/regional`,
					main: `${root}/src-electron/main`,
				};
			},
			extendPreloadConf(esbuildConf) {
				esbuildConf.alias = {
					...esbuildConf.alias,
					utils: `${root}/utils`, // Root utils
					fyo: `${root}/fyo`,
				};
			},
		},
	};
};
