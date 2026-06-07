import { ConfigMap } from "fyo/core/types";
import type { IPC } from "utils/ipc/types";

export class Config {
  config: Map<string, unknown> | IPC["store"];
  constructor(isElectron: boolean) {
    this.config = new Map();
    if (isElectron) {
      const globalIpc = typeof window !== "undefined" ? ((window as any).fyoIpc || (window as any).ipc) : undefined;
      this.config = globalIpc ? globalIpc.store : new Map();
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
