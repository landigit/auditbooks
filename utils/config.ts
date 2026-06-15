import { load } from '@tauri-apps/plugin-store';
import type { ConfigMap } from 'fyo/core/types';

type ConfigKey = keyof ConfigMap;

/**
 * TauriConfigStore: a thin synchronous-looking wrapper around
 * @tauri-apps/plugin-store. Values are cached in-memory after
 * the store is loaded so `get` is always synchronous.
 *
 * Call `TauriConfigStore.init()` once at app startup before use.
 */
class TauriConfigStore {
  private _cache: Map<string, unknown> = new Map();
  private _store: Awaited<ReturnType<typeof load>> | null = null;
  private _initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      this._store = await load('config.json', { autoSave: true, defaults: {} });
      // Populate the cache from persisted store
      const entries = await this._store.entries<unknown>();
      for (const [key, value] of entries) {
        this._cache.set(key, value);
      }
    })();
    return this._initPromise;
  }

  get<K extends ConfigKey>(
    key: K,
    defaultValue?: ConfigMap[K]
  ): ConfigMap[K] | undefined {
    const value = this._cache.get(key) as ConfigMap[K] | undefined;
    return value ?? defaultValue;
  }

  set<K extends ConfigKey>(key: K, value: ConfigMap[K]) {
    this._cache.set(key, value);
    // Fire-and-forget persist
    if (this._store) {
      void this._store.set(key, value);
    }
  }

  delete(key: ConfigKey) {
    this._cache.delete(key);
    if (this._store) {
      void this._store.delete(key);
    }
  }
}

const config = new TauriConfigStore();
export default config;
