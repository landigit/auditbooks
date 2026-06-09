import type { IPC, BackendResponse } from 'utils/ipc/types';
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

// ============================================================================
// Tauri IPC bridge
//
// Replaces the Bun HTTP backend (backend.ts on :6970) with native Tauri
// invoke() calls and Tauri plugins for filesystem, store, dialog, etc.
//
// The database is handled by TauriDemux (fyo/demux/dbTauri.ts) which reuses
// LynxDatabaseCore with @tauri-apps/plugin-sql — no Rust DB code needed.
// ============================================================================

// Lazy-load Tauri APIs to avoid import errors in non-Tauri environments
async function getInvoke() {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke;
}

// ---------------------------------------------------------------------------
// Store — localStorage-first, plugin-store as async write-through backup
// ---------------------------------------------------------------------------
// localStorage is always available in WebView with no timing issues.
// plugin-store is used as a backup persistence layer (survives reinstalls).
// ---------------------------------------------------------------------------
let _pluginStore: any = null;

async function getPluginStore() {
  if (_pluginStore) return _pluginStore;
  try {
    const { Store } = await import('@tauri-apps/plugin-store');
    _pluginStore = await Store.load('config.json');
    return _pluginStore;
  } catch {
    return null;
  }
}

// In-memory cache — seeded from localStorage immediately
const _storeCache: Record<string, any> = {};

// Load from localStorage right now (synchronous, always works)
function seedCacheFromLocalStorage() {
  if (typeof localStorage === 'undefined') return;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('config:')) {
      try {
        _storeCache[key] = JSON.parse(localStorage.getItem(key) ?? 'null');
      } catch {
        _storeCache[key] = localStorage.getItem(key);
      }
    }
  }
}
seedCacheFromLocalStorage();

// Optionally sync from plugin-store in the background (non-blocking)
async function syncFromPluginStore() {
  try {
    const store = await getPluginStore();
    if (!store) return;
    const entries = await store.entries();
    for (const [key, value] of entries) {
      // Plugin-store wins if key not in localStorage (e.g. after reinstall)
      if (_storeCache[key] === undefined || _storeCache[key] === null) {
        _storeCache[key] = value;
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch {}
        }
      }
    }
  } catch {
    // plugin-store not available — localStorage is sufficient
  }
}

const storeInstance = {
  async load(): Promise<void> {
    // localStorage already seeded synchronously — start async plugin sync
    syncFromPluginStore().catch(() => {});
  },
  get<K extends keyof ConfigMap>(
    key: K,
    defaultValue?: ConfigMap[K]
  ): ConfigMap[K] | undefined {
    const val = _storeCache[`config:${key}`];
    if (val === undefined || val === null) return defaultValue;
    return val as ConfigMap[K];
  },
  set<K extends keyof ConfigMap>(key: K, value: ConfigMap[K]): void {
    const storeKey = `config:${key}`;
    _storeCache[storeKey] = value;
    // Write to localStorage immediately (synchronous)
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storeKey, JSON.stringify(value));
      } catch {}
    }
    // Write to plugin-store asynchronously as backup
    getPluginStore()
      .then((s: any) => s?.set(storeKey, value).then(() => s.save()))
      .catch(() => {});
  },
  delete(key: keyof ConfigMap): void {
    const storeKey = `config:${key}`;
    delete _storeCache[storeKey];
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(storeKey);
      } catch {}
    }
    getPluginStore()
      .then((s: any) => s?.delete(storeKey).then(() => s.save()))
      .catch(() => {});
  },
};

