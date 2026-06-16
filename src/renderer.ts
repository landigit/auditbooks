import { invoke } from '@tauri-apps/api/core';
import { CUSTOM_EVENTS } from 'utils/messages';
import { UnexpectedLogObject } from 'utils/types';
import { App as VueApp, createApp } from 'vue';
import App from './App.vue';
import Badge from './components/Badge.vue';
import FeatherIcon from './components/FeatherIcon.vue';
import { handleError, sendError } from './errorHandling';
import { fyo } from './initFyo';
import { outsideClickDirective } from './renderer/helpers';
import router from './router';
import { stringifyCircular } from './utils';
import { setLanguageMap } from './utils/language';
import { createPinia } from 'pinia';

// Kick off all IPC calls at module-evaluation time — before the IIFE even
// awaits. JS hoists function declarations so getTauriPlatform/Version are
// already callable here, and fyo.config is ready from its import.
const _startupReady = Promise.all([
  fyo.config.initAsync(),
  getTauriPlatform(),
  getTauriVersion(),
]);

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  // All 4 IPC calls were already in-flight by the time this line runs.
  const [, platform, version] = await _startupReady;

  const language = fyo.config.get('language') as string;
  fyo.store.language = language || 'English';

  const isDevelopment = import.meta.env.DEV ?? false;
  fyo.store.isDevelopment = isDevelopment;
  fyo.store.appVersion = version;
  fyo.store.platform = platform;
  const platformName = getPlatformName(platform);

  setOnWindow(isDevelopment);

  const app = createApp({
    template: '<App/>',
  });
  setErrorHandlers(app);

  app.use(createPinia());
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

  // Mount first — this is what triggers LCP. Everything after is non-critical.
  app.mount('body');

  // Run post-paint tasks asynchronously so they never block the first render.
  Promise.all([
    language ? setLanguageMap(language) : Promise.resolve(),
    fyo.telemetry.logOpened(),
  ]).catch(console.error);
})();

async function getTauriPlatform(): Promise<string> {
  try {
    return await invoke<string>('get_platform');
  } catch {
    // Fallback: detect from user agent
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'win32';
    if (ua.includes('mac')) return 'darwin';
    return 'linux';
  }
}

async function getTauriVersion(): Promise<string> {
  try {
    return await invoke<string>('get_version');
  } catch {
    return '0.1.0';
  }
}

function setErrorHandlers(app: VueApp) {
  window.onerror = (message, source, lineno, colno, error) => {
    error = error ?? new Error('triggered in window.onerror');
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    handleError(true, error, { message, source, lineno, colno });
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    let error: Error;
    if (event.reason instanceof Error) {
      error = event.reason;
    } else {
      error = new Error(String(event.reason));
    }

    // eslint-disable-next-line no-console
    handleError(true, error).catch((err) => console.error(err));
  };

  window.addEventListener(CUSTOM_EVENTS.LOG_UNEXPECTED, (event) => {
    const details = (event as CustomEvent)?.detail as UnexpectedLogObject;
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    sendError(details);
  });

  app.config.errorHandler = (err, vm, info) => {
    const more: Record<string, unknown> = {
      info,
    };

    if (vm) {
      const { fullPath, params } = vm.$route;
      more.fullPath = fullPath;
      more.params = stringifyCircular(params ?? {});
      more.props = stringifyCircular(vm.$props ?? {}, true, true);
    }

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    handleError(false, err as Error, more);
    // eslint-disable-next-line no-console
    console.error(err, vm, info);
  };
}

function setOnWindow(isDevelopment: boolean) {
  // @ts-ignore
  window.router = router;
  // @ts-ignore
  window.fyo = fyo;
}

function getPlatformName(platform: string) {
  switch (platform) {
    case 'win32':
      return 'Windows';
    case 'darwin':
      return 'Mac';
    case 'linux':
      return 'Linux';
    default:
      return 'Linux';
  }
}
