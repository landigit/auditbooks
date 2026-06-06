import type { IPC, BackendResponse } from 'utils/ipc/types';
import { IPC_ACTIONS } from 'utils/messages';
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

const host = process.env.BACKEND_IP || 'localhost';
const BACKEND_URL = `http://${host}:6970/api/ipc`;

console.info(`[Lynx IPC] Root Backend URL configured at: ${BACKEND_URL}`);

async function callBackend(action: string, args: unknown[] = []): Promise<any> {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, args }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (result && result.error) {
      throw result.error;
    }
    return result.data;
  } catch (error) {
    console.error(`Failed to call IPC action "${action}":`, error);
    throw error;
  }
}

async function callBackendWrapped(
  action: string,
  args: unknown[] = []
): Promise<any> {
  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, args }),
    });
    if (!response.ok) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return {
          error: {
            name: 'Error',
            message: `HTTP error! status: ${response.status}`,
          },
        };
      }
    }
    return await response.json();
  } catch (error: any) {
    return {
      error: {
        name: error.name || 'Error',
        message: error.message || String(error),
        stack: error.stack,
      },
    };
  }
}

// In-memory config storage for development in the Lynx background thread
const configStore: Record<string, any> = {};

const storeInstance = {
  get<K extends keyof ConfigMap>(
    key: K,
    defaultValue?: ConfigMap[K]
  ): ConfigMap[K] | undefined {
    const val = configStore[`config:${key}`];
    if (val === undefined) return defaultValue;
    return val;
  },
  set<K extends keyof ConfigMap>(key: K, value: ConfigMap[K]): void {
    configStore[`config:${key}`] = value;
  },
  delete(key: keyof ConfigMap): void {
    delete configStore[`config:${key}`];
  },
};

