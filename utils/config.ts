import type { ConfigMap } from 'fyo/core/types';

const config = {
  get<K extends keyof ConfigMap>(key: K): ConfigMap[K] | undefined {
    const val = localStorage.getItem(`config:${String(key)}`);
    if (val === null) return undefined;
    try {
      return JSON.parse(val) as ConfigMap[K];
    } catch {
      return val as unknown as ConfigMap[K];
    }
  },
  set<K extends keyof ConfigMap>(key: K, value: ConfigMap[K]) {
    localStorage.setItem(`config:${String(key)}`, JSON.stringify(value));
  },
  delete(key: keyof ConfigMap) {
    localStorage.removeItem(`config:${String(key)}`);
  },
};

export default config;
