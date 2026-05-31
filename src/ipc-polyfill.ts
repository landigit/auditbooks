import type { IPC } from 'utils/ipc/types';
import { IPC_ACTIONS } from 'utils/messages';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open, save, message } from '@tauri-apps/plugin-dialog';
import { open as openShell } from '@tauri-apps/plugin-shell';
import { type as osType, version as osVersion } from '@tauri-apps/plugin-os';

const isTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

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
      return callBackend(IPC_ACTIONS.CHECK_DB_ACCESS, [filePath]);
    },
    async checkForUpdates() {
      // Stub for Tauri updater
      console.log(
        'checkForUpdates (Tauri plugin updater can be integrated here)'
      );
    },
    openLink(link: string) {
      if (isTauri) {
        openShell(link);
      } else {
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
      console.log('showItemInFolder:', filePath);
    },
    async makePDF(
      html: string,
      _savePath: string,
      _width: number,
      _height: number
    ) {
      // In Tauri, use window.print() or specialized plugins.
      // Currently simulating PDF by using window.print()
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
      return this.makePDF(html, '', _width, _height);
    },
    async getDbList() {
      return callBackend(IPC_ACTIONS.GET_DB_LIST);
    },
    async getDbDefaultPath(companyName: string) {
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
      return callBackend(IPC_ACTIONS.SEND_API_REQUEST, [endpoint, options]);
    },
    registerMainProcessErrorListener() {},
    registerTriggerFrontendActionListener() {},
    registerConsoleLogListener() {},
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
        return callBackendWrapped(IPC_ACTIONS.DB_CONNECT, [
          dbPath,
          countryCode,
        ]);
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

  (window as any).appIpc = webIpc;
}
