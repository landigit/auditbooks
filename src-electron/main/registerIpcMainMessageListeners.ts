const { emitMainProcessError } = require("backend/helpers");
const { ipcMain, Menu, shell } = require("electron");

import type { Main } from "../main";

const { IPC_MESSAGES } = require("utils/messages");
const Store = require("electron-store");
const config = new Store();

function registerIpcMainMessageListeners(main: Main) {
	ipcMain.on(IPC_MESSAGES.OPEN_MENU, (event) => {
		if (event.sender === null) {
			return;
		}

		const menu = Menu.getApplicationMenu();
		if (menu === null) {
			return;
		}

		if (main.mainWindow) {
			menu.popup({ window: main.mainWindow });
		}
	});

	ipcMain.on(IPC_MESSAGES.RELOAD_MAIN_WINDOW, () => {
		main.mainWindow?.reload();
	});

	ipcMain.on(IPC_MESSAGES.MINIMIZE_MAIN_WINDOW, () => {
		main.mainWindow?.minimize();
	});

	ipcMain.on(IPC_MESSAGES.MAXIMIZE_MAIN_WINDOW, () => {
		main.mainWindow?.isMaximized()
			? main.mainWindow?.unmaximize()
			: main.mainWindow?.maximize();
	});

	ipcMain.on(IPC_MESSAGES.ISMAXIMIZED_MAIN_WINDOW, (event) => {
		const isMaximized = main.mainWindow?.isMaximized() ?? false;
		event.sender.send(IPC_MESSAGES.ISMAXIMIZED_RESULT, isMaximized);
	});

	ipcMain.on(IPC_MESSAGES.ISFULLSCREEN_MAIN_WINDOW, (event) => {
		const isFullscreen = main.mainWindow?.isFullScreen() ?? false;
		event.sender.send(IPC_MESSAGES.ISFULLSCREEN_RESULT, isFullscreen);
	});

	ipcMain.on(IPC_MESSAGES.CLOSE_MAIN_WINDOW, () => {
		main.mainWindow?.close();
	});

	ipcMain.on(IPC_MESSAGES.OPEN_EXTERNAL, (_, link: string) => {
		shell.openExternal(link).catch((err) => emitMainProcessError(err));
	});

	ipcMain.on(IPC_MESSAGES.SHOW_ITEM_IN_FOLDER, (_, filePath: string) => {
		return shell.showItemInFolder(filePath);
	});
	ipcMain.on(IPC_MESSAGES.GET_STORE, (event, key: string) => {
		event.returnValue = config.get(key);
	});
	ipcMain.on(IPC_MESSAGES.SET_STORE, (event, key: string, value: unknown) => {
		config.set(key, value);
		event.returnValue = true;
	});
	ipcMain.on(IPC_MESSAGES.DELETE_STORE, (event, key: string) => {
		config.delete(key);
		event.returnValue = true;
	});
}
module.exports = {
	registerIpcMainMessageListeners,
	default: registerIpcMainMessageListeners,
};
