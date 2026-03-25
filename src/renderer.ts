import { CUSTOM_EVENTS } from 'utils/messages';
import { UnexpectedLogObject } from 'utils/types';
import { type App as VueApp, createApp } from 'vue';
import App from './App.vue';
import Badge from './components/Badge.vue';
import FeatherIcon from './components/FeatherIcon.vue';
import { handleError, sendError } from './errorHandling';
import { fyo } from './initFyo';
import { outsideClickDirective } from './renderer/helpers';
import registerIpcRendererListeners from './renderer/registerIpcRendererListeners';
import router from './router';
import { stringifyCircular } from './utils';
import { setLanguageMap } from './utils/language';

// --- Portless Unified Bridge (Vercel Style) ---
// biome-ignore lint/suspicious/noExplicitAny: Legacy IPC bridge
const isWeb = typeof (window as any).ipc === 'undefined';
// Smart origin detection: if on Vite dev port 6969, point to Deno backend on 8080
const API_URL = isWeb
  ? window.location.port === '6969'
    ? 'http://localhost:8080'
    : window.location.origin
  : 'http://localhost:8080';

if (isWeb) {
  console.log('🚀 Auditbooks: Running in Unified Portless Mode... (window.ipc is undefined)');
  // biome-ignore lint/suspicious/noExplicitAny: Legacy IPC bridge
  (window as any).ipc = {
    getEnv: () =>
      Promise.resolve({
        isDevelopment: false,
        platform: 'win32',
        version: '0.36.1',
      }),
    checkForUpdates: () => Promise.resolve(),
    checkDbAccess: () => Promise.resolve(true),
    initScheduler: () => Promise.resolve(),
    getDbList: () => Promise.resolve([]),
    getDbDefaultPath: () => Promise.resolve(':memory:'),
    isMaximized: () => Promise.resolve(false),
    isFullscreen: () => Promise.resolve(false),
    getLanguageMap: () => Promise.resolve({ success: true, languageMap: {} }),
    minimizeWindow: () => Promise.resolve(),
    toggleMaximize: () => Promise.resolve(),
    closeWindow: () => Promise.resolve(),
    getOpenFilePath: () => Promise.resolve({ canceled: true, filePaths: [] }),
    getSaveFilePath: () => Promise.resolve({ canceled: true, filePath: '' }),
    sendAPIRequest: (endpoint: string, options: RequestInit) =>
      fetch(endpoint, options),

    call: async (method: string, ...args: unknown[]) => {
      const [namespace, cmd] = method.split('.');
      if (namespace === 'db') {
        const schemaName = args[0] as string;
        const token = localStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        try {
          if (cmd === 'get') {
            const name = args[1] as string;
            const res = await fetch(
              `${API_URL}/data/records/${schemaName}/${name}`,
              { headers }
            );
            return await res.json();
          }
          if (cmd === 'getAll') {
            const res = await fetch(`${API_URL}/data/records/${schemaName}`, {
              headers,
            });
            return await res.json();
          }
          if (cmd === 'insert' || cmd === 'update') {
            const data = args[1] as Record<string, unknown>;
            const res = await fetch(`${API_URL}/data/records/${schemaName}`, {
              method: 'POST',
              headers,
              body: JSON.stringify(data),
            });
            const result = await res.json();
            return result.record || result;
          }
          if (cmd === 'delete') {
            const name = args[1] as string;
            await fetch(`${API_URL}/data/records/${schemaName}/${name}`, {
              method: 'DELETE',
              headers,
            });
            return true;
          }
        } catch (e) {
          console.error('Unified DB Error:', e);
          return null;
        }
      }
      return null;
    },
  };
}

// biome-ignore lint/suspicious/noExplicitAny: Legacy IPC bridge
const ipc = (window as any).ipc;

(async () => {
  try {
    const language = fyo.config.get('language') as string;
    if (language) {
      await setLanguageMap(language);
    }
    fyo.store.language = language || 'English';

    if (!isWeb && ipc.registerListener) {
      registerIpcRendererListeners();
    }

    console.log('--- CALLING ipc.getEnv() ---');
    const env = await ipc.getEnv();
    console.log('--- getEnv() RESPONSE:', JSON.stringify(env), '---');
    const { isDevelopment, platform, version } = env;

    fyo.store.isDevelopment = isDevelopment;
    fyo.store.appVersion = version;
    fyo.store.platform = platform;
    const platformName = platform === 'win32' ? 'Windows' : 'Linux';

    const app = createApp({
      template: '<App/>',
    });
    setErrorHandlers(app);

    app.use(router);
    app.component('App', App);
    app.component('FeatherIcon', FeatherIcon);
    app.component('Badge', Badge);
    app.directive('on-outside-click', outsideClickDirective);
    app.mixin({
      computed: {
        fyo() {
          return fyo;
        },
        platform() {
          return platformName;
        },
      },
      methods: {
        t: fyo.t,
        T: fyo.T,
      },
    });
    await fyo.telemetry.logOpened();
    app.mount('body');
  } catch (err) {
    console.error('CRITICAL RENDERER ERROR:', err);
    // biome-ignore lint/suspicious/noExplicitAny: Legacy IPC bridge
    if ((window as any).ipc) {
      (window as any).ipc.sendError(JSON.stringify({
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        url: window.location.href,
        isDevelopment: true
      }));
    }
  }
})();

function setErrorHandlers(app: VueApp) {
  app.config.errorHandler = (err, _vm, info) => {
    console.error('Unified App Error:', err, info);
  };
}
