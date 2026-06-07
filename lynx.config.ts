import { defineConfig } from '@lynx-js/rspeedy';
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin';
import { pluginVueLynx } from 'vue-lynx/plugin';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function normalizePath(p: string) {
  let resolved = p;
  if (/^[a-z]:/i.test(resolved)) {
    resolved = resolved[0].toUpperCase() + resolved.slice(1);
  }
  return resolved;
}

export default defineConfig({
  source: {
    entry: {
      main: './src/renderer-lynx.ts',
    },
    define: {
      'process.env.BACKEND_IP': JSON.stringify(getLocalIP()),
    },
  },
  resolve: {
    alias: {
      // Stub out web-only components and heavy libraries using absolute path keys to catch all relative/absolute resolves
      [normalizePath(path.resolve(__dirname, './src/router'))]: normalizePath(
        path.resolve(__dirname, './src/router-lynx.ts')
      ),
      [normalizePath(path.resolve(__dirname, './src/initFyo'))]: normalizePath(
        path.resolve(__dirname, './src/initFyo-lynx.ts')
      ),
      [normalizePath(path.resolve(__dirname, './src/utils/interactive'))]:
        normalizePath(
          path.resolve(__dirname, './src/utils/interactive-lynx.ts')
        ),
      [normalizePath(path.resolve(__dirname, './src/pages/Desk.vue'))]:
        normalizePath(
          path.resolve(__dirname, './src/components/Mock-lynx.vue')
        ),
      [normalizePath(path.resolve(__dirname, './src/components/Dialog.vue'))]:
        normalizePath(
          path.resolve(__dirname, './src/components/Mock-lynx.vue')
        ),
      [normalizePath(path.resolve(__dirname, './src/components/Toast.vue'))]:
        normalizePath(
          path.resolve(__dirname, './src/components/Mock-lynx.vue')
        ),
      [normalizePath(
        path.resolve(__dirname, './src/components/LucideIcon.vue')
      )]: normalizePath(
        path.resolve(__dirname, './src/components/Mock-lynx.vue')
      ),
      [normalizePath(path.resolve(__dirname, './src/components/Button.vue'))]:
        normalizePath(
          path.resolve(__dirname, './src/components/Mock-lynx.vue')
        ),
      [normalizePath(path.resolve(__dirname, './src/components/Modal.vue'))]:
        normalizePath(
          path.resolve(__dirname, './src/components/Mock-lynx.vue')
        ),
      [normalizePath(path.resolve(__dirname, './src/components/Loading.vue'))]:
        normalizePath(
          path.resolve(__dirname, './src/components/Mock-lynx.vue')
        ),
      [normalizePath(
        path.resolve(
          __dirname,
          './src/components/Controls/LanguageSelector.vue'
        )
      )]: normalizePath(
        path.resolve(__dirname, './src/components/Mock-lynx.vue')
      ),
      [normalizePath(path.resolve(__dirname, './src/components/ui/index.ts'))]:
        normalizePath(
          path.resolve(__dirname, './src/components/ui/index-mock.ts')
        ),

      // Standard string aliases
      vue: normalizePath(
        path.resolve(__dirname, './src/utils/vue-lynx-wrapper.ts')
      ),
      'src/components/ui': normalizePath(
        path.resolve(__dirname, './src/components/ui/index-mock.ts')
      ),
      'reka-ui': normalizePath(
        path.resolve(__dirname, './src/components/Mock-reka-ui.ts')
      ),
      'src/router': normalizePath(
        path.resolve(__dirname, './src/router-lynx.ts')
      ),
      'src/initFyo': normalizePath(
        path.resolve(__dirname, './src/initFyo-lynx.ts')
      ),
      'src/utils/interactive': normalizePath(
        path.resolve(__dirname, './src/utils/interactive-lynx.ts')
      ),
      '@': normalizePath(path.resolve(__dirname, 'src')),
      fyo: normalizePath(path.resolve(__dirname, './fyo')),
      src: normalizePath(path.resolve(__dirname, './src')),
      schemas: normalizePath(path.resolve(__dirname, './schemas')),
      backend: normalizePath(path.resolve(__dirname, './backend')),
      models: normalizePath(path.resolve(__dirname, './models')),
      utils: normalizePath(path.resolve(__dirname, './utils')),
      regional: normalizePath(path.resolve(__dirname, './regional')),
      reports: normalizePath(path.resolve(__dirname, './reports')),
      dummy: normalizePath(path.resolve(__dirname, './dummy')),
      fixtures: normalizePath(path.resolve(__dirname, './fixtures')),
    },
  },
  environments: {
    lynx: {},
    web: {},
  },
  plugins: [
    pluginQRCode({
      schema(url) {
        // We use `?fullscreen=true` to open the page in LynxExplorer in full screen mode
        return `${url}?fullscreen=true`;
      },
    }),
    pluginVueLynx({
      optionsApi: false,
      enableCSSInlineVariables: true,
      enableCSSInheritance: true,
    }),
  ],
});
