/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
/**
 * tests/rstest-setup.ts
 * Global setup for all rstest suites — replaces tests/preload.ts
 */
import { rs } from "@rstest/core";
// @ts-expect-error
import { JSDOM } from "jsdom";
import pkg from "../package.json";

// ---------------------------------------------------------------------------
// JSDOM browser environment (needed for Vue store / component tests)
// ---------------------------------------------------------------------------
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
});
(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).history = dom.window.history;
(global as any).navigator = dom.window.navigator;

// ---------------------------------------------------------------------------
// Mock 'electron' module
// ---------------------------------------------------------------------------
rs.mock("electron", () => ({
  app: {
    getPath: () => "/tmp",
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
    platform: "linux",
    version: pkg.version,
  }),
};
