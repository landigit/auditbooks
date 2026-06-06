export interface BackendResponse {
  data?: unknown;
  error?: { message: string; name: string; stack?: string; code?: string };
}

import type { ConfigMap } from 'fyo/core/types';
import type { DatabaseMethod } from 'utils/db/types';
import type {
  ConfigFilesWithModified,
  Creds,
  LanguageMap,
  SelectFileOptions,
  SelectFileReturn,
  TemplateFile,
} from 'utils/types';

/** Platform-agnostic IPC interface shared by the Electron preload and the web/Tauri polyfill. */
export interface IPC {
  readonly desktop: boolean;

  reloadWindow(): void;
  minimizeWindow(): void;
  toggleMaximize(): void;
  isMaximized(): Promise<unknown>;
  isFullscreen(): Promise<unknown>;
  closeWindow(): void;

  getCreds(): Promise<Creds>;
  getLanguageMap(code: string): Promise<{
    languageMap: LanguageMap;
    success: boolean;
    message: string;
  }>;
  getTemplates(posTemplateWidth?: number): Promise<TemplateFile[]>;
  initScheduler(time: string): Promise<void>;
  selectFile(options: SelectFileOptions): Promise<SelectFileReturn>;
  getSaveFilePath(options: object): Promise<{ canceled: boolean; filePath?: string }>;
  getOpenFilePath(options: object): Promise<{ canceled: boolean; filePaths: string[] }>;
  checkDbAccess(filePath: string): Promise<boolean>;
  checkForUpdates(): Promise<void>;
  openLink(link: string): void;
  deleteFile(filePath: string): Promise<BackendResponse>;
  saveData(data: string, savePath: string): Promise<void>;
  showItemInFolder(filePath: string): void;
  makePDF(html: string, savePath: string, width: number, height: number): Promise<boolean>;
  printDocument(html: string, width: number, height: number): Promise<boolean>;
  getDbList(): Promise<ConfigFilesWithModified[]>;
  getDbDefaultPath(companyName: string): Promise<string>;
  getEnv(): Promise<{ isDevelopment: boolean; platform: string; version: string }>;
  openExternalUrl(url: string): void;
  showError(title: string, content: string): Promise<void>;
  sendError(body: string): Promise<void>;
  sendAPIRequest(
    endpoint: string,
    options: RequestInit | undefined
  ): Promise<{ [key: string]: string | number | boolean | Date | object | object[] }[]>;

  registerMainProcessErrorListener(listener: (...args: unknown[]) => void): void;
  registerTriggerFrontendActionListener(listener: (...args: unknown[]) => void): void;
  registerConsoleLogListener(listener: (...args: unknown[]) => void): void;

  readDocFile(relPath: string): Promise<string>;
  readDocData(relPath: string): Promise<string>;

  db: {
    getSchema(): Promise<BackendResponse>;
    create(dbPath: string, countryCode?: string): Promise<BackendResponse>;
    connect(dbPath: string, countryCode?: string): Promise<BackendResponse>;
    call(method: DatabaseMethod, ...args: unknown[]): Promise<BackendResponse>;
    bespoke(method: string, ...args: unknown[]): Promise<BackendResponse>;
  };

  store: {
    load?(): Promise<void>;
    get<K extends keyof ConfigMap>(key: K, defaultValue?: ConfigMap[K]): ConfigMap[K] | undefined;
    set<K extends keyof ConfigMap>(key: K, value: ConfigMap[K]): void;
    delete(key: keyof ConfigMap): void;
  };
}
