import { parseCSV } from 'utils/csvParser';
import databaseManager from './databaseManager';

const templatesGlob = import.meta.glob('../../templates/*.html', { query: '?raw', eager: true }) as Record<string, { default: string }>;

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AuditbooksDB', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('databases')) {
        db.createObjectStore('databases');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const mockIpc = {
  desktop: true, // Tell fyo we want to route through IPC to reach our mock DB and store

  reloadWindow() {
    window.location.reload();
  },
  minimizeWindow() {},
  toggleMaximize() {},
  isMaximized() {
    return Promise.resolve(false);
  },
  isFullscreen() {
    return Promise.resolve(false);
  },
  closeWindow() {},
  getCreds() {
    return Promise.resolve({ errorLogUrl: '', tokenString: '', telemetryUrl: '' });
  },
  async getLanguageMap(code: string) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/landigit/auditbooks/master/translations/${code}.csv`);
      if (!res.ok) throw new Error('Network response was not ok');
      const csvText = await res.text();
      const matrix = parseCSV(csvText);
      const languageMap: Record<string, { translation: string; context?: string }> = {};
      for (const row of matrix) {
        if (!row[0] || !row[1]) continue;
        languageMap[row[0]] = { translation: row[1] };
        if (row[3]?.length) {
          languageMap[row[0]].context = row[3];
        }
      }
      return { languageMap, success: true, message: '' };
    } catch (err: any) {
      return { languageMap: {}, success: false, message: err.message };
    }
  },
  getTemplates(posTemplateWidth?: number) {
    const templates = [];
    for (const [key, module] of Object.entries(templatesGlob)) {
      const file = key.split('/').pop() || '';
      const template = module.default;
      const width = file?.split('-')[1]?.split('.')[0] === 'POS' ? (posTemplateWidth ?? 0) : 0;
      const height = file?.split('-')[1]?.split('.')[0] === 'POS' ? 22 : 0;

      templates.push({
        template,
        file,
        modified: new Date().toISOString(),
        width,
        height,
      });
    }
    return Promise.resolve(templates);
  },
  initScheduler(_time: string) {
    return Promise.resolve();
  },
  selectFile(options: any) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = options.filters?.map((f: any) => f.extensions.map((ext: string) => `.${ext}`).join(',')).join(',') || '*/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve({ name: '', filePath: '', success: false, data: new Uint8Array(), canceled: true });
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          resolve({
            name: file.name,
            filePath: file.name,
            success: true,
            data: new Uint8Array(arrayBuffer),
            canceled: false,
          });
        };
        reader.onerror = () => {
          resolve({ name: '', filePath: '', success: false, data: new Uint8Array(), canceled: false });
        };
        reader.readAsArrayBuffer(file);
      };
      input.oncancel = () => {
        resolve({ name: '', filePath: '', success: false, data: new Uint8Array(), canceled: true });
      };
      input.click();
    });
  },
  getSaveFilePath(options: any) {
    return Promise.resolve({ filePath: options.defaultPath || 'export.txt', canceled: false });
  },
  getOpenFilePath(_options: any) {
    return Promise.resolve({ filePaths: [], canceled: true });
  },
  checkDbAccess(_filePath: string) {
    return Promise.resolve(true);
  },
  checkForUpdates() {
    return Promise.resolve();
  },
  openLink(link: string) {
    window.open(link, '_blank');
  },
  async deleteFile(filePath: string) {
    try {
      const db = await openIndexedDB();
      const transaction = db.transaction('databases', 'readwrite');
      const store = transaction.objectStore('databases');
      store.delete(filePath);

      const dbsJson = localStorage.getItem('auditbooks_dbs');
      if (dbsJson) {
        const dbs = JSON.parse(dbsJson).filter((p: string) => p !== filePath);
        localStorage.setItem('auditbooks_dbs', JSON.stringify(dbs));
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  saveData(data: string, savePath: string) {
    const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = savePath.split('/').pop() || 'export.txt';
    a.click();
    URL.revokeObjectURL(url);
    return Promise.resolve();
  },
  showItemInFolder(_filePath: string) {},
  makePDF(_html: string, _savePath: string, _width: number, _height: number) {
    return Promise.resolve();
  },
  printDocument(html: string, _width: number, _height: number) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    return Promise.resolve();
  },
  getDbList() {
    const dbsJson = localStorage.getItem('auditbooks_dbs');
    const dbs = dbsJson ? JSON.parse(dbsJson) : [];
    return Promise.resolve(
      dbs.map((filePath: string, index: number) => {
        const companyName = filePath.split('/').pop()?.replace('.books.db', '') || filePath;
        return {
          id: String(index),
          companyName,
          dbPath: filePath,
          openCount: 1,
          modified: new Date().toISOString(),
        };
      })
    );
  },
  getDbDefaultPath(companyName: string) {
    return Promise.resolve(`${companyName}`);
  },
  getEnv() {
    return Promise.resolve({
      isDevelopment: true,
      platform: 'web',
      version: '0.37.8',
    });
  },
  openExternalUrl(url: string) {
    window.open(url, '_blank');
  },
  showError(title: string, content: string) {
    alert(`${title}: ${content}`);
  },
  sendError(_body: string) {
    return Promise.resolve();
  },
  sendAPIRequest(endpoint: string, options: any) {
    return fetch(endpoint, options).then(res => res.json());
  },
  registerMainProcessErrorListener(_listener: any) {},
  registerTriggerFrontendActionListener(_listener: any) {},
  registerConsoleLogListener(_listener: any) {},
  readDocFile(_relPath: string) {
    return Promise.resolve('');
  },
  readDocData(_relPath: string) {
    return Promise.resolve('');
  },

  db: {
    async getSchema() {
      const data = await databaseManager.getSchemaMap();
      return { data };
    },
    async create(dbPath: string, countryCode: string) {
      const dbsJson = localStorage.getItem('auditbooks_dbs');
      const dbs = dbsJson ? JSON.parse(dbsJson) : [];
      if (!dbs.includes(dbPath)) {
        dbs.push(dbPath);
        localStorage.setItem('auditbooks_dbs', JSON.stringify(dbs));
      }
      const data = await databaseManager.createNewDatabase(dbPath, countryCode);
      return { data };
    },
    async connect(dbPath: string, countryCode?: string) {
      const dbsJson = localStorage.getItem('auditbooks_dbs');
      const dbs = dbsJson ? JSON.parse(dbsJson) : [];
      if (!dbs.includes(dbPath)) {
        dbs.push(dbPath);
        localStorage.setItem('auditbooks_dbs', JSON.stringify(dbs));
      }
      const data = await databaseManager.connectToDatabase(dbPath, countryCode);
      return { data };
    },
    async call(method: any, ...args: any[]) {
      const data = await databaseManager.call(method, ...args);
      return { data };
    },
    async bespoke(method: string, ...args: any[]) {
      const data = await databaseManager.callBespoke(method, ...args);
      return { data };
    }
  },

  store: {
    get(key: string) {
      const val = localStorage.getItem(`store_${key}`);
      return val ? JSON.parse(val) : undefined;
    },
    set(key: string, value: any) {
      localStorage.setItem(`store_${key}`, JSON.stringify(value));
    },
    delete(key: string) {
      localStorage.removeItem(`store_${key}`);
    }
  }
};

if (!(globalThis as any).ipc) {
  try {
    Object.defineProperty(globalThis, 'ipc', {
      value: mockIpc,
      writable: true,
      configurable: true,
    });
  } catch (e) {
    (globalThis as any).ipc = mockIpc;
  }
}
export default mockIpc;
