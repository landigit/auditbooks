const { app } = require("electron");
const { CUSTOM_EVENTS, IPC_CHANNELS } = require("utils/messages");

import type { Main } from "../main";

function registerProcessListeners(main: Main) {
	if (main.isDevelopment) {
		if (process.platform === "win32") {
			process.on("message", (data) => {
				if (data === "graceful-exit") {
					app.quit();
				}
			});
		} else {
			process.on("SIGTERM", () => {
				app.quit();
			});
		}
	}

	process.on(CUSTOM_EVENTS.MAIN_PROCESS_ERROR, (error, more) => {
		main.mainWindow?.webContents.send(
			IPC_CHANNELS.LOG_MAIN_PROCESS_ERROR,
			error,
			more,
		);
	});

	process.on("unhandledRejection", (error) => {
		main.mainWindow?.webContents.send(
			IPC_CHANNELS.LOG_MAIN_PROCESS_ERROR,
			error,
		);
	});

	process.on("uncaughtException", (error) => {
		main.mainWindow?.webContents.send(
			IPC_CHANNELS.LOG_MAIN_PROCESS_ERROR,
			error,
		);
		setTimeout(() => process.exit(1), 10000);
	});
}
module.exports = {
	registerProcessListeners,
	default: registerProcessListeners,
};
