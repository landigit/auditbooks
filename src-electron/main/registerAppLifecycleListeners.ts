const { emitMainProcessError } = require("backend/helpers");
const { app } = require("electron");

const _installExtension = require("electron-devtools-installer").default;

import type { Main } from "../electron-main";

function registerAppLifecycleListeners(main: Main) {
	app.on("window-all-closed", () => {
		if (process.platform !== "darwin") {
			app.quit();
		}
	});

	app.on("activate", () => {
		if (main.mainWindow === null) {
			main.createWindow().catch((err: Error) => emitMainProcessError(err));
		}
	});

	app.on("ready", () => {
		main.createWindow().catch((err: Error) => emitMainProcessError(err));
	});
}

module.exports = {
	registerAppLifecycleListeners,
	default: registerAppLifecycleListeners,
};
