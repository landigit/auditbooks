const fs = require("fs-extra");
const { constants } = require("node:fs");

import type { ConfigFile } from "fyo/core/types";
import type { Main } from "main";

const config = require("utils/config").default || require("utils/config");
const { IPC_CHANNELS } = require("utils/messages");

import type { ConfigFilesWithModified } from "utils/types";

async function setAndGetCleanedConfigFiles() {
	const files = config.get("files", []);

	const cleanedFileMap: Map<string, ConfigFile> = new Map();
	for (const file of files) {
		const exists = await fs
			.access(file.dbPath, constants.W_OK)
			.then(() => true)
			.catch(() => false);

		if (!file.companyName) {
			continue;
		}

		const key = `${file.companyName}-${file.dbPath}`;
		if (!exists || cleanedFileMap.has(key)) {
			continue;
		}

		cleanedFileMap.set(key, file);
	}

	const cleanedFiles = Array.from(cleanedFileMap.values());
	config.set("files", cleanedFiles);
	return cleanedFiles;
}

async function getConfigFilesWithModified(files: ConfigFile[]) {
	const filesWithModified: ConfigFilesWithModified[] = [];
	for (const { dbPath, id, companyName, openCount } of files) {
		const { mtime } = await fs.stat(dbPath);
		filesWithModified.push({
			id,
			dbPath,
			companyName,
			modified: mtime.toISOString(),
			openCount,
		});
	}

	return filesWithModified;
}

async function getErrorHandledReponse(func: () => Promise<unknown> | unknown) {
	const response: BackendResponse = {};

	try {
		response.data = await func();
	} catch (err) {
		response.error = {
			name: (err as NodeJS.ErrnoException).name,
			message: (err as NodeJS.ErrnoException).message,
			stack: (err as NodeJS.ErrnoException).stack,
			code: (err as NodeJS.ErrnoException).code,
		};
	}

	return response;
}

function rendererLog(main: Main, ...args: unknown[]) {
	main.mainWindow?.webContents.send(IPC_CHANNELS.CONSOLE_LOG, ...args);
}

function isNetworkError(error: Error) {
	switch (error?.message) {
		case "net::ERR_INTERNET_DISCONNECTED":
		case "net::ERR_NETWORK_CHANGED":
		case "net::ERR_PROXY_CONNECTION_FAILED":
		case "net::ERR_CONNECTION_RESET":
		case "net::ERR_CONNECTION_CLOSE":
		case "net::ERR_NAME_NOT_RESOLVED":
		case "net::ERR_TIMED_OUT":
		case "net::ERR_CONNECTION_TIMED_OUT":
			return true;
		default:
			return false;
	}
}

module.exports = {
	setAndGetCleanedConfigFiles,
	getConfigFilesWithModified,
	getErrorHandledReponse,
	rendererLog,
	isNetworkError,
};
