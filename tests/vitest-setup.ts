/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
/**
 * tests/vitest-setup.ts
 * Global setup for all vitest suites — replaces tests/rstest-setup.ts
 */
import { vi } from 'vite-plus/test';
// @ts-expect-error
import { JSDOM } from 'jsdom';
import pkg from '../package.json';

// ---------------------------------------------------------------------------
// JSDOM browser environment (needed for Vue store / component tests)
// ---------------------------------------------------------------------------
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});
Object.defineProperty(global, 'window', {
  value: dom.window,
  configurable: true,
  writable: true,
});
Object.defineProperty(global, 'document', {
  value: dom.window.document,
  configurable: true,
  writable: true,
});
Object.defineProperty(global, 'history', {
  value: dom.window.history,
  configurable: true,
  writable: true,
});
Object.defineProperty(global, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true,
});

// ---------------------------------------------------------------------------
// Mock 'electron' module
// ---------------------------------------------------------------------------
vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp',
    getVersion: () => pkg.version,
  },
  ipcRenderer: {
    on: () => {},
    send: () => {},
    invoke: async () => {},
  },
}));

// ---------------------------------------------------------------------------
// Mock global ipc object
// ---------------------------------------------------------------------------
(global as any).ipc = {
  getEnv: async () => ({
    isDevelopment: true,
    platform: 'linux',
    version: pkg.version,
  }),
};
