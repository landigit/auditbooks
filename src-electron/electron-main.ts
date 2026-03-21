// eslint-disable-next-line
require("source-map-support").install({
	handleUncaughtException: false,
	environment: "node",
});

import type {
	BrowserWindowConstructorOptions,
	ProtocolRequest,
	ProtocolResponse,
} from "electron";

const fs = require("node:fs") as typeof import("fs");
const path = require("node:path") as typeof import("path");
const { emitMainProcessError } = require("backend/helpers");
const { app, BrowserWindow, protocol, ipcMain } = require("electron");
// Commented out to avoid crash
/*
			const {
				default: installExtension,
				VUEJS3_DEVTOOLS,
			} = require("electron-devtools-installer");
			await installExtension(VUEJS3_DEVTOOLS);
			*/
const { autoUpdater } = require("electron-updater");
const registerAppLifecycleListeners =
	require("./main/registerAppLifecycleListeners.ts").default;
const registerAutoUpdaterListeners =
	require("./main/registerAutoUpdaterListeners.ts").default;
const registerIpcMainActionListeners =
	require("./main/registerIpcMainActionListeners.ts").default;
const registerIpcMainMessageListeners =
	require("./main/registerIpcMainMessageListeners.ts").default;
const registerProcessListeners =
	require("./main/registerProcessListeners.ts").default;

export class Main {
	title = "Auditbooks";
	icon: string;

	winURL = "";
	checkedForUpdate = false;
	// BrowserWindow comes from runtime require — typed as any
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	mainWindow: any = null;

	WIDTH = 1200;
	HEIGHT = process.platform === "win32" ? 826 : 800;

	constructor() {
		this.icon = this.isDevelopment
			? path.resolve("./build/icon.png")
			: path.join(__dirname, "icons", "512x512.png");

		protocol.registerSchemesAsPrivileged([
			{ scheme: "app", privileges: { secure: true, standard: true } },
		]);

		if (this.isDevelopment) {
			autoUpdater.logger = console;
		}

		// https://github.com/electron-userland/electron-builder/issues/4987
		app.commandLine.appendSwitch("disable-http2");
		autoUpdater.requestHeaders = {
			"Cache-Control":
				"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
		};

		this.registerListeners();
		if (this.isMac && this.isDevelopment) {
			app.dock.setIcon(this.icon);
		}
	}

	get isDevelopment() {
		return process.env.NODE_ENV === "development";
	}

	get isTest() {
		return !!process.env.IS_TEST;
	}

	get isMac() {
		return process.platform === "darwin";
	}

	get isLinux() {
		return process.platform === "linux";
	}

	registerListeners() {
		registerIpcMainMessageListeners(this);
		registerIpcMainActionListeners(this);
		registerAutoUpdaterListeners(this);
		registerAppLifecycleListeners(this);
		registerProcessListeners(this);
	}

	getOptions(): BrowserWindowConstructorOptions {
		const preload = path.join(
			process.env.QUASAR_ELECTRON_PRELOAD_FOLDER as string,
			`electron-preload${process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION}`,
		);

		console.log("ELECTRON: Loading preload from:", preload);
		const options: BrowserWindowConstructorOptions = {
			width: this.WIDTH,
			height: this.HEIGHT,
			title: this.title,
			titleBarStyle: "hidden",
			trafficLightPosition: { x: 16, y: 16 },
			webPreferences: {
				contextIsolation: true,
				nodeIntegration: false,
				sandbox: false,
				preload,
			},
			autoHideMenuBar: true,
			frame: !this.isMac,
			resizable: true,
		};

		if (this.isDevelopment || this.isLinux) {
			Object.assign(options, { icon: this.icon });
		}

		if (this.isLinux) {
			Object.assign(options, {
				icon: path.join(__dirname, "/icons/512x512.png"),
			});
		}

		return options;
	}

	async createWindow() {
		const options = this.getOptions();
		this.mainWindow = new BrowserWindow(options);

		if (this.isDevelopment) {
			this.setViteServerURL();
		} else {
			this.registerAppProtocol();
		}

		await this.mainWindow.loadURL(this.winURL);
		if (this.isDevelopment && !this.isTest) {
			(this.mainWindow as any).webContents.openDevTools();
		}

		this.setMainWindowListeners();
	}

	setViteServerURL() {
		// Load the url of the dev server if in development mode
		if (process.env.APP_URL) {
			this.winURL = process.env.APP_URL;
		} else if (process.env.VITE_DEV_SERVER_URL) {
			this.winURL = process.env.VITE_DEV_SERVER_URL;
		} else {
			this.winURL = `file://${path.join(__dirname, "index.html")}`;
		}
	}

	registerAppProtocol() {
		protocol.registerBufferProtocol("app", bufferProtocolCallback);

		// Use the registered protocol url to load the files.
		this.winURL = "app://./index.html";
	}

	setMainWindowListeners() {
		if (this.mainWindow === null) {
			return;
		}

		this.mainWindow.on("closed", () => {
			this.mainWindow = null;
		});

		this.mainWindow.webContents.on("did-fail-load", () => {
			this.mainWindow
				?.loadURL(this.winURL)
				.catch((err: Error) => emitMainProcessError(err));
		});
	}
}

/**
 * Callback used to register the custom app protocol,
 * during prod, files are read and served by using this
 * protocol.
 */
function bufferProtocolCallback(
	request: ProtocolRequest,
	callback: (response: ProtocolResponse) => void,
) {
	const { pathname, host } = new URL(request.url);
	const filePath = path.join(
		__dirname,
		"src",
		decodeURI(host),
		decodeURI(pathname),
	);

	fs.readFile(filePath, (err: NodeJS.ErrnoException | null, data: Buffer) => {
		const extension = path.extname(filePath).toLowerCase();
		const mimeTypes: Record<string, string> = {
			".js": "text/javascript",
			".css": "text/css",
			".html": "text/html",
			".svg": "image/svg+xml",
			".json": "application/json",
		};
		const mimeType = mimeTypes[extension] ?? "";
		callback({ mimeType, data });
	});
}

module.exports = new Main();
