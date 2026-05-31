import { mock } from 'bun:test';
import pkg from '../../package.json';

// Mock electron
mock.module('electron', () => ({
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

// Mock global ipc object if used
(global as any).ipc = {
  getEnv: async () => ({
    isDevelopment: true,
    platform: 'linux',
    version: pkg.version,
  }),
};
