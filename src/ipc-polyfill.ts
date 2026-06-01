import type { IPC } from 'src/utils/ipc/types';
import { IPC_ACTIONS } from 'src/utils/core/messages';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, save, message, ask } from '@tauri-apps/plugin-dialog';
import { open as openShell } from '@tauri-apps/plugin-shell';
import { type as osType, version as osVersion } from '@tauri-apps/plugin-os';
import {
  appDataDir,
  join,
  basename,
  dirname,
  resolveResource,
} from '@tauri-apps/api/path';
import {
  readTextFile,
  writeTextFile,
  exists,
  mkdir,
  remove,
  stat,
  readFile,
} from '@tauri-apps/plugin-fs';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { check as checkUpdate } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { parseCSV } from 'src/utils/core/csvParser';
import type { LanguageMap } from 'src/utils/core/types';
import { tauriDatabaseManager } from 'src/fyo/core/tauriDb';

const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const VALENTINES_DAY = 1644796800000;

// Helper to get consistent Auditbooks app data directory path
async function getAppDataDir(): Promise<string> {
  const appData = await appDataDir();
  const parent = await dirname(appData);
  return await join(parent, 'Auditbooks');
}

interface KnownDb {
  id: string;
  companyName: string;
  dbPath: string;
  openCount: number;
}

interface AppConfig {
  files: KnownDb[];
  lastSelectedFilePath: string | null;
  language?: string;
  deviceId?: string;
}

async function ensureAppDirs(appDataDir: string, dbDir: string): Promise<void> {
  if (!(await exists(appDataDir))) {
    await mkdir(appDataDir, { recursive: true });
  }
  if (!(await exists(dbDir))) {
    await mkdir(dbDir, { recursive: true });
  }
}

async function readConfig(): Promise<AppConfig> {
  try {
    const appData = await getAppDataDir();
    const configFile = await join(appData, 'config.json');
    if (await exists(configFile)) {
      const text = await readTextFile(configFile);
      return JSON.parse(text) as AppConfig;
    }
  } catch (e) {
    console.error('Error reading config:', e);
  }
  return { files: [], lastSelectedFilePath: null };
}

