import './ipc-polyfill';
import { CUSTOM_EVENTS } from 'utils/messages';
import { UnexpectedLogObject } from 'utils/types';
import { App as VueApp, createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import Badge from './components/Badge.vue';
import LucideIcon from './components/LucideIcon.vue';
import { handleError, sendError } from './errorHandling';
import { fyo } from './initFyo';
import { outsideClickDirective } from './renderer/helpers';
import registerIpcRendererListeners from './renderer/registerIpcRendererListeners';
import router from './router';
import { stringifyCircular } from './utils';
import { setLanguageMap } from './utils/language';
import { useAppStore } from './stores/app';

// Click to Tap Polyfill for Web Browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tapEvent = new CustomEvent('tap', {
          bubbles: true,
          cancelable: true,
          detail: e,
        });
        target.dispatchEvent(tapEvent);
        if (tapEvent.defaultPrevented) {
          e.preventDefault();
        }
      }
    },
    { capture: true }
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  const appStore = useAppStore();
  const fyoProps = [
    'isDevelopment',
    'skipTelemetryLogging',
    'appVersion',
    'platform',
    'language',
    'instanceId',
    'deviceId',
    'openCount',
    'appFlags',
    'reports',
  ];

  for (const prop of fyoProps) {
    Object.defineProperty(fyo, prop, {
      get: () => Reflect.get(appStore, prop),
      set: (val) => Reflect.set(appStore, prop, val),
      configurable: true,
    });
  }

  const language = fyo.config.get('language') as string;
  if (language) {
    await setLanguageMap(language);
  }
  appStore.language = language || 'English';

  registerIpcRendererListeners();
  const { isDevelopment, platform, version } = await ipc.getEnv();

  appStore.isDevelopment = isDevelopment;
  appStore.appVersion = version;
  appStore.setPlatform(platform);
  getPlatformName(platform);

  setOnWindow(isDevelopment);

  appStore.reports = {} as any;
  appStore.skipTelemetryLogging = false;
  setErrorHandlers(app);

  app.use(router);
  app.component('LucideIcon', LucideIcon);
  app.component('FeatherIcon', LucideIcon);
  app.component('Badge', Badge);
  app.directive('on-outside-click', outsideClickDirective);
  app.mixin({
    computed: {
      fyo() {
        return fyo;
      },
      platform() {
        return appStore.platform;
      },
    },
    methods: {
      t: fyo.t,
      T: fyo.T,
    },
  });

  await fyo.telemetry.logOpened();
  app.mount('#app');
})();

function setErrorHandlers(app: VueApp) {
  window.onerror = (message, source, lineno, colno, error) => {
    if (
      typeof message === 'string' &&
      message.includes('ResizeObserver loop')
    ) {
      return;
    }
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
  if (!isDevelopment) {
    return;
  }

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
