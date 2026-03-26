import { app } from "electron";
import { CUSTOM_EVENTS, IPC_CHANNELS } from "utils/messages";
import type { Main } from "./index";

export default function registerProcessListeners(main: Main) {
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
		console.error("Main Process Error:", error, more);
		main.mainWindow?.webContents.send(
			IPC_CHANNELS.LOG_MAIN_PROCESS_ERROR,
			error,
			more,
		);
	});

	process.on("unhandledRejection", (error) => {
		console.error("Unhandled Rejection:", error);
		main.mainWindow?.webContents.send(
			IPC_CHANNELS.LOG_MAIN_PROCESS_ERROR,
			error,
		);
	});

	process.on("uncaughtException", (error) => {
		console.error("Uncaught Exception:", error);
		main.mainWindow?.webContents.send(
			IPC_CHANNELS.LOG_MAIN_PROCESS_ERROR,
			error,
		);
		setTimeout(() => process.exit(1), 10000);
	});
}
