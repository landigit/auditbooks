"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src-electron/electron-preload.ts
var electron_preload_exports = {};
__export(electron_preload_exports, {
  ipcApi: () => ipcApi
});
module.exports = __toCommonJS(electron_preload_exports);
var import_electron = require("electron");
var ipcApi = {
  desktop: true,
  // Core Actions
  getEnv: () => import_electron.ipcRenderer.invoke("get-env"),
  getCreds: () => import_electron.ipcRenderer.invoke("get-creds"),
  checkForUpdates: () => import_electron.ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => import_electron.ipcRenderer.invoke("download-update"),
  quitAndInstall: () => import_electron.ipcRenderer.invoke("quit-and-install"),
  checkDbAccess: (dbPath) => import_electron.ipcRenderer.invoke("check-db-access", dbPath),
  getTemplates: (root) => import_electron.ipcRenderer.invoke("get-templates", root),
  getLanguageMap: (code) => import_electron.ipcRenderer.invoke("get-language-map", code),
  selectFile: (options) => import_electron.ipcRenderer.invoke("select-file", options),
  getOpenFilePath: (options) => import_electron.ipcRenderer.invoke("open-dialog", options),
  getSaveFilePath: (options) => import_electron.ipcRenderer.invoke("save-dialog", options),
  getDbList: () => import_electron.ipcRenderer.invoke("get-db-list"),
  getDbDefaultPath: (company) => import_electron.ipcRenderer.invoke("get-db-default-path", company),
  deleteFile: (filePath) => import_electron.ipcRenderer.invoke("delete-file", filePath),
  initScheduler: (interval) => import_electron.ipcRenderer.invoke("init-scheduler", interval),
  saveData: (data, savePath) => import_electron.ipcRenderer.invoke("save-data", data, savePath),
  showError: (title, content) => import_electron.ipcRenderer.invoke("show-error", { title, content }),
  sendError: (body) => import_electron.ipcRenderer.invoke("send-error", body),
  sendAPIRequest: (endpoint, options) => import_electron.ipcRenderer.invoke("send-api-request", endpoint, options),
  // Legacy Support Wrappers
  printHtml: (html, width, height) => import_electron.ipcRenderer.invoke("print-html-document", html, width, height),
  printDocument: (html, width, height) => import_electron.ipcRenderer.invoke("print-html-document", html, width, height),
  saveHtmlAsPdf: (html, savePath, width, height) => import_electron.ipcRenderer.invoke("save-html-as-pdf", html, savePath, width, height),
  makePDF: (html, savePath, width, height) => import_electron.ipcRenderer.invoke("save-html-as-pdf", html, savePath, width, height),
  // Window Management
  isMaximized: () => import_electron.ipcRenderer.invoke("is-maximized"),
  isFullscreen: () => import_electron.ipcRenderer.invoke("is-fullscreen"),
  reloadWindow: () => {
    import_electron.ipcRenderer.send("reload-main-window");
  },
  minimizeWindow: () => {
    import_electron.ipcRenderer.send("minimize-main-window");
  },
  toggleMaximize: () => {
    import_electron.ipcRenderer.send("maximize-main-window");
  },
  closeWindow: () => {
    import_electron.ipcRenderer.send("close-main-window");
  },
  openLink: (url) => {
    import_electron.ipcRenderer.send("open-external", url);
  },
  openExternalUrl: (url) => {
    import_electron.ipcRenderer.send("open-external", url);
  },
  showItemInFolder: (filePath) => {
    import_electron.ipcRenderer.send("show-item-in-folder", filePath);
  },
  // NESTED store object (Required by Fyo)
  store: {
    get: (key) => import_electron.ipcRenderer.sendSync("get-store", key),
    set: (key, val) => import_electron.ipcRenderer.sendSync("set-store", key, val),
    delete: (key) => import_electron.ipcRenderer.sendSync("delete-store", key)
  },
  // NESTED db object (Required by Fyo)
  db: {
    getSchema: () => import_electron.ipcRenderer.invoke("db-schema"),
    connect: (dbPath, countryCode) => import_electron.ipcRenderer.invoke("db-connect", dbPath, countryCode),
    create: (dbPath, countryCode) => import_electron.ipcRenderer.invoke("db-create", dbPath, countryCode),
    call: (method, ...args) => import_electron.ipcRenderer.invoke("db-call", method, ...args),
    bespoke: (method, ...args) => import_electron.ipcRenderer.invoke("db-bespoke", method, ...args)
  },
  // Event Listeners (Aligned with registerIpcRendererListeners.ts)
  registerMainProcessErrorListener: (callback) => {
    import_electron.ipcRenderer.on(
      "main-process-error",
      (_event, ...args) => callback(...args)
    );
  },
  registerTriggerFrontendActionListener: (callback) => {
    import_electron.ipcRenderer.on(
      "trigger-erpnext-sync",
      (_event, ...args) => callback(...args)
    );
  },
  registerConsoleLogListener: (callback) => {
    import_electron.ipcRenderer.on("console-log", (_event, ...args) => callback(...args));
  },
  on: (channel, callback) => {
    const subscription = (_event, ...args) => callback(...args);
    import_electron.ipcRenderer.on(channel, subscription);
    return () => {
      import_electron.ipcRenderer.removeListener(channel, subscription);
    };
  }
};
import_electron.contextBridge.exposeInMainWorld("auditbooksIpc", ipcApi);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ipcApi
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vc3JjLWVsZWN0cm9uL2VsZWN0cm9uLXByZWxvYWQudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB7IGNvbnRleHRCcmlkZ2UsIGlwY1JlbmRlcmVyIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5cbi8qKlxuICogSGFyZGVuZWQgTmVzdGVkIElQQyBCcmlkZ2UgZm9yIEF1ZGl0Ym9va3NcbiAqIFRoaXMgdmVyc2lvbiBwcm92aWRlcyB0aGUgbmVzdGVkIHN0cnVjdHVyZSBleHBlY3RlZCBieSBGeW8gd2hpbGUgcmVtYWluaW5nIHNlY3VyZS5cbiAqL1xuZXhwb3J0IGNvbnN0IGlwY0FwaSA9IHtcblx0ZGVza3RvcDogdHJ1ZSxcblxuXHQvLyBDb3JlIEFjdGlvbnNcblx0Z2V0RW52OiAoKSA9PiBpcGNSZW5kZXJlci5pbnZva2UoXCJnZXQtZW52XCIpLFxuXHRnZXRDcmVkczogKCkgPT4gaXBjUmVuZGVyZXIuaW52b2tlKFwiZ2V0LWNyZWRzXCIpLFxuXHRjaGVja0ZvclVwZGF0ZXM6ICgpID0+IGlwY1JlbmRlcmVyLmludm9rZShcImNoZWNrLWZvci11cGRhdGVzXCIpLFxuXHRkb3dubG9hZFVwZGF0ZTogKCkgPT4gaXBjUmVuZGVyZXIuaW52b2tlKFwiZG93bmxvYWQtdXBkYXRlXCIpLFxuXHRxdWl0QW5kSW5zdGFsbDogKCkgPT4gaXBjUmVuZGVyZXIuaW52b2tlKFwicXVpdC1hbmQtaW5zdGFsbFwiKSxcblx0Y2hlY2tEYkFjY2VzczogKGRiUGF0aDogc3RyaW5nKSA9PlxuXHRcdGlwY1JlbmRlcmVyLmludm9rZShcImNoZWNrLWRiLWFjY2Vzc1wiLCBkYlBhdGgpLFxuXHRnZXRUZW1wbGF0ZXM6IChyb290OiBzdHJpbmcpID0+IGlwY1JlbmRlcmVyLmludm9rZShcImdldC10ZW1wbGF0ZXNcIiwgcm9vdCksXG5cdGdldExhbmd1YWdlTWFwOiAoY29kZTogc3RyaW5nKSA9PlxuXHRcdGlwY1JlbmRlcmVyLmludm9rZShcImdldC1sYW5ndWFnZS1tYXBcIiwgY29kZSksXG5cdHNlbGVjdEZpbGU6IChvcHRpb25zOiBhbnkpID0+IGlwY1JlbmRlcmVyLmludm9rZShcInNlbGVjdC1maWxlXCIsIG9wdGlvbnMpLFxuXHRnZXRPcGVuRmlsZVBhdGg6IChvcHRpb25zOiBhbnkpID0+IGlwY1JlbmRlcmVyLmludm9rZShcIm9wZW4tZGlhbG9nXCIsIG9wdGlvbnMpLFxuXHRnZXRTYXZlRmlsZVBhdGg6IChvcHRpb25zOiBhbnkpID0+IGlwY1JlbmRlcmVyLmludm9rZShcInNhdmUtZGlhbG9nXCIsIG9wdGlvbnMpLFxuXHRnZXREYkxpc3Q6ICgpID0+IGlwY1JlbmRlcmVyLmludm9rZShcImdldC1kYi1saXN0XCIpLFxuXHRnZXREYkRlZmF1bHRQYXRoOiAoY29tcGFueTogc3RyaW5nKSA9PlxuXHRcdGlwY1JlbmRlcmVyLmludm9rZShcImdldC1kYi1kZWZhdWx0LXBhdGhcIiwgY29tcGFueSksXG5cdGRlbGV0ZUZpbGU6IChmaWxlUGF0aDogc3RyaW5nKSA9PiBpcGNSZW5kZXJlci5pbnZva2UoXCJkZWxldGUtZmlsZVwiLCBmaWxlUGF0aCksXG5cdGluaXRTY2hlZHVsZXI6IChpbnRlcnZhbDogc3RyaW5nKSA9PlxuXHRcdGlwY1JlbmRlcmVyLmludm9rZShcImluaXQtc2NoZWR1bGVyXCIsIGludGVydmFsKSxcblx0c2F2ZURhdGE6IChkYXRhOiBzdHJpbmcsIHNhdmVQYXRoOiBzdHJpbmcpID0+XG5cdFx0aXBjUmVuZGVyZXIuaW52b2tlKFwic2F2ZS1kYXRhXCIsIGRhdGEsIHNhdmVQYXRoKSxcblx0c2hvd0Vycm9yOiAodGl0bGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PlxuXHRcdGlwY1JlbmRlcmVyLmludm9rZShcInNob3ctZXJyb3JcIiwgeyB0aXRsZSwgY29udGVudCB9KSxcblx0c2VuZEVycm9yOiAoYm9keTogc3RyaW5nKSA9PiBpcGNSZW5kZXJlci5pbnZva2UoXCJzZW5kLWVycm9yXCIsIGJvZHkpLFxuXHRzZW5kQVBJUmVxdWVzdDogKGVuZHBvaW50OiBzdHJpbmcsIG9wdGlvbnM6IGFueSkgPT5cblx0XHRpcGNSZW5kZXJlci5pbnZva2UoXCJzZW5kLWFwaS1yZXF1ZXN0XCIsIGVuZHBvaW50LCBvcHRpb25zKSxcblxuXHQvLyBMZWdhY3kgU3VwcG9ydCBXcmFwcGVyc1xuXHRwcmludEh0bWw6IChodG1sOiBzdHJpbmcsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSA9PlxuXHRcdGlwY1JlbmRlcmVyLmludm9rZShcInByaW50LWh0bWwtZG9jdW1lbnRcIiwgaHRtbCwgd2lkdGgsIGhlaWdodCksXG5cdHByaW50RG9jdW1lbnQ6IChodG1sOiBzdHJpbmcsIHdpZHRoOiBudW1iZXIsIGhlaWdodDogbnVtYmVyKSA9PlxuXHRcdGlwY1JlbmRlcmVyLmludm9rZShcInByaW50LWh0bWwtZG9jdW1lbnRcIiwgaHRtbCwgd2lkdGgsIGhlaWdodCksXG5cdHNhdmVIdG1sQXNQZGY6IChcblx0XHRodG1sOiBzdHJpbmcsXG5cdFx0c2F2ZVBhdGg6IHN0cmluZyxcblx0XHR3aWR0aDogbnVtYmVyLFxuXHRcdGhlaWdodDogbnVtYmVyLFxuXHQpID0+IGlwY1JlbmRlcmVyLmludm9rZShcInNhdmUtaHRtbC1hcy1wZGZcIiwgaHRtbCwgc2F2ZVBhdGgsIHdpZHRoLCBoZWlnaHQpLFxuXHRtYWtlUERGOiAoaHRtbDogc3RyaW5nLCBzYXZlUGF0aDogc3RyaW5nLCB3aWR0aDogbnVtYmVyLCBoZWlnaHQ6IG51bWJlcikgPT5cblx0XHRpcGNSZW5kZXJlci5pbnZva2UoXCJzYXZlLWh0bWwtYXMtcGRmXCIsIGh0bWwsIHNhdmVQYXRoLCB3aWR0aCwgaGVpZ2h0KSxcblxuXHQvLyBXaW5kb3cgTWFuYWdlbWVudFxuXHRpc01heGltaXplZDogKCkgPT4gaXBjUmVuZGVyZXIuaW52b2tlKFwiaXMtbWF4aW1pemVkXCIpLFxuXHRpc0Z1bGxzY3JlZW46ICgpID0+IGlwY1JlbmRlcmVyLmludm9rZShcImlzLWZ1bGxzY3JlZW5cIiksXG5cdHJlbG9hZFdpbmRvdzogKCkgPT4ge1xuXHRcdGlwY1JlbmRlcmVyLnNlbmQoXCJyZWxvYWQtbWFpbi13aW5kb3dcIik7XG5cdH0sXG5cdG1pbmltaXplV2luZG93OiAoKSA9PiB7XG5cdFx0aXBjUmVuZGVyZXIuc2VuZChcIm1pbmltaXplLW1haW4td2luZG93XCIpO1xuXHR9LFxuXHR0b2dnbGVNYXhpbWl6ZTogKCkgPT4ge1xuXHRcdGlwY1JlbmRlcmVyLnNlbmQoXCJtYXhpbWl6ZS1tYWluLXdpbmRvd1wiKTtcblx0fSxcblx0Y2xvc2VXaW5kb3c6ICgpID0+IHtcblx0XHRpcGNSZW5kZXJlci5zZW5kKFwiY2xvc2UtbWFpbi13aW5kb3dcIik7XG5cdH0sXG5cdG9wZW5MaW5rOiAodXJsOiBzdHJpbmcpID0+IHtcblx0XHRpcGNSZW5kZXJlci5zZW5kKFwib3Blbi1leHRlcm5hbFwiLCB1cmwpO1xuXHR9LFxuXHRvcGVuRXh0ZXJuYWxVcmw6ICh1cmw6IHN0cmluZykgPT4ge1xuXHRcdGlwY1JlbmRlcmVyLnNlbmQoXCJvcGVuLWV4dGVybmFsXCIsIHVybCk7XG5cdH0sXG5cdHNob3dJdGVtSW5Gb2xkZXI6IChmaWxlUGF0aDogc3RyaW5nKSA9PiB7XG5cdFx0aXBjUmVuZGVyZXIuc2VuZChcInNob3ctaXRlbS1pbi1mb2xkZXJcIiwgZmlsZVBhdGgpO1xuXHR9LFxuXG5cdC8vIE5FU1RFRCBzdG9yZSBvYmplY3QgKFJlcXVpcmVkIGJ5IEZ5bylcblx0c3RvcmU6IHtcblx0XHRnZXQ6IChrZXk6IHN0cmluZykgPT4gaXBjUmVuZGVyZXIuc2VuZFN5bmMoXCJnZXQtc3RvcmVcIiwga2V5KSxcblx0XHRzZXQ6IChrZXk6IHN0cmluZywgdmFsOiBhbnkpID0+IGlwY1JlbmRlcmVyLnNlbmRTeW5jKFwic2V0LXN0b3JlXCIsIGtleSwgdmFsKSxcblx0XHRkZWxldGU6IChrZXk6IHN0cmluZykgPT4gaXBjUmVuZGVyZXIuc2VuZFN5bmMoXCJkZWxldGUtc3RvcmVcIiwga2V5KSxcblx0fSxcblxuXHQvLyBORVNURUQgZGIgb2JqZWN0IChSZXF1aXJlZCBieSBGeW8pXG5cdGRiOiB7XG5cdFx0Z2V0U2NoZW1hOiAoKSA9PiBpcGNSZW5kZXJlci5pbnZva2UoXCJkYi1zY2hlbWFcIiksXG5cdFx0Y29ubmVjdDogKGRiUGF0aDogc3RyaW5nLCBjb3VudHJ5Q29kZT86IHN0cmluZykgPT5cblx0XHRcdGlwY1JlbmRlcmVyLmludm9rZShcImRiLWNvbm5lY3RcIiwgZGJQYXRoLCBjb3VudHJ5Q29kZSksXG5cdFx0Y3JlYXRlOiAoZGJQYXRoOiBzdHJpbmcsIGNvdW50cnlDb2RlPzogc3RyaW5nKSA9PlxuXHRcdFx0aXBjUmVuZGVyZXIuaW52b2tlKFwiZGItY3JlYXRlXCIsIGRiUGF0aCwgY291bnRyeUNvZGUpLFxuXHRcdGNhbGw6IChtZXRob2Q6IHN0cmluZywgLi4uYXJnczogYW55W10pID0+XG5cdFx0XHRpcGNSZW5kZXJlci5pbnZva2UoXCJkYi1jYWxsXCIsIG1ldGhvZCwgLi4uYXJncyksXG5cdFx0YmVzcG9rZTogKG1ldGhvZDogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSkgPT5cblx0XHRcdGlwY1JlbmRlcmVyLmludm9rZShcImRiLWJlc3Bva2VcIiwgbWV0aG9kLCAuLi5hcmdzKSxcblx0fSxcblxuXHQvLyBFdmVudCBMaXN0ZW5lcnMgKEFsaWduZWQgd2l0aCByZWdpc3RlcklwY1JlbmRlcmVyTGlzdGVuZXJzLnRzKVxuXHRyZWdpc3Rlck1haW5Qcm9jZXNzRXJyb3JMaXN0ZW5lcjogKGNhbGxiYWNrOiBhbnkpID0+IHtcblx0XHRpcGNSZW5kZXJlci5vbihcIm1haW4tcHJvY2Vzcy1lcnJvclwiLCAoX2V2ZW50LCAuLi5hcmdzKSA9PlxuXHRcdFx0Y2FsbGJhY2soLi4uYXJncyksXG5cdFx0KTtcblx0fSxcblx0cmVnaXN0ZXJUcmlnZ2VyRnJvbnRlbmRBY3Rpb25MaXN0ZW5lcjogKGNhbGxiYWNrOiBhbnkpID0+IHtcblx0XHRpcGNSZW5kZXJlci5vbihcInRyaWdnZXItZXJwbmV4dC1zeW5jXCIsIChfZXZlbnQsIC4uLmFyZ3MpID0+XG5cdFx0XHRjYWxsYmFjayguLi5hcmdzKSxcblx0XHQpO1xuXHR9LFxuXHRyZWdpc3RlckNvbnNvbGVMb2dMaXN0ZW5lcjogKGNhbGxiYWNrOiBhbnkpID0+IHtcblx0XHRpcGNSZW5kZXJlci5vbihcImNvbnNvbGUtbG9nXCIsIChfZXZlbnQsIC4uLmFyZ3MpID0+IGNhbGxiYWNrKC4uLmFyZ3MpKTtcblx0fSxcblx0b246IChjaGFubmVsOiBzdHJpbmcsIGNhbGxiYWNrOiBhbnkpID0+IHtcblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSAoX2V2ZW50OiBhbnksIC4uLmFyZ3M6IGFueVtdKSA9PiBjYWxsYmFjayguLi5hcmdzKTtcblx0XHRpcGNSZW5kZXJlci5vbihjaGFubmVsLCBzdWJzY3JpcHRpb24pO1xuXHRcdHJldHVybiAoKSA9PiB7XG5cdFx0XHRpcGNSZW5kZXJlci5yZW1vdmVMaXN0ZW5lcihjaGFubmVsLCBzdWJzY3JpcHRpb24pO1xuXHRcdH07XG5cdH0sXG59O1xuXG5leHBvcnQgdHlwZSBJUEMgPSB0eXBlb2YgaXBjQXBpO1xuXG4vLyBGaW5hbCBFeHBvc3VyZVxuY29udGV4dEJyaWRnZS5leHBvc2VJbk1haW5Xb3JsZChcImF1ZGl0Ym9va3NJcGNcIiwgaXBjQXBpKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQUEyQztBQU1wQyxJQUFNLFNBQVM7QUFBQSxFQUNyQixTQUFTO0FBQUE7QUFBQSxFQUdULFFBQVEsTUFBTSw0QkFBWSxPQUFPLFNBQVM7QUFBQSxFQUMxQyxVQUFVLE1BQU0sNEJBQVksT0FBTyxXQUFXO0FBQUEsRUFDOUMsaUJBQWlCLE1BQU0sNEJBQVksT0FBTyxtQkFBbUI7QUFBQSxFQUM3RCxnQkFBZ0IsTUFBTSw0QkFBWSxPQUFPLGlCQUFpQjtBQUFBLEVBQzFELGdCQUFnQixNQUFNLDRC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
