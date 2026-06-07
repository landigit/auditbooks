import type { IPC } from 'utils/ipc/types';
import { IPC_ACTIONS } from 'utils/messages';

const BACKEND_URL = 'http://localhost:6970/api/ipc';

// Helper to route IPC calls to our lightweight local HTTP backend
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
    if (typeof localStorage === 'undefined') return undefined;
    const val = localStorage.getItem(`config:${key}`);
    if (val === null) return undefined;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  },
  set(key: string, value: any) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`config:${key}`, JSON.stringify(value));
  },
  delete(key: string) {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`config:${key}`);
  },
};

const webIpc: IPC = {
  desktop: false,
  reloadWindow() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  },
  minimizeWindow() {
    console.log('minimizeWindow (stub)');
  },
  toggleMaximize() {
    console.log('toggleMaximize (stub)');
  },
  isMaximized() {
    return Promise.resolve(false);
  },
  isFullscreen() {
    return Promise.resolve(false);
  },
  closeWindow() {
    console.log('closeWindow (stub)');
  },
  async getCreds() {
    return callBackend(IPC_ACTIONS.GET_CREDS);
  },
  async getLanguageMap(code: string) {
    return callBackend(IPC_ACTIONS.GET_LANGUAGE_MAP, [code]);
  },
  async getTemplates(posTemplateWidth?: number) {
    return callBackend(IPC_ACTIONS.GET_TEMPLATES, [posTemplateWidth]);
  },
  async initScheduler(time: string) {
    return callBackend(IPC_ACTIONS.INIT_SCHEDULER, [time]);
  },
  async selectFile(options: any) {
    return callBackend(IPC_ACTIONS.SELECT_FILE, [options]);
  },
  async getSaveFilePath(options: any) {
    const defaultPath = options?.defaultPath || '';
    if (
      defaultPath.toLowerCase().endsWith('.pdf') ||
      defaultPath.toLowerCase().includes('.pdf')
    ) {
      return { canceled: false, filePath: defaultPath };
    }

    const defaultName = defaultPath.replace('.db', '') || 'company';
    if (typeof window === 'undefined') {
      return { canceled: true, filePath: undefined };
    }
    const name = window.prompt('Enter company/file name:', defaultName);
    if (!name) return { canceled: true, filePath: undefined };
    const safeName = name
      .replace(/\.books\.db$/i, '')
      .replace(/\.books$/i, '')
      .replace(/\.db$/i, '')
      .replace(/[^a-zA-Z0-9 ._-]/g, '_');
    const resolvedPath = await callBackend(IPC_ACTIONS.GET_DB_DEFAULT_PATH, [
      safeName,
    ]);
    return { canceled: false, filePath: resolvedPath };
  },
  async getOpenFilePath(_options: any) {
    if (typeof document === 'undefined') {
      return { canceled: true, filePaths: [], filePath: null };
    }
    // In web dev mode, open a real browser file picker for .db files,
    // upload the selected file to the backend, and return its server path.
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
          const response = await fetch('http://localhost:6970/api/upload-db', {
            method: 'POST',
            headers: { 'X-File-Name': encodeURIComponent(file.name) },
            body: arrayBuffer,
          });
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
    return callBackend(IPC_ACTIONS.CHECK_DB_ACCESS, [filePath]);
  },
  async checkForUpdates() {
    console.log('checkForUpdates (stub)');
  },
  openLink(link: string) {
    if (typeof window !== 'undefined') {
      window.open(link, '_blank');
    }
  },
  async deleteFile(filePath: string) {
    return callBackendWrapped(IPC_ACTIONS.DELETE_FILE, [filePath]);
  },
  async saveData(data: string, savePath: string) {
    return callBackend(IPC_ACTIONS.SAVE_DATA, [data, savePath]);
  },
  showItemInFolder(filePath: string) {
    console.log('showItemInFolder (stub):', filePath);
  },
  async makePDF(html: string, savePath: string, width: number, height: number) {
    const base64Data = await callBackend(IPC_ACTIONS.SAVE_HTML_AS_PDF, [
      html,
      savePath,
      width,
      height,
    ]);
    if (base64Data && typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${base64Data}`;
      const fileName =
        savePath.split(/[\\/]/).pop()?.replace('.db', '') || 'document.pdf';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return true;
  },
  async printDocument(html: string, _width: number, _height: number) {
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

      // Wait for styles/fonts to resolve
      await new Promise((resolve) => setTimeout(resolve, 500));
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);

    return true;
  },
  async getDbList() {
    return callBackend(IPC_ACTIONS.GET_DB_LIST);
  },
  async getDbDefaultPath(companyName: string) {
    return callBackend(IPC_ACTIONS.GET_DB_DEFAULT_PATH, [companyName]);
  },
  async getEnv() {
    return {
      isDevelopment: true,
      platform: 'browser',
      version: '0.37.8',
    };
  },
  openExternalUrl(url: string) {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  },
  async showError(title: string, content: string) {
    if (typeof window !== 'undefined') {
      alert(`${title}: ${content}`);
    }
  },
  async sendError(body: string) {
    console.error('sendError (stub):', body);
  },
  async sendAPIRequest(endpoint: string, options: any) {
    return callBackend(IPC_ACTIONS.SEND_API_REQUEST, [endpoint, options]);
  },
  registerMainProcessErrorListener() {
    // no-op in browser: no main process events to relay
  },
  registerTriggerFrontendActionListener() {
    // no-op in browser
  },
  registerConsoleLogListener() {
    // no-op in browser
  },
  readDocFile(relPath: string) {
    return callBackend(IPC_ACTIONS.READ_DOC_FILE, [relPath]);
  },
  readDocData(relPath: string) {
    return callBackend(IPC_ACTIONS.READ_DOC_DATA, [relPath]);
  },
  db: {
    async getSchema() {
      return callBackendWrapped(IPC_ACTIONS.DB_SCHEMA);
    },
    async create(dbPath: string, countryCode?: string) {
      return callBackendWrapped(IPC_ACTIONS.DB_CREATE, [dbPath, countryCode]);
    },
    async connect(dbPath: string, countryCode?: string) {
      return callBackendWrapped(IPC_ACTIONS.DB_CONNECT, [dbPath, countryCode]);
    },
    async call(method: string, ...args: any[]) {
      return callBackendWrapped(IPC_ACTIONS.DB_CALL, [method, ...args]);
    },
    async bespoke(method: string, ...args: any[]) {
      return callBackendWrapped(IPC_ACTIONS.DB_BESPOKE, [method, ...args]);
    },
  },
  store: storeInstance,
};

// Export IPC bridge as a safe reference
export let ipc: IPC;

if (typeof window !== 'undefined') {
  (window as any).fyoIpc = webIpc;
}

if (typeof window !== 'undefined' && window.ipc && (window.ipc as any).store) {
  ipc = window.ipc as any;
} else {
  ipc = webIpc;
  if (typeof window !== 'undefined') {
    try {
      Object.defineProperty(window, 'ipc', {
        value: webIpc,
        writable: true,
        configurable: true,
      });
    } catch (e) {
      console.warn(
        'Could not redefine window.ipc, using local polyfilled ipc reference',
        e
      );
    }
  }
}
