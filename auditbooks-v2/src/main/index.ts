import { app, BrowserWindow, protocol } from "electron";
import { join } from "node:path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";

// @ts-ignore (local main files)
import registerAppLifecycleListeners from "./registerAppLifecycleListeners";
import registerAutoUpdaterListeners from "./registerAutoUpdaterListeners";
import registerIpcMainActionListeners from "./registerIpcMainActionListeners";
import registerIpcMainMessageListeners from "./registerIpcMainMessageListeners";
import registerProcessListeners from "./registerProcessListeners";

// Early protocol registration
protocol.registerSchemesAsPrivileged([
	{ scheme: "app", privileges: { secure: true, standard: true } },
]);

app.disableHardwareAcceleration();

export class Main {
	title = "Auditbooks";
	mainWindow: BrowserWindow | null = null;
	checkedForUpdate = false;

	WIDTH = 1200;
	HEIGHT = process.platform === "win32" ? 826 : 800;

	get isDevelopment() {
		return is.dev;
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

	get icon() {
		return join(__dirname, "../../resources/icon.png");
	}

	constructor() {
		this.registerListeners();
	}

	registerListeners() {
		registerIpcMainMessageListeners(this);
		registerIpcMainActionListeners(this);
		registerAutoUpdaterListeners(this);
		registerAppLifecycleListeners(this);
		registerProcessListeners(this);
	}

	async createWindow(): Promise<void> {
		this.mainWindow = new BrowserWindow({
			width: this.WIDTH,
			height: this.HEIGHT,
			title: this.title,
			show: false,
			autoHideMenuBar: true,
			titleBarStyle: "hidden",
			trafficLightPosition: { x: 16, y: 16 },
			webPreferences: {
				preload: join(__dirname, "../preload/index.mjs"),
				sandbox: false,
				contextIsolation: true,
				nodeIntegration: false,
			},
			frame: process.platform !== "darwin",
			resizable: true,
		});

		this.mainWindow.on("ready-to-show", () => {
			this.mainWindow?.show();
		});

		if (is.dev && process.env.ELECTRON_RENDERER_URL) {
			this.mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
		} else {
			this.mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
		}

		if (is.dev) {
			this.mainWindow.webContents.openDevTools();
		}
	}
}

export const mainApp = new Main();

app.whenReady().then(() => {
	electronApp.setAppUserModelId("com.auditbooks");

	app.on("browser-window-created", (_, window) => {
		optimizer.watchWindowShortcuts(window);
	});

	mainApp.createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) mainApp.createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