// ---------------------------------------------------------------------------
// Tauri IPC implementation
// ---------------------------------------------------------------------------
export const tauriIpc: IPC = {
  desktop: false,

  // ── Window controls ──
  reloadWindow() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  },
  minimizeWindow() {
    import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) => {
        getCurrentWindow().minimize();
      })
      .catch(() =>
        console.log('[Tauri IPC] minimizeWindow not available on mobile')
      );
  },
  toggleMaximize() {
    // No-op on mobile
    console.log('[Tauri IPC] toggleMaximize (no-op on mobile)');
  },
  isMaximized() {
    return Promise.resolve(false);
  },
  isFullscreen() {
    return Promise.resolve(false);
  },
  closeWindow() {
    import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) => {
        getCurrentWindow().close();
      })
      .catch(() =>
        console.log('[Tauri IPC] closeWindow not available on mobile')
      );
  },

  // ── Credentials ──
  async getCreds(): Promise<Creds> {
    return { errorLogUrl: '', tokenString: '', telemetryUrl: '' };
  },

  // ── Language & Templates ──
  async getLanguageMap(
    code: string
  ): Promise<{ languageMap: LanguageMap; success: boolean; message: string }> {
    try {
      const invoke = await getInvoke();
      return await invoke('get_language_map', { code });
    } catch {
      // Fallback: try reading bundled translations via FS plugin
      try {
        const { readTextFile, BaseDirectory } =
          await import('@tauri-apps/plugin-fs');
        const csv = await readTextFile(`translations/${code}.csv`, {
          baseDir: BaseDirectory.Resource,
        });
        const { parseCSV } = await import('utils/csvParser');
        const matrix = parseCSV(csv);
        const languageMap: LanguageMap = {};
        for (const row of matrix) {
          if (!row[0] || !row[1]) continue;
          const source = row[0];
          const translation = row[1];
          const context = row[3];
          languageMap[source] = { translation };
          if (context?.length) {
            languageMap[source].context = context;
          }
        }
        return { languageMap, success: true, message: '' };
      } catch (err) {
        return { languageMap: {}, success: false, message: String(err) };
      }
    }
  },

  async getTemplates(posTemplateWidth?: number): Promise<TemplateFile[]> {
    try {
      const invoke = await getInvoke();
      return await invoke('get_templates', { posTemplateWidth });
    } catch {
      // Fallback: read from bundled resources
      try {
        const { readTextFile, stat, BaseDirectory } =
          await import('@tauri-apps/plugin-fs');
        // Hardcode static list since Android APK asset directories cannot be readDir-ed reliably
        const templateFiles = [
          'Basic.template.html',
          'Business-POS.template.html',
          'Business.Payment.template.html',
          'Business.Shipment.template.html',
          'Business.template.html',
          'Minimal.template.html',
        ];
        const templates: TemplateFile[] = [];
        for (const file of templateFiles) {
          try {
            const template = await readTextFile(`templates/${file}`, {
              baseDir: BaseDirectory.Resource,
            });
            let modified = new Date().toISOString();
            try {
              const meta = await stat(`templates/${file}`, {
                baseDir: BaseDirectory.Resource,
              });
              if (meta.mtime) {
                modified = new Date(meta.mtime).toISOString();
              }
            } catch {
              // ignore stat errors
            }
            const isPOS = file.split('-')[1]?.split('.')[0] === 'POS';
            templates.push({
              template,
              file,
              modified,
              width: isPOS ? (posTemplateWidth ?? 0) : 0,
              height: isPOS ? 22 : 0,
            });
          } catch {
            // skip missing templates
          }
        }
        return templates;
      } catch {
        return [];
      }
    }
  },

  async initScheduler(_time: string): Promise<void> {
    console.log('[Tauri IPC] initScheduler (stub)');
  },

  // ── File operations ──
  async selectFile(_options: SelectFileOptions): Promise<SelectFileReturn> {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const filePath = await open({
        filters: [{ name: 'Database', extensions: ['db'] }],
        multiple: false,
      });
      if (!filePath) {
        return {
          canceled: true,
          filePaths: [],
          filePath: null,
          name: '',
          success: false,
        } as any;
      }
      const pathStr =
        typeof filePath === 'string' ? filePath : (filePath as string[])[0];
      const name = pathStr.split(/[\\/]/).pop() ?? pathStr;
      return {
        canceled: false,
        filePaths: [pathStr],
        filePath: pathStr,
        name,
        success: true,
      } as any;
    } catch (err) {
      console.error('[Tauri IPC] selectFile error:', err);
      return {
        canceled: true,
        filePaths: [],
        filePath: null,
        name: '',
        success: false,
      } as any;
    }
  },

  async getSaveFilePath(
    options: any
  ): Promise<{ canceled: boolean; filePath?: string }> {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const defaultPath = options?.defaultPath || 'company.db';
      const filePath = await save({
        defaultPath,
        filters: [{ name: 'Database', extensions: ['db'] }],
      });
      if (!filePath) return { canceled: true };
      return { canceled: false, filePath };
    } catch (err) {
      console.error('[Tauri IPC] getSaveFilePath error:', err);
      return { canceled: true };
    }
  },

  async getOpenFilePath(
    _options: any
  ): Promise<{ canceled: boolean; filePaths: string[] }> {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const filePath = await open({
        filters: [{ name: 'Database', extensions: ['db'] }],
        multiple: false,
      });
      if (!filePath) return { canceled: true, filePaths: [] };
      const pathStr =
        typeof filePath === 'string' ? filePath : (filePath as string[])[0];
      return { canceled: false, filePaths: [pathStr] };
    } catch (err) {
      console.error('[Tauri IPC] getOpenFilePath error:', err);
      return { canceled: true, filePaths: [] };
    }
  },

  async checkDbAccess(filePath: string): Promise<boolean> {
    try {
      const invoke = await getInvoke();
      return await invoke('check_db_access', { filePath });
    } catch {
      return false;
    }
  },

  async checkForUpdates(): Promise<void> {
    console.log('[Tauri IPC] checkForUpdates (stub)');
  },

  openLink(link: string) {
    import('@tauri-apps/plugin-opener')
      .then(({ openUrl }) => openUrl(link))
      .catch(() => {
        if (typeof window !== 'undefined') window.open(link, '_blank');
      });
  },

  async deleteFile(filePath: string): Promise<BackendResponse> {
    try {
      const invoke = await getInvoke();
      await invoke('delete_file', { filePath });

      // Clean up the entry from config store files list
      const storedFiles = _storeCache['config:files'] || [];
      if (Array.isArray(storedFiles)) {
        const updated = storedFiles.filter((f: any) => f?.dbPath !== filePath);
        _storeCache['config:files'] = updated;
        const s = await getPluginStore();
        await s.set('config:files', updated);
        await s.save();
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

  async saveData(data: string, savePath: string): Promise<void> {
    try {
      const invoke = await getInvoke();
      await invoke('save_data', { data, savePath });
    } catch (err) {
      console.error('[Tauri IPC] Failed to save data:', err);
    }
  },

  showItemInFolder(filePath: string) {
    console.log('[Tauri IPC] showItemInFolder:', filePath);
    // On Android this is a no-op; could open a share intent in the future
  },

  async makePDF(
    html: string,
    _savePath: string,
    _width: number,
    _height: number
  ): Promise<boolean> {
    // Client-side PDF generation using the browser's print functionality
    // For a full solution, html2pdf.js can be added later
    if (typeof document === 'undefined') return false;
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

    setTimeout(() => document.body.removeChild(iframe), 1000);
    return true;
  },

  async printDocument(
    html: string,
    _width: number,
    _height: number
  ): Promise<boolean> {
    return this.makePDF(html, '', _width, _height);
  },

  async getDbList(): Promise<ConfigFilesWithModified[]> {
    const list: ConfigFilesWithModified[] = [];
    const seenPaths = new Set<string>();

    // 1. Load recent files from the store cache (contains absolute paths)
    const storedFiles = _storeCache['config:files'] || [];
    if (Array.isArray(storedFiles)) {
      for (const file of storedFiles) {
        if (file && file.dbPath) {
          const exists = await this.checkDbAccess(file.dbPath);
          if (exists) {
            list.push({
              companyName:
                file.companyName ||
                file.dbPath.split(/[\\/]/).pop()?.replace('.db', '') ||
                'Company',
              dbPath: file.dbPath,
              modified: file.modified || new Date().toISOString(),
            } as any);
            seenPaths.add(file.dbPath);
          }
        }
      }
    }

    // 2. Scan AppData for flat .db files (local/new DB creations)
    try {
      const { readDir, stat, BaseDirectory } =
        await import('@tauri-apps/plugin-fs');
      const entries = await readDir('', { baseDir: BaseDirectory.AppData });
      for (const entry of entries) {
        if (!entry.name?.endsWith('.db')) continue;
        if (!seenPaths.has(entry.name)) {
          try {
            const meta = await stat(entry.name, {
              baseDir: BaseDirectory.AppData,
            });
            if (meta.size < 4096) continue; // Skip tiny/empty files
            list.push({
              companyName: entry.name.replace('.db', ''),
              dbPath: entry.name,
              modified: meta.mtime
                ? new Date(meta.mtime).toISOString()
                : new Date().toISOString(),
            } as any);
            seenPaths.add(entry.name);
          } catch {
            // skip inaccessible files
          }
        }
      }
    } catch {
      // AppData dir might not be listable yet
    }

    return list;
  },

  async getDbDefaultPath(companyName: string): Promise<string> {
    // On mobile, DBs live in AppData — just return the filename
    return `${companyName}.db`;
  },

  async getEnv(): Promise<{
    isDevelopment: boolean;
    platform: string;
    version: string;
  }> {
    try {
      const invoke = await getInvoke();
      return await invoke('get_env');
    } catch {
      return {
        isDevelopment: false,
        platform: 'tauri-android',
        version: '0.37.8',
      };
    }
  },

  openExternalUrl(url: string) {
    this.openLink(url);
  },

  async showError(title: string, content: string): Promise<void> {
    try {
      const { message } = await import('@tauri-apps/plugin-dialog');
      await message(`${content}`, { title, kind: 'error' });
    } catch {
      console.error(`[Tauri Error] ${title}: ${content}`);
    }
  },

  async sendError(body: string): Promise<void> {
    console.error('[Tauri IPC] sendError:', body);
  },

  async sendAPIRequest(
    endpoint: string,
    options: RequestInit | undefined
  ): Promise<
    { [key: string]: string | number | boolean | Date | object | object[] }[]
  > {
    try {
      // Use Tauri HTTP plugin to bypass CORS
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      const res = await tauriFetch(endpoint, options as any);
      return await res.json();
    } catch {
      // Fallback to standard fetch
      return (await fetch(endpoint, options)).json() as any;
    }
  },

  registerMainProcessErrorListener() {},
  registerTriggerFrontendActionListener() {},
  registerConsoleLogListener() {},

  async readDocFile(relPath: string): Promise<string> {
    const { readTextFile, BaseDirectory } =
      await import('@tauri-apps/plugin-fs');
    return readTextFile(`books/${relPath}`, {
      baseDir: BaseDirectory.Resource,
    });
  },

  async readDocData(relPath: string): Promise<string> {
    const { readFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
    const bytes = await readFile(`books/${relPath}`, {
      baseDir: BaseDirectory.Resource,
    });
    const ext = relPath.split('.').pop()?.toLowerCase() ?? '';
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream';

    // Convert Uint8Array to base64
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${mime};base64,${btoa(binary)}`;
  },

  // ── Database (delegated to TauriDemux via Fyo, not used directly) ──
  db: {
    async getSchema(): Promise<BackendResponse> {
      return { data: {} };
    },
    async create(
      _dbPath: string,
      _countryCode?: string
    ): Promise<BackendResponse> {
      return { data: 'in' };
    },
    async connect(
      _dbPath: string,
      _countryCode?: string
    ): Promise<BackendResponse> {
      return { data: 'in' };
    },
    async call(
      _method: DatabaseMethod,
      ..._args: unknown[]
    ): Promise<BackendResponse> {
      return { data: null };
    },
    async bespoke(
      _method: string,
      ..._args: unknown[]
    ): Promise<BackendResponse> {
      return { data: null };
    },
  },

  store: storeInstance,
};

// ── Bootstrap ── set up globalThis.ipc

try {
  (globalThis as any)['ipc'] = tauriIpc;
} catch (e) {
  // Bypassed read-only global bindings
}
if (typeof window !== 'undefined') {
  try {
    (window as any)['ipc'] = tauriIpc;
  } catch (e) {
    // Bypassed read-only window bindings
  }
}

export { tauriIpc as ipc };