export const lynxIpc: IPC = {
  desktop: false,
  reloadWindow() {
    console.warn(
      '[Lynx IPC] reloadWindow: window reloading is not supported in native Lynx.'
    );
  },
  minimizeWindow() {
    console.log('[Lynx IPC] minimizeWindow (stub)');
  },
  toggleMaximize() {
    console.log('[Lynx IPC] toggleMaximize (stub)');
  },
  isMaximized() {
    return Promise.resolve(false);
  },
  isFullscreen() {
    return Promise.resolve(false);
  },
  closeWindow() {
    console.log('[Lynx IPC] closeWindow (stub)');
  },

  async getCreds(): Promise<Creds> {
    return callBackend(IPC_ACTIONS.GET_CREDS);
  },
  async getLanguageMap(
    code: string
  ): Promise<{ languageMap: LanguageMap; success: boolean; message: string }> {
    return callBackend(IPC_ACTIONS.GET_LANGUAGE_MAP, [code]);
  },
  async getTemplates(posTemplateWidth?: number): Promise<TemplateFile[]> {
    return callBackend(IPC_ACTIONS.GET_TEMPLATES, [posTemplateWidth]);
  },
  async initScheduler(time: string): Promise<void> {
    return callBackend(IPC_ACTIONS.INIT_SCHEDULER, [time]);
  },
  async selectFile(options: SelectFileOptions): Promise<SelectFileReturn> {
    return callBackend(IPC_ACTIONS.SELECT_FILE, [options]);
  },
  async getSaveFilePath(
    options: any
  ): Promise<{ canceled: boolean; filePath?: string }> {
    const defaultPath = options?.defaultPath || 'saved_file.db';
    const resolvedPath = await callBackend(IPC_ACTIONS.GET_DB_DEFAULT_PATH, [
      defaultPath,
    ]);
    return { canceled: false, filePath: resolvedPath };
  },
  async getOpenFilePath(
    options: any
  ): Promise<{ canceled: boolean; filePaths: string[] }> {
    const response = await callBackend(IPC_ACTIONS.GET_OPEN_FILEPATH, [
      options,
    ]);
    return { canceled: response.canceled, filePaths: response.filePaths };
  },
  async checkDbAccess(filePath: string): Promise<boolean> {
    return callBackend(IPC_ACTIONS.CHECK_DB_ACCESS, [filePath]);
  },
  async checkForUpdates(): Promise<void> {
    console.log('[Lynx IPC] checkForUpdates (stub)');
  },
  openLink(link: string) {
    console.log(`[Lynx IPC] openLink (stub): ${link}`);
  },
  async deleteFile(filePath: string): Promise<BackendResponse> {
    return callBackendWrapped(IPC_ACTIONS.DELETE_FILE, [filePath]);
  },
  async saveData(data: string, savePath: string): Promise<void> {
    return callBackend(IPC_ACTIONS.SAVE_DATA, [data, savePath]);
  },
  showItemInFolder(filePath: string) {
    console.log('[Lynx IPC] showItemInFolder (stub):', filePath);
  },
  async makePDF(
    html: string,
    savePath: string,
    width: number,
    height: number
  ): Promise<boolean> {
    await callBackend(IPC_ACTIONS.SAVE_HTML_AS_PDF, [
      html,
      savePath,
      width,
      height,
    ]);
    return true;
  },
  async printDocument(
    _html: string,
    _width: number,
    _height: number
  ): Promise<boolean> {
    console.warn(
      '[Lynx IPC] printDocument: direct document printing is not supported in native Lynx.'
    );
    return false;
  },
  async getDbList(): Promise<ConfigFilesWithModified[]> {
    return callBackend(IPC_ACTIONS.GET_DB_LIST);
  },
  async getDbDefaultPath(companyName: string): Promise<string> {
    return callBackend(IPC_ACTIONS.GET_DB_DEFAULT_PATH, [companyName]);
  },
  async getEnv(): Promise<{
    isDevelopment: boolean;
    platform: string;
    version: string;
  }> {
    return {
      isDevelopment: true,
      platform: 'lynx',
      version: '0.37.8',
    };
  },
  openExternalUrl(url: string) {
    console.log('[Lynx IPC] openExternalUrl (stub):', url);
  },
  async showError(title: string, content: string): Promise<void> {
    console.error(`[Lynx Error Dialog] ${title}: ${content}`);
  },
  async sendError(body: string): Promise<void> {
    console.error('[Lynx IPC] sendError:', body);
  },
  async sendAPIRequest(
    endpoint: string,
    options: RequestInit | undefined
  ): Promise<
    { [key: string]: string | number | boolean | Date | object | object[] }[]
  > {
    return callBackend(IPC_ACTIONS.SEND_API_REQUEST, [endpoint, options]);
  },

  registerMainProcessErrorListener() {},
  registerTriggerFrontendActionListener() {},
  registerConsoleLogListener() {},

  async readDocFile(relPath: string): Promise<string> {
    return callBackend(IPC_ACTIONS.READ_DOC_FILE, [relPath]);
  },
  async readDocData(relPath: string): Promise<string> {
    return callBackend(IPC_ACTIONS.READ_DOC_DATA, [relPath]);
  },

  db: {
    async getSchema(): Promise<BackendResponse> {
      return callBackendWrapped(IPC_ACTIONS.DB_SCHEMA);
    },
    async create(
      dbPath: string,
      countryCode?: string
    ): Promise<BackendResponse> {
      return callBackendWrapped(IPC_ACTIONS.DB_CREATE, [dbPath, countryCode]);
    },
    async connect(
      dbPath: string,
      countryCode?: string
    ): Promise<BackendResponse> {
      return callBackendWrapped(IPC_ACTIONS.DB_CONNECT, [dbPath, countryCode]);
    },
    async call(
      method: DatabaseMethod,
      ...args: unknown[]
    ): Promise<BackendResponse> {
      return callBackendWrapped(IPC_ACTIONS.DB_CALL, [method, ...args]);
    },
    async bespoke(
      method: string,
      ...args: unknown[]
    ): Promise<BackendResponse> {
      return callBackendWrapped(IPC_ACTIONS.DB_BESPOKE, [method, ...args]);
    },
  },
  store: storeInstance,
};

// Polyfill globalThis.ipc
(globalThis as any).ipc = lynxIpc;
if (typeof window !== 'undefined') {
  (window as any).ipc = lynxIpc;
}
