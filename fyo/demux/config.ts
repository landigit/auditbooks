import type { ConfigMap } from "fyo/core/types";
import type { IPC } from "main/electron-preload";

export class Config {
	config: Map<string, unknown> | IPC["store"];
	constructor(isElectron: boolean) {
		this.config = new Map();
		if (isElectron) {
			this.config =
				typeof window !== "undefined" && window.auditbooksIpc
					? window.auditbooksIpc.store
					: new Map();
		}
	}

	get<K extends keyof ConfigMap>(
		key: K,
		defaultValue?: ConfigMap[K],
	): ConfigMap[K] | undefined {
		const value = this.config.get(key) as ConfigMap[K] | undefined;
		return value ?? defaultValue;
	}

	set<K extends keyof ConfigMap>(key: K, value: ConfigMap[K]) {
		this.config.set(key, value);
	}

	delete(key: keyof ConfigMap) {
		this.config.delete(key);
	}
}
