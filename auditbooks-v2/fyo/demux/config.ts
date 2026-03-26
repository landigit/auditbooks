import type { ConfigMap } from "fyo/core/types";
// import type { IPC } from "../../src/preload/index"; // Circular dependency risk

export class Config {
	config: Map<string, any> | any;
	constructor(isElectron: boolean) {
		this.config = new Map();
		if (isElectron && (window as any).ipc) {
			this.config = (window as any).ipc.store;
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
