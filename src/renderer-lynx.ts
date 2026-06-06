import './ipc-lynx.js';
import { createApp } from 'vue-lynx';
import { createPinia } from 'pinia';
import App from './App-lynx.vue';
import { fyo } from './initFyo';
import { useAppStore } from './stores/app';

(async () => {
  try {
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

    // Set environment details from native env fetch
    const { isDevelopment, platform, version } = await ipc.getEnv();
    appStore.isDevelopment = isDevelopment;
    appStore.appVersion = version;
    appStore.setPlatform(platform);

    app.mount();
  } catch (err) {
    console.error(
      '[Lynx Renderer Error]: Failed to bootstrap Vue Lynx app:',
      err
    );
  }
})();
