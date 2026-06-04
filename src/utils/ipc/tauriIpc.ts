import type { IPC, BackendResponse } from './types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, save, message } from '@tauri-apps/plugin-dialog';
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
import { parseCSV } from 'src/utils/core/csvParser';
import type {
  LanguageMap,
  TemplateFile,
  ConfigFilesWithModified,
  Creds,
} from 'src/utils/core/types';
import { tauriDatabaseManager } from 'src/fyo/core/tauriDb';

const VALENTINES_DAY = 1644796800000;

async function getAppDataDir(): Promise<string> {
  const appData = await appDataDir();
  const parent = await dirname(appData);
  return await join(parent, 'Auditbooks');
}

async function safeResolveResource(relPath: string): Promise<string> {
  try {
    return await resolveResource(relPath);
  } catch (e) {
    try {
      return await resolveResource(`_up_/${relPath}`);
    } catch {
      throw e;
    }
  }
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
    return await safeResolveResource(`translations/${code}.csv`);
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

let store: any = null;
const storeCache = new Map<string, any>();

import('@tauri-apps/plugin-store')
  .then(async ({ LazyStore }) => {
    try {
      store = new LazyStore('settings.json');
    } catch (err) {
      console.error('Failed to load @tauri-apps/plugin-store:', err);
    }
  })
  .catch((err) => {
    console.error('Failed to load @tauri-apps/plugin-store package:', err);
  });

const storeInstance = {
  get(key: string, defaultValue?: any): any {
    if (storeCache.has(key)) {
      return storeCache.get(key);
    }
    if (store) {
      store.get(key).then((val: any) => {
        if (val !== undefined) {
          storeCache.set(key, val);
        }
      });
    }
    const val = localStorage.getItem(`config:${key}`);
    if (val === null) return defaultValue;
    try {
      const parsed = JSON.parse(val);
      storeCache.set(key, parsed);
      return parsed;
    } catch {
      storeCache.set(key, val);
      return val;
    }
  },
  set(key: string, value: any) {
    storeCache.set(key, value);
    if (store) {
      store.set(key, value).then(() => store.save());
    }
    localStorage.setItem(`config:${key}`, JSON.stringify(value));
  },
  delete(key: string) {
    storeCache.delete(key);
    if (store) {
      store.delete(key).then(() => store.save());
    }
    localStorage.removeItem(`config:${key}`);
  },
};

export const tauriIpc: IPC = {
  desktop: true,
  reloadWindow() {
    window.location.reload();
  },
  minimizeWindow() {
    try {
      const platform = osType();
      if (platform !== 'android' && platform !== 'ios') {
        getCurrentWindow().minimize();
      }
    } catch (e) {
      console.warn('Window minimize is not supported on this platform:', e);
    }
  },
  toggleMaximize() {
    try {
      const platform = osType();
      if (platform !== 'android' && platform !== 'ios') {
        getCurrentWindow().toggleMaximize();
      }
    } catch (e) {
      console.warn(
        'Window maximize toggle is not supported on this platform:',
        e
      );
    }
  },
  async isMaximized() {
    try {
      const platform = osType();
      if (platform !== 'android' && platform !== 'ios') {
        return await getCurrentWindow().isMaximized();
      }
    } catch (e) {
      console.warn('isMaximized is not supported on this platform:', e);
    }
    return false;
  },
  async isFullscreen() {
    try {
      const platform = osType();
      if (platform !== 'android' && platform !== 'ios') {
        return await getCurrentWindow().isFullscreen();
      }
    } catch (e) {
      console.warn('isFullscreen is not supported on this platform:', e);
    }
    return false;
  },
  closeWindow() {
    try {
      const platform = osType();
      if (platform !== 'android' && platform !== 'ios') {
        getCurrentWindow().close();
      }
    } catch (e) {
      console.warn('Window close is not supported on this platform:', e);
    }
  },
  async getCreds(): Promise<Creds> {
    return { errorLogUrl: '', tokenString: '', telemetryUrl: '' };
  },
  async getLanguageMap(code: string) {
    try {
      const languageMap = await getTauriLanguageMap(code);
      return { languageMap, success: true, message: '' };
    } catch (e: any) {
      return {
        languageMap: {},
        success: false,
        message: e.message || String(e),
      };
    }
  },
  async getTemplates(posTemplateWidth?: number): Promise<TemplateFile[]> {
    try {
      const templatesDir = await safeResolveResource('templates');
      if (await exists(templatesDir)) {
        const { readDir } = await import('@tauri-apps/plugin-fs');
        const entries = await readDir(templatesDir);
        const templates: TemplateFile[] = [];
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
  },
  async initScheduler(_time: string) {
    return;
  },
  async selectFile(options: any) {
    const selected = await open({
      multiple: false,
      filters: options?.filters,
      title: options?.title,
    });
    if (selected && typeof selected === 'string') {
      try {
        const data = await readFile(selected);
        const name = selected.split(/[\\/]/).pop() || '';
        return {
          success: true,
          canceled: false,
          filePath: selected,
          name,
          data: data as any,
        };
      } catch (err) {
        console.error('Tauri selectFile read failed:', err);
        return {
          success: false,
          canceled: true,
          filePath: '',
          name: '',
          data: null as any,
        };
      }
    }
    return {
      success: false,
      canceled: true,
      filePath: '',
      name: '',
      data: null as any,
    };
  },
  async getSaveFilePath(options: any) {
    const filePath = await save({
      filters: options?.filters,
      defaultPath: options?.defaultPath,
    });
    return { canceled: filePath === null, filePath: filePath || undefined };
  },
  async getOpenFilePath(options: any) {
    const selected = await open({
      multiple: false,
      filters: options?.filters,
    });
    if (selected && typeof selected === 'string') {
      return {
        canceled: false,
        filePaths: [selected],
        filePath: selected,
        name: selected.split(/[\\/]/).pop() || '',
        success: true,
      };
    }
    return { canceled: true, filePaths: [], filePath: null as any };
  },
  async checkDbAccess(filePath: string): Promise<boolean> {
    try {
      return await exists(filePath);
    } catch {
      return false;
    }
  },
  async checkForUpdates() {
    return;
  },
  openLink(link: string) {
    openShell(link);
  },
  async deleteFile(filePath: string): Promise<BackendResponse> {
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
            config.lastSelectedFilePath.replace(/\\/g, '/').toLowerCase() ===
              normalized
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
  },
  async saveData(data: string, savePath: string) {
    try {
      await writeTextFile(savePath, data);
    } catch (e) {
      console.error('Failed to save data:', e);
    }
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
  async getDbList(): Promise<ConfigFilesWithModified[]> {
    try {
      const appData = await getAppDataDir();
      const configFile = await join(appData, 'config.json');
      if (await exists(configFile)) {
        const text = await readTextFile(configFile);
        const config = JSON.parse(text);
        const list: ConfigFilesWithModified[] = [];
        const addedPaths = new Set<string>();

        if (config && Array.isArray(config.files)) {
          for (const entry of config.files) {
            if (!entry?.dbPath) continue;
            const normalized = entry.dbPath.replace(/\\/g, '/').toLowerCase();
            if (addedPaths.has(normalized)) continue;
            try {
              if (await exists(entry.dbPath)) {
                const fileStats = await stat(entry.dbPath);
                if (fileStats.size >= 4096) {
                  addedPaths.add(normalized);
                  list.push({
                    id: entry.id,
                    companyName:
                      entry.companyName ||
                      (await basename(entry.dbPath, '.db')),
                    dbPath: entry.dbPath,
                    modified: fileStats.mtime
                      ? new Date(fileStats.mtime).toISOString()
                      : new Date().toISOString(),
                    openCount: entry.openCount || 1,
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
  },
  async getDbDefaultPath(companyName: string) {
    const appData = await getAppDataDir();
    const dbDir = await join(appData, 'databases');
    return await join(dbDir, `${companyName}.db`);
  },
  async getEnv() {
    return {
      isDevelopment: process.env.NODE_ENV === 'development',
      platform: osType(),
      version: osVersion(),
    };
  },
  openExternalUrl(url: string) {
    this.openLink(url);
  },
  async showError(title: string, content: string) {
    await message(content, { title, kind: 'error' });
  },
  async sendError(body: string) {
    console.error('sendError:', body);
  },
  async sendAPIRequest(endpoint: string, options: any) {
    try {
      const response = await tauriFetch(endpoint, options);
      return await response.json();
    } catch (e) {
      console.error('API request error:', e);
      throw e;
    }
  },
  registerMainProcessErrorListener() {},
  registerTriggerFrontendActionListener() {},
  registerConsoleLogListener() {},
  async readDocFile(relPath: string) {
    try {
      const decodedPath = decodeURIComponent(relPath);
      const cleanPath = decodedPath.replace(/^\/+/, '');
      const resourcePath = await safeResolveResource(`books/${cleanPath}`);
      return await readTextFile(resourcePath);
    } catch (e) {
      try {
        const decodedPath = decodeURIComponent(relPath);
        const cleanPath = decodedPath.replace(/^\/+/, '');
        const appDir = await appDataDir();

        let devSourcePaths: string[] = [];
        try {
          const resourcePath = await safeResolveResource(`books/${cleanPath}`);
          const normalized = resourcePath.replace(/\\/g, '/');
          const index = normalized.lastIndexOf('/src-tauri/');
          if (index !== -1) {
            const projectRoot = resourcePath.substring(0, index);
            const devPath = await join(projectRoot, 'books', cleanPath);
            devSourcePaths = [devPath];
          }
        } catch (err) {
          console.error('[Tauri Fallback] Path resolution error:', err);
        }

        const possiblePaths = [
          ...devSourcePaths,
          await join(appDir, 'books', cleanPath),
          await join(appDir, '_up_', 'books', cleanPath),
          await join(appDir, '..', 'books', cleanPath),
          await join(appDir, '..', 'Auditbooks', 'books', cleanPath),
        ];
        for (const tPath of possiblePaths) {
          if (await exists(tPath)) {
            return await readTextFile(tPath);
          }
        }
        console.error(
          '[Tauri Fallback] None of the fallback paths exist. Tried:',
          possiblePaths
        );
      } catch (innerError) {
        console.error('[Tauri Fallback] Error in fallback load:', innerError);
      }
      throw e;
    }
  },
  async readDocData(relPath: string) {
    try {
      const decodedPath = decodeURIComponent(relPath);
      const cleanPath = decodedPath.replace(/^\/+/, '');
      const resourcePath = await safeResolveResource(`books/${cleanPath}`);
      const content = await readFile(resourcePath);
      const ext = cleanPath.split('.').pop()?.toLowerCase();
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
      try {
        const decodedPath = decodeURIComponent(relPath);
        const cleanPath = decodedPath.replace(/^\/+/, '');
        const appDir = await appDataDir();

        let devSourcePaths: string[] = [];
        try {
          const resourcePath = await safeResolveResource(`books/${cleanPath}`);
          const normalized = resourcePath.replace(/\\/g, '/');
          const index = normalized.lastIndexOf('/src-tauri/');
          if (index !== -1) {
            const projectRoot = resourcePath.substring(0, index);
            const devPath = await join(projectRoot, 'books', cleanPath);
            devSourcePaths = [devPath];
          }
        } catch (err) {
          console.error('[Tauri Fallback] Path resolution error:', err);
        }

        const possiblePaths = [
          ...devSourcePaths,
          await join(appDir, 'books', cleanPath),
          await join(appDir, '_up_', 'books', cleanPath),
          await join(appDir, '..', 'books', cleanPath),
          await join(appDir, '..', 'Auditbooks', 'books', cleanPath),
        ];
        for (const tPath of possiblePaths) {
          if (await exists(tPath)) {
            const content = await readFile(tPath);
            const ext = cleanPath.split('.').pop()?.toLowerCase();
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
          }
        }
      } catch (innerError) {
        console.error(
          '[Tauri Data Fallback] Error in fallback load:',
          innerError
        );
      }
      throw e;
    }
  },
  db: {
    async getSchema() {
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
    },
    async create(dbPath: string, countryCode?: string) {
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
    },
    async connect(dbPath: string, countryCode?: string) {
      try {
        const code = await tauriDatabaseManager.connectToDatabase(
          dbPath,
          countryCode
        );
        await upsertDbInConfig(dbPath);

        if (tauriDatabaseManager.db?.client?.db) {
          const { createKyselyInstance } = await import('src/fyo/core/tauriDb');
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
    },
    async call(method: string, ...args: any[]) {
      try {
        const data = await tauriDatabaseManager.call(method as any, ...args);
        return { data };
      } catch (e: any) {
        return {
          error: {
            name: e.name || 'Error',
            message: e.message || String(e),
          },
        };
      }
    },
    async bespoke(method: string, ...args: any[]) {
      try {
        const data = await tauriDatabaseManager.callBespoke(method, ...args);
        return { data };
      } catch (e: any) {
        return {
          error: {
            name: e.name || 'Error',
            message: e.message || String(e),
          },
        };
      }
    },
  },
  store: storeInstance as any,
};

if (typeof window !== 'undefined') {
  (window as any).appIpc = tauriIpc;
}
