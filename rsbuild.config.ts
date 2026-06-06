import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';
import path from 'path';

let port = 6969;
let host = '127.0.0.1'; // Changed from 0.0.0.0 — don't expose to LAN
if (process.env.VITE_PORT && process.env.VITE_HOST) {
  port = Number(process.env.VITE_PORT);
  host = process.env.VITE_HOST;
}

export default defineConfig({
  plugins: [
    pluginVue({
      vueLoaderOptions: {
        compilerOptions: {
          isCustomElement: (tag) => ['view', 'text', 'image'].includes(tag),
        },
      },
    }),
  ],

  source: {
    entry: {
      index: './src/renderer.ts',
    },
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
      fyo: path.resolve(__dirname, './fyo'),
      src: path.resolve(__dirname, './src'),
      schemas: path.resolve(__dirname, './schemas'),
      backend: path.resolve(__dirname, './backend'),
      models: path.resolve(__dirname, './models'),
      utils: path.resolve(__dirname, './utils'),
      regional: path.resolve(__dirname, './regional'),
      reports: path.resolve(__dirname, './reports'),
      dummy: path.resolve(__dirname, './dummy'),
      fixtures: path.resolve(__dirname, './fixtures'),
    },
  },
  html: {
    template: './src/index.html',
  },
  server: {
    host,
    port,
    strictPort: true,
  },
  output: {
    distPath: {
      root: 'dist',
    },
    sourceMap: {
      js: 'source-map',
      css: true,
    },
    copy: [
      {
        from: path.resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm'),
        to: path.resolve(__dirname, 'dist/sql-wasm.wasm'),
      },
    ],
  },
  performance: {
    chunkSplit: {
      strategy: 'custom',
      splitChunks: {
        cacheGroups: {
          vue: {
            name: 'vendor-vue',
            test: /node_modules\/(vue|vue-router)/,
          },
          editor: {
            name: 'vendor-editor',
            test: /node_modules\/(codemirror|lezer)/,
          },
          utils: {
            name: 'vendor-utils',
            test: /node_modules\/(luxon|pesa)/,
          },
          vendor: {
            name: 'vendor',
            test: /node_modules/,
          },
        },
      },
    },
  },
});
