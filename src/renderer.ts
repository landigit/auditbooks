import './ipc';
import { CUSTOM_EVENTS } from 'utils/messages';
import { UnexpectedLogObject } from 'utils/types';
import { App as VueApp, createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import Badge from './components/Badge.vue';
import LucideIcon from './components/LucideIcon.vue';
import { handleError, sendError } from './errorHandling';
import { fyo, ipc } from './initFyo';
import { outsideClickDirective } from './renderer/helpers';
import registerIpcRendererListeners from './renderer/registerIpcRendererListeners';
import router from './router';
import { stringifyCircular } from './utils';
import { setLanguageMap } from './utils/language';
import { useAppStore } from './stores/app';

// Click-to-Tap Polyfill for WebView (supports both mouse clicks and touch events)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let lastTouchTapTime = 0;

  const triggerTap = (
    target: HTMLElement,
    originalEvent: Event,
    isTouch: boolean
  ) => {
    const now = Date.now();
    if (!isTouch && now - lastTouchTapTime < 400) {
      // Prevent double tap: ignore mouse clicks that follow touch taps
      return;
    }
    if (isTouch) {
      lastTouchTapTime = now;
    }

    const tapEvent = new CustomEvent('tap', {
      bubbles: true,
      cancelable: true,
      detail: originalEvent,
    });
    target.dispatchEvent(tapEvent);
    if (tapEvent.defaultPrevented) {
      originalEvent.preventDefault();
    }
  };

  // 1. Mouse Click Listener (Desktop & fallback)
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        triggerTap(target, e, false);
      }
    },
    { capture: true }
  );

  // 2. Touch Event Listener (Mobile / Touchscreen)
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'touchend',
    (e) => {
      if (e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const dt = Date.now() - touchStartTime;

        // If finger moved less than 15px and tap was under 300ms, it's a tap
        if (Math.abs(dx) < 15 && Math.abs(dy) < 15 && dt < 300) {
          const target = e.target as HTMLElement | null;
          if (target) {
            triggerTap(target, e, true);
          }
        }
      }
    },
    { capture: true }
  );
}

// oxlint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  // Load persisted configs from Tauri store
  await ipc.store.load?.();

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
      isTauri() {
        return true;
      },
      isLynx() {
        return false;
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
    // oxlint-disable-next-line @typescript-eslint/no-floating-promises
    handleError(true, error, { message, source, lineno, colno });
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    let error: Error;
    if (event.reason instanceof Error) {
      error = event.reason;
    } else {
      error = new Error(String(event.reason));
    }
    // oxlint-disable-next-line no-console
    handleError(true, error).catch((err) => console.error(err));
  };

  window.addEventListener(CUSTOM_EVENTS.LOG_UNEXPECTED, (event) => {
    const details = (event as CustomEvent)?.detail as UnexpectedLogObject;
    // oxlint-disable-next-line @typescript-eslint/no-floating-promises
    sendError(details);
  });

  app.config.errorHandler = (err, vm, info) => {
    const more: Record<string, unknown> = { info };
    if (vm) {
      const { fullPath, params } = vm.$route;
      more.fullPath = fullPath;
      more.params = stringifyCircular(params ?? {});
      more.props = stringifyCircular(vm.$props ?? {}, true, true);
    }
    // oxlint-disable-next-line @typescript-eslint/no-floating-promises
    handleError(false, err as Error, more);
    // oxlint-disable-next-line no-console
    console.error(err, vm, info);
  };
}
