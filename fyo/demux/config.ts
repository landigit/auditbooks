import { ConfigMap } from 'fyo/core/types';
import type { IPC } from 'utils/ipc/types';

declare const ipc: any;

export class Config {
  config: Map<string, unknown> | IPC['store'];
  constructor(isElectron: boolean) {
    this.config = new Map();
    if (isElectron) {
      let globalIpc =
        typeof window !== 'undefined'
          ? (window as any).fyoIpc || (window as any).ipc
          : undefined;
      if (!globalIpc || !globalIpc.store) {
        globalIpc = typeof ipc !== 'undefined' ? ipc : undefined;
      }
      this.config = globalIpc && globalIpc.store ? globalIpc.store : new Map();
    }
  }

  get<K extends keyof ConfigMap>(
    key: K,
    defaultValue?: ConfigMap[K]
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
