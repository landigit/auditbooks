import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { emitMainProcessError } from "./backend/helpers";

import {
	BrowserWindow,
	type BrowserWindowConstructorOptions,
	type ProtocolRequest,
	type ProtocolResponse,
	app,
	protocol,
} from "electron";

// Early protocol registration
protocol.registerSchemesAsPrivileged([
	{ scheme: "app", privileges: { secure: true, standard: true } },
]);

app.disableHardwareAcceleration();

// Absolute path logging for debugging built app
const DEBUG_LOG_PATH = path.join(app.getPath("home"), "Auditbooks_debug.log");
function logDebug(message: string) {
	const timestamp = new Date().toISOString();
	fs.appendFileSync(DEBUG_LOG_PATH, `${timestamp} - ${message}\n`);
}

logDebug("--- MAIN PROCESS STARTED ---");

import { autoUpdater } from "electron-updater";
import registerAppLifecycleListeners from "./main/registerAppLifecycleListeners";
import registerAutoUpdaterListeners from "./main/registerAutoUpdaterListeners";
import registerIpcMainActionListeners from "./main/registerIpcMainActionListeners";
import registerIpcMainMessageListeners from "./main/registerIpcMainMessageListeners";
import registerProcessListeners from "./main/registerProcessListeners";

export class Main {
	title = "Auditbooks";
	icon: string;

	winURL = "";
	checkedForUpdate = false;
	mainWindow: BrowserWindow | null = null;

	WIDTH = 1200;
	HEIGHT = process.platform === "win32" ? 826 : 800;

	constructor() {
		logDebug("Main class constructor started");
		this.icon = this.isDevelopment
			? path.resolve("./build/icon.png")
			: path.join(__dirname, "icons", "512x512.png");

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
		let preload = path.resolve(__dirname, "main", "preload.cjs");
		if (!fs.existsSync(preload)) {
			preload = path.resolve(__dirname, "main", "preload.js");
		}
		console.log("--- ATTEMPTING TO LOAD PRELOAD FROM:", preload, "---");
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
		logDebug("createWindow() called");
		const options = this.getOptions();
		logDebug(`Opening window with URL: ${this.winURL}`);
		this.mainWindow = new BrowserWindow(options);

		if (this.isDevelopment) {
			this.setViteServerURL();
		} else {
			this.registerAppProtocol();
		}

		await this.mainWindow.loadURL(this.winURL);
		logDebug("Window URL loaded");
		if (this.isDevelopment && !this.isTest) {
			this.mainWindow.webContents.openDevTools();
		}

		this.setMainWindowListeners();

		this.mainWindow.webContents.on(
			"console-message",
			(_, level, message, line, sourceId) => {
				logDebug(`[RENDERER][LEVEL:${level}] ${message} (${sourceId}:${line})`);
			},
		);

		this.mainWindow.webContents.session.webRequest.onHeadersReceived(
			(details, callback) => {
				const csp = this.isDevelopment
					? "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://localhost:* ws://localhost:*"
					: "default-src 'self' 'unsafe-inline' data: app:; script-src 'self' 'unsafe-inline' app:; style-src 'self' 'unsafe-inline' app:; img-src 'self' data: app:; connect-src 'self' app:;";

				callback({
					responseHeaders: {
						...details.responseHeaders,
						"Content-Security-Policy": [csp],
					},
				});
			},
		);
	}

	setViteServerURL() {
		let port = 6969;
		let host = "localhost";

		if (process.env.VITE_PORT && process.env.VITE_HOST) {
			port = Number(process.env.VITE_PORT);
			host = process.env.VITE_HOST;
		}

		// Load the url of the dev server if in development mode
		this.winURL = `http://${host}:${port}/`;
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
				.catch((err) => emitMainProcessError(err));
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

	logDebug(`--- APP PROTOCOL REQUEST: ${request.url} -> ${filePath} ---`);

	fs.readFile(filePath, (err, data) => {
		if (err) {
			logDebug(`!!! FAILED TO READ FILE: ${filePath} - Error: ${err.message}`);
		}
		const extension = path.extname(filePath).toLowerCase();
		const mimeType =
			{
				".js": "text/javascript",
				".css": "text/css",
				".html": "text/html",
				".svg": "image/svg+xml",
				".json": "application/json",
			}[extension] ?? "";

		callback({ mimeType, data });
	});
}

export default new Main();