async function writeConfig(config: AppConfig): Promise<void> {
  try {
    const appData = await getAppDataDir();
    const dbDir = await join(appData, 'databases');
    await ensureAppDirs(appData, dbDir);
    const configFile = await join(appData, 'config.json');
    await writeTextFile(configFile, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Error writing config:', e);
  }
}

async function upsertDbInConfig(
  dbPath: string,
  companyName?: string
): Promise<void> {
  const config = await readConfig();
  const normalized = dbPath.replace(/\\/g, '/').toLowerCase();

  let existingIndex = -1;
  for (let i = 0; i < config.files.length; i++) {
    if (
      config.files[i].dbPath.replace(/\\/g, '/').toLowerCase() === normalized
    ) {
      existingIndex = i;
      break;
    }
  }

  if (existingIndex === -1) {
    config.files.push({
      id: `db-${Date.now()}`,
      companyName:
        companyName ||
        dbPath.split(/[\\/]/).pop()?.replace(/\.db$/, '') ||
        'company',
      dbPath,
      openCount: 1,
    });
  } else {
    const existing = config.files[existingIndex];
    existing.openCount = (existing.openCount || 0) + 1;
    if (companyName) existing.companyName = companyName;
  }
  config.lastSelectedFilePath = dbPath;
  await writeConfig(config);
}

// Language translation helpers running directly in frontend/Tauri
function getMapFromCsv(csv: string): LanguageMap {
  const matrix = parseCSV(csv);
  const languageMap: LanguageMap = {};

  for (const row of matrix) {
    if (!row[0] || !row[1]) {
      continue;
    }

    const source = row[0];
    const translation = row[1];
    const context = row[3];

    languageMap[source] = { translation };
    if (context?.length) {
      languageMap[source].context = context;
    }
  }

  return languageMap;
}

async function getTranslationFilePath(code: string): Promise<string> {
  try {
    return await resolveResource(`translations/${code}.csv`);
  } catch {
    return '';
  }
}

async function getContentsIfExists(code: string): Promise<string> {
  const filePath = await getTranslationFilePath(code);
  if (!filePath || !(await exists(filePath))) {
    return '';
  }
  return await readTextFile(filePath);
}

async function errorHandledFetch(url: string) {
  try {
    return await tauriFetch(url);
  } catch {
    return null;
  }
}

async function fetchContentsFromApi(code: string) {
  const url = `https://api.github.com/repos/landigit/auditbooks/contents/translations/${code}.csv`;
  const res = await errorHandledFetch(url);
  if (res === null || res.status !== 200) {
    return null;
  }
  const resJson = (await res.json()) as { content: string };
  const cleanBase64 = resJson.content.replace(/\s/g, '');
  return atob(cleanBase64);
}

async function fetchContentsFromRaw(code: string) {
  const url = `https://raw.githubusercontent.com/landigit/auditbooks/master/translations/${code}.csv`;
  const res = await errorHandledFetch(url);
  if (res === null || res.status !== 200) {
    return null;
  }
  return await res.text();
}

async function getLastUpdated(code: string): Promise<Date> {
  const url = `https://api.github.com/repos/landigit/auditbooks/commits?path=translations%2F${code}.csv&page=1&per_page=1`;
  const res = await errorHandledFetch(url);
  if (res === null || res.status !== 200) {
    return new Date(VALENTINES_DAY);
  }
  const resJson = (await res.json()) as {
    commit: { author: { date: string } };
  }[];
  try {
    return new Date(resJson[0].commit.author.date);
  } catch {
    return new Date(VALENTINES_DAY);
  }
}

async function storeFile(code: string, contents: string) {
  const filePath = await getTranslationFilePath(code);
  if (!filePath) {
    return;
  }
  const dirPath = filePath.substring(
    0,
    filePath.lastIndexOf('/') !== -1
      ? filePath.lastIndexOf('/')
      : filePath.lastIndexOf('\\')
  );
  if (!(await exists(dirPath))) {
    await mkdir(dirPath, { recursive: true });
  }
  await writeTextFile(filePath, contents);
}

async function fetchAndStoreFile(code: string, date?: Date) {
  let contents = await fetchContentsFromApi(code);
  if (!contents) {
    contents = await fetchContentsFromRaw(code);
  }
  if (!date && contents) {
    date = await getLastUpdated(code);
  }
  if (contents) {
    contents = [date!.toISOString(), contents].join('\n');
    await storeFile(code, contents);
  }
  return contents ?? '';
}

async function shouldUpdateFile(code: string, contents: string) {
  const date = await getLastUpdated(code);
  const oldDate = new Date(contents.split('\n')[0]);
  const shouldUpdate = date > oldDate || +oldDate === VALENTINES_DAY;
  return { shouldUpdate, date };
}

async function getUpdatedContent(code: string, contents: string) {
  const { shouldUpdate, date } = await shouldUpdateFile(code, contents);
  if (!shouldUpdate) {
    return contents;
  }
  return await fetchAndStoreFile(code, date);
}

async function getTauriLanguageMap(code: string): Promise<LanguageMap> {
  let contents = await getContentsIfExists(code);
  if (contents.length === 0) {
    contents = (await fetchAndStoreFile(code)) || contents;
  } else {
    contents = (await getUpdatedContent(code, contents)) || contents;
  }
  if (!contents || contents.length === 0) {
    throw new Error(`Could not fetch translations for '${code}'.`);
  }
  return getMapFromCsv(contents);
}

// Polyfill for Tauri and Browser where window.appIpc might exist as a Tauri internal function
if (typeof window !== 'undefined') {
  const BACKEND_URL = 'http://localhost:6970/api/ipc';

  // Helper to route IPC calls to our lightweight local HTTP backend
  async function callBackend(
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

  // Helper for action listeners expecting a BackendResponse structure: { data?: unknown, error?: unknown }
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

  // Basic localStorage store implementation
  const storeInstance = {
    get(key: string) {
      const val = localStorage.getItem(`config:${key}`);
      if (val === null) return undefined;
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    },
    set(key: string, value: any) {
      localStorage.setItem(`config:${key}`, JSON.stringify(value));
    },
    delete(key: string) {
      localStorage.removeItem(`config:${key}`);
    },
  };

  const webIpc: IPC = {
    desktop: isTauri,
    reloadWindow() {
      window.location.reload();
    },
    minimizeWindow() {
      if (isTauri) {
        getCurrentWindow().minimize();
      }
    },
    toggleMaximize() {
      if (isTauri) {
        getCurrentWindow().toggleMaximize();
      }
    },
    async isMaximized() {
      if (isTauri) {
        return await getCurrentWindow().isMaximized();
      }
      return false;
    },
    async isFullscreen() {
      if (isTauri) {
        return await getCurrentWindow().isFullscreen();
      }
      return false;
    },
    closeWindow() {
      if (isTauri) {
        getCurrentWindow().close();
      }
    },
    async getCreds() {
      if (isTauri) {
        return { errorLogUrl: '', tokenString: '', telemetryUrl: '' };
      }
      return callBackend(IPC_ACTIONS.GET_CREDS);
    },
    async getLanguageMap(code: string) {
      if (isTauri) {
        try {
          return await getTauriLanguageMap(code);
        } catch (e: any) {
          console.error(e);
          throw e;
        }
      }
      return callBackend(IPC_ACTIONS.GET_LANGUAGE_MAP, [code]);
    },
    async getTemplates(posTemplateWidth?: number) {
      if (isTauri) {
        try {
          const templatesDir = await resolveResource('templates');
          if (await exists(templatesDir)) {
            const { readDir } = await import('@tauri-apps/plugin-fs');
            const entries = await readDir(templatesDir);
            const templates: any[] = [];
            for (const entry of entries) {
              if (entry.isFile && entry.name.endsWith('.html')) {
                const filePath = await join(templatesDir, entry.name);
                const templateText = await readTextFile(filePath);
                const fileStats = await stat(filePath);
                const modifiedDate = fileStats.mtime
                  ? new Date(fileStats.mtime)
                  : new Date();

                const width =
                  entry.name?.split('-')[1]?.split('.')[0] === 'POS'
                    ? (posTemplateWidth ?? 0)
                    : 0;
                const height =
                  entry.name?.split('-')[1]?.split('.')[0] === 'POS' ? 22 : 0;

                templates.push({
                  template: templateText,
                  file: entry.name,
                  modified: modifiedDate.toISOString(),
                  width,
                  height,
                });
              }
            }
            return templates;
          }
        } catch (e) {
          console.error('Error loading tauri templates:', e);
        }
        return [];
      }
      return callBackend(IPC_ACTIONS.GET_TEMPLATES, [posTemplateWidth]);
    },
    async initScheduler(time: string) {
      if (isTauri) {
        return true;
      }
      return callBackend(IPC_ACTIONS.INIT_SCHEDULER, [time]);
    },
    async selectFile(options: any) {
      if (isTauri) {
        const filePaths = await open({
          multiple: true,
          filters: options?.filters,
        });
        return filePaths as string[] | null;
      }
      return callBackend(IPC_ACTIONS.SELECT_FILE, [options]);
    },
    async getSaveFilePath(options: any) {
      if (isTauri) {
        const filePath = await save({
          filters: options?.filters,
          defaultPath: options?.defaultPath,
        });
        return { canceled: filePath === null, filePath };
      }
      return callBackend(IPC_ACTIONS.GET_SAVE_FILEPATH, [options]);
    },
    async getOpenFilePath(options: any) {
      if (isTauri) {
        const selected = await open({
          multiple: false,
          filters: options?.filters,
        });
        if (selected) {
          return {
            canceled: false,
            filePaths: [selected as string],
            filePath: selected as string,
            name: (selected as string).split(/[\\/]/).pop(),
            success: true,
          };
        }
        return { canceled: true, filePaths: [], filePath: null };
      }
      // Web fallback
      return new Promise<any>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.db';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.onchange = async () => {
          const file = input.files?.[0];
          document.body.removeChild(input);
          if (!file) {
            resolve({ canceled: true, filePaths: [], filePath: null });
            return;
          }
          try {
            const arrayBuffer = await file.arrayBuffer();
            const response = await fetch(
              'http://localhost:6970/api/upload-db',
              {
                method: 'POST',
                headers: { 'X-File-Name': encodeURIComponent(file.name) },
                body: arrayBuffer,
              }
            );
            const result = await response.json();
            if (!response.ok || result.error) {
              throw new Error(result.error || 'Upload failed');
            }
            resolve({
              canceled: false,
              filePaths: [result.filePath],
              filePath: result.filePath,
              name: result.name,
              success: true,
            });
          } catch (err) {
            console.error('DB file upload failed:', err);
            resolve({ canceled: true, filePaths: [], filePath: null });
          }
        };

        input.oncancel = () => {
          document.body.removeChild(input);
          resolve({ canceled: true, filePaths: [], filePath: null });
        };

        input.click();
      });
    },
    async checkDbAccess(filePath: string) {
      if (isTauri) {
        try {
          return await exists(filePath);
        } catch {
          return false;
        }
      }
      return callBackend(IPC_ACTIONS.CHECK_DB_ACCESS, [filePath]);
    },
    async checkForUpdates() {
      if (!isTauri) {
        return;
      }
      try {
        const update = await checkUpdate();
        if (update?.available) {
          const yes = await ask(
            `Version ${update.version} is available.\n\n${update.body ?? ''}\n\nInstall now?`,
            { title: 'Update Available', kind: 'info' }
          );
          if (yes) {
            await update.downloadAndInstall();
            await relaunch();
          }
        }
      } catch (e) {
        console.warn('Update check failed:', e);
      }
    },
    openLink(link: string) {
      if (isTauri) {
        openShell(link);
      } else {
        window.open(link, '_blank');
      }
    },
    async deleteFile(filePath: string) {
      if (isTauri) {
        try {
          if (await exists(filePath)) {
            await remove(filePath);
          }
          const appData = await getAppDataDir();
          const configFile = await join(appData, 'config.json');
          if (await exists(configFile)) {
            const text = await readTextFile(configFile);
            const config = JSON.parse(text);
            if (config && Array.isArray(config.files)) {
              const normalized = filePath.replace(/\\/g, '/').toLowerCase();
              config.files = config.files.filter(
                (f: any) =>
                  f.dbPath.replace(/\\/g, '/').toLowerCase() !== normalized
              );
              if (
                config.lastSelectedFilePath &&
                config.lastSelectedFilePath
                  .replace(/\\/g, '/')
                  .toLowerCase() === normalized
              ) {
                config.lastSelectedFilePath = null;
              }
              await writeTextFile(configFile, JSON.stringify(config, null, 2));
            }
          }
          return { data: { success: true } };
        } catch (err: any) {
          return {
            error: {
              name: err.name || 'Error',
              message: err.message || String(err),
            },
          };
        }
      }
      return callBackendWrapped(IPC_ACTIONS.DELETE_FILE, [filePath]);
    },
    async saveData(data: string, savePath: string) {
      if (isTauri) {
        try {
          await writeTextFile(savePath, data);
          return true;
        } catch (e) {
          console.error('Failed to save data:', e);
          return false;
        }
      }
      return callBackend(IPC_ACTIONS.SAVE_DATA, [data, savePath]);
    },
    showItemInFolder(filePath: string) {
      console.log('showItemInFolder:', filePath);
    },
    async makePDF(
      html: string,
      _savePath: string,
      _width: number,
      _height: number
    ) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        await new Promise((resolve) => setTimeout(resolve, 500));
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
      return true;
    },
    async printDocument(html: string, __width: number, __height: number) {
      return this.makePDF(html, '', __width, __height);
    },
    async getDbList() {
      if (isTauri) {
        try {
          const appData = await getAppDataDir();
          const configFile = await join(appData, 'config.json');
          if (await exists(configFile)) {
            const text = await readTextFile(configFile);
            const config = JSON.parse(text);
            const list: any[] = [];
            const addedPaths = new Set<string>();

            if (config && Array.isArray(config.files)) {
              for (const entry of config.files) {
                if (!entry?.dbPath) continue;
                const normalized = entry.dbPath
                  .replace(/\\/g, '/')
                  .toLowerCase();
                if (addedPaths.has(normalized)) continue;
                try {
                  if (await exists(entry.dbPath)) {
                    const fileStats = await stat(entry.dbPath);
                    if (fileStats.size >= 4096) {
                      addedPaths.add(normalized);
                      list.push({
                        companyName:
                          entry.companyName ||
                          (await basename(entry.dbPath, '.db')),
                        dbPath: entry.dbPath,
                        modified: fileStats.mtime
                          ? new Date(fileStats.mtime).toISOString()
                          : new Date().toISOString(),
                      });
                    }
                  }
                } catch (e) {
                  console.error('Error accessing db file:', entry.dbPath, e);
                }
              }
            }
            return list;
          }
        } catch (e) {
          console.error('Failed to get local db list:', e);
        }
        return [];
      }
      return callBackend(IPC_ACTIONS.GET_DB_LIST);
    },
    async getDbDefaultPath(companyName: string) {
      if (isTauri) {
        const appData = await getAppDataDir();
        const dbDir = await join(appData, 'databases');
        return await join(dbDir, `${companyName}.db`);
      }
      return callBackend(IPC_ACTIONS.GET_DB_DEFAULT_PATH, [companyName]);
    },
    async getEnv() {
      if (isTauri) {
        return {
          isDevelopment: process.env.NODE_ENV === 'development',
          platform: osType(),
          version: osVersion(),
        };
      }
      return {
        isDevelopment: true,
        platform: 'browser',
        version: '0.37.8',
      };
    },
    openExternalUrl(url: string) {
      this.openLink(url);
    },
    async showError(title: string, content: string) {
      if (isTauri) {
        await message(content, { title, kind: 'error' });
      } else {
        alert(`${title}: ${content}`);
      }
    },
    async sendError(body: string) {
      console.error('sendError:', body);
    },
    async sendAPIRequest(endpoint: string, options: any) {
      if (isTauri) {
        try {
          const response = await tauriFetch(endpoint, options);
          return await response.json();
        } catch (e) {
          console.error('API request error:', e);
          throw e;
        }
      }
      return callBackend(IPC_ACTIONS.SEND_API_REQUEST, [endpoint, options]);
    },
    registerMainProcessErrorListener() {},
    registerTriggerFrontendActionListener() {},
    registerConsoleLogListener() {},
    async readDocFile(relPath: string) {
      if (isTauri) {
        try {
          const decodedPath = decodeURIComponent(relPath);
          const resourcePath = await resolveResource(`books/${decodedPath}`);
          return await readTextFile(resourcePath);
        } catch (e) {
          console.error('Error reading doc file:', e);
          throw e;
        }
      }
      return callBackend(IPC_ACTIONS.READ_DOC_FILE, [relPath]);
    },
    async readDocData(relPath: string) {
      if (isTauri) {
        try {
          const decodedPath = decodeURIComponent(relPath);
          const resourcePath = await resolveResource(`books/${decodedPath}`);
          const content = await readFile(resourcePath);
          const ext = decodedPath.split('.').pop()?.toLowerCase();
          const mime =
            ext === 'png'
              ? 'image/png'
              : ext === 'jpg' || ext === 'jpeg'
                ? 'image/jpeg'
                : 'application/octet-stream';
          let binary = '';
          const bytes = new Uint8Array(content);
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          return `data:${mime};base64,${base64}`;
        } catch (e) {
          console.error('Error reading doc data:', e);
          throw e;
        }
      }
      return callBackend(IPC_ACTIONS.READ_DOC_DATA, [relPath]);
    },
    db: {
      async getSchema() {
        if (isTauri) {
          try {
            const { getSchemas } = await import('src/schemas');
            const schemaMap = getSchemas('-', []);
            return { data: schemaMap };
          } catch (e: any) {
            return {
              error: {
                name: e.name || 'Error',
                message: e.message || String(e),
              },
            };
          }
        }
        return callBackendWrapped(IPC_ACTIONS.DB_SCHEMA);
      },
      async create(dbPath: string, countryCode?: string) {
        if (isTauri) {
          try {
            const code = await tauriDatabaseManager.createNewDatabase(
              dbPath,
              countryCode || 'in'
            );
            await upsertDbInConfig(dbPath);
            return { data: code };
          } catch (e: any) {
            return {
              error: {
                name: e.name || 'Error',
                message: e.message || String(e),
              },
            };
          }
        }
        return callBackendWrapped(IPC_ACTIONS.DB_CREATE, [dbPath, countryCode]);
      },
      async connect(dbPath: string, countryCode?: string) {
        if (isTauri) {
          try {
            const code = await tauriDatabaseManager.connectToDatabase(
              dbPath,
              countryCode
            );
            await upsertDbInConfig(dbPath);

            // Expose active Kysely instance globally for developers
            if (tauriDatabaseManager.db?.client?.db) {
              const { createKyselyInstance } =
                await import('src/fyo/core/tauriDb');
              (window as any).db = createKyselyInstance(
                tauriDatabaseManager.db.client.db
              );
            }
            return { data: code };
          } catch (e: any) {
            return {
              error: {
                name: e.name || 'Error',
                message: e.message || String(e),
              },
            };
          }
        }
        return callBackendWrapped(IPC_ACTIONS.DB_CONNECT, [
          dbPath,
          countryCode,
        ]);
      },
      async call(method: string, ...args: any[]) {
        if (isTauri) {
          try {
            const data = await tauriDatabaseManager.call(
              method as any,
              ...args
            );
            return { data };
          } catch (e: any) {
            return {
              error: {
                name: e.name || 'Error',
                message: e.message || String(e),
              },
            };
          }
        }
        return callBackendWrapped(IPC_ACTIONS.DB_CALL, [method, ...args]);
      },
      async bespoke(method: string, ...args: any[]) {
        if (isTauri) {
          try {
            const data = await tauriDatabaseManager.callBespoke(
              method,
              ...args
            );
            return { data };
          } catch (e: any) {
            return {
              error: {
                name: e.name || 'Error',
                message: e.message || String(e),
              },
            };
          }
        }
        return callBackendWrapped(IPC_ACTIONS.DB_BESPOKE, [method, ...args]);
      },
    },
    store: storeInstance,
  };

  (window as any).appIpc = webIpc;
}
