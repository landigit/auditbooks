import { contextBridge, ipcRenderer } from "electron";

/**
 * Hardened Nested IPC Bridge for Auditbooks
 * This version provides the nested structure expected by Fyo while remaining secure.
 */
export const ipcApi = {
	desktop: true,

	// Core Actions
	getEnv: () => ipcRenderer.invoke("get-env"),
	getCreds: () => ipcRenderer.invoke("get-creds"),
	checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
	downloadUpdate: () => ipcRenderer.invoke("download-update"),
	quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),
	checkDbAccess: (dbPath: string) =>
		ipcRenderer.invoke("check-db-access", dbPath),
	getTemplates: (root: string) => ipcRenderer.invoke("get-templates", root),
	getLanguageMap: (code: string) =>
		ipcRenderer.invoke("get-language-map", code),
	selectFile: (options: any) => ipcRenderer.invoke("select-file", options),
	getOpenFilePath: (options: any) => ipcRenderer.invoke("open-dialog", options),
	getSaveFilePath: (options: any) => ipcRenderer.invoke("save-dialog", options),
	getDbList: () => ipcRenderer.invoke("get-db-list"),
	getDbDefaultPath: (company: string) =>
		ipcRenderer.invoke("get-db-default-path", company),
	deleteFile: (filePath: string) => ipcRenderer.invoke("delete-file", filePath),
	initScheduler: (interval: string) =>
		ipcRenderer.invoke("init-scheduler", interval),
	saveData: (data: string, savePath: string) =>
		ipcRenderer.invoke("save-data", data, savePath),
	showError: (title: string, content: string) =>
		ipcRenderer.invoke("show-error", { title, content }),
	sendError: (body: string) => ipcRenderer.invoke("send-error", body),
	sendAPIRequest: (endpoint: string, options: any) =>
		ipcRenderer.invoke("send-api-request", endpoint, options),

	// Legacy Support Wrappers
	printHtml: (html: string, width: number, height: number) =>
		ipcRenderer.invoke("print-html-document", html, width, height),
	printDocument: (html: string, width: number, height: number) =>
		ipcRenderer.invoke("print-html-document", html, width, height),
	saveHtmlAsPdf: (
		html: string,
		savePath: string,
		width: number,
		height: number,
	) => ipcRenderer.invoke("save-html-as-pdf", html, savePath, width, height),
	makePDF: (html: string, savePath: string, width: number, height: number) =>
		ipcRenderer.invoke("save-html-as-pdf", html, savePath, width, height),

	// Window Management
	isMaximized: () => ipcRenderer.invoke("is-maximized"),
	isFullscreen: () => ipcRenderer.invoke("is-fullscreen"),
	reloadWindow: () => {
		ipcRenderer.send("reload-main-window");
	},
	minimizeWindow: () => {
		ipcRenderer.send("minimize-main-window");
	},
	toggleMaximize: () => {
		ipcRenderer.send("maximize-main-window");
	},
	closeWindow: () => {
		ipcRenderer.send("close-main-window");
	},
	openLink: (url: string) => {
		ipcRenderer.send("open-external", url);
	},
	openExternalUrl: (url: string) => {
		ipcRenderer.send("open-external", url);
	},
	showItemInFolder: (filePath: string) => {
		ipcRenderer.send("show-item-in-folder", filePath);
	},

	// NESTED store object (Required by Fyo)
	store: {
		get: (key: string) => ipcRenderer.sendSync("get-store", key),
		set: (key: string, val: any) => ipcRenderer.sendSync("set-store", key, val),
		delete: (key: string) => ipcRenderer.sendSync("delete-store", key),
	},

	// NESTED db object (Required by Fyo)
	db: {
		getSchema: () => ipcRenderer.invoke("db-schema"),
		connect: (dbPath: string, countryCode?: string) =>
			ipcRenderer.invoke("db-connect", dbPath, countryCode),
		create: (dbPath: string, countryCode?: string) =>
			ipcRenderer.invoke("db-create", dbPath, countryCode),
		call: (method: string, ...args: any[]) =>
			ipcRenderer.invoke("db-call", method, ...args),
		bespoke: (method: string, ...args: any[]) =>
			ipcRenderer.invoke("db-bespoke", method, ...args),
	},

	// Event Listeners (Aligned with registerIpcRendererListeners.ts)
	registerMainProcessErrorListener: (callback: any) => {
		ipcRenderer.on("main-process-error", (_event, ...args) =>
			callback(...args),
		);
	},
	registerTriggerFrontendActionListener: (callback: any) => {
		ipcRenderer.on("trigger-erpnext-sync", (_event, ...args) =>
			callback(...args),
		);
	},
	registerConsoleLogListener: (callback: any) => {
		ipcRenderer.on("console-log", (_event, ...args) => callback(...args));
	},
	on: (channel: string, callback: any) => {
		const subscription = (_event: any, ...args: any[]) => callback(...args);
		ipcRenderer.on(channel, subscription);
		return () => {
			ipcRenderer.removeListener(channel, subscription);
		};
	},
};

export type IPC = typeof ipcApi;

// Final Exposure
contextBridge.exposeInMainWorld("auditbooksIpc", ipcApi);
