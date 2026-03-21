import { ipcApi } from "../../src-electron/electron-preload";

declare global {
	interface Window {
		auditbooksIpc: typeof ipcApi;
	}
}
