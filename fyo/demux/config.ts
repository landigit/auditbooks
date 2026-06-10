import type { ConfigMap } from 'fyo/core/types';
import tauriConfig from 'utils/config';

/**
 * Config class — in Tauri mode this wraps the persistent TauriConfigStore
 * (backed by @tauri-apps/plugin-store). In test/non-Tauri environments
 * it falls back to a plain in-memory Map.
 *
 * Call `Config.initAsync()` once at boot (before any get/set) so the
 * store is hydrated from disk.
 */
export class Config {
  constructor() {}

  /** Must be awaited once at app startup (in renderer.ts) before any config access. */
  async initAsync(): Promise<void> {
    await tauriConfig.init();
  }

  get<K extends keyof ConfigMap>(
    key: K,
    defaultValue?: ConfigMap[K]
  ): ConfigMap[K] | undefined {
    return tauriConfig.get(key, defaultValue);
  }

  set<K extends keyof ConfigMap>(key: K, value: ConfigMap[K]) {
    tauriConfig.set(key, value);
  }

  delete(key: keyof ConfigMap) {
    tauriConfig.delete(key);
  }
}
