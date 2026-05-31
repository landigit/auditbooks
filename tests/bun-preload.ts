import { mock } from 'bun:test';
// @ts-ignore
import { JSDOM } from 'jsdom';
import pkg from '../package.json';

// Initialize global JSDOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).history = dom.window.history;
(global as any).navigator = dom.window.navigator;

// Mock Electron using Bun's native module mocking
mock.module('electron', () => ({
  app: {
    getPath: () => '/tmp',
    getVersion: () => pkg.version,
  },
  ipcRenderer: {
    on: () => {},
    send: () => {},
    invoke: () => {},
  },
}));

// Mock global ipc object
(global as any).ipc = {
  getEnv: async () => ({
    isDevelopment: true,
    platform: 'linux',
    version: pkg.version,
  }),
};
