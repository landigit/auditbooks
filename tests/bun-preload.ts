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
(global as any).location = dom.window.location;

// Mock global ipc object
(global as any).ipc = {
  getEnv: () =>
    Promise.resolve({
      isDevelopment: true,
      platform: 'linux',
      version: pkg.version,
    }),
};
