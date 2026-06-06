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

export default defineConfig({
  source: {
    define: {
      'process.env.BACKEND_IP': JSON.stringify(getLocalIP()),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      fyo: path.resolve(__dirname, '../fyo'),
      src: path.resolve(__dirname, '../src'),
      schemas: path.resolve(__dirname, '../schemas'),
      backend: path.resolve(__dirname, '../backend'),
      models: path.resolve(__dirname, '../models'),
      utils: path.resolve(__dirname, '../utils'),
      regional: path.resolve(__dirname, '../regional'),
      reports: path.resolve(__dirname, '../reports'),
      dummy: path.resolve(__dirname, '../dummy'),
      fixtures: path.resolve(__dirname, '../fixtures'),
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
