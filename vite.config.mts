import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * This vite config file is used only for dev mode, i.e.
 * to create a serve build modules of the source code
 * which will be rendered by Tauri.
 *
 * For building the project, vite is used programmatically
 * see tauri build commands for details.
 */
export default () => {
  let port = 6969;
  let host = process.env.TAURI_DEV_HOST || '127.0.0.1';
  if (process.env.VITE_PORT && process.env.VITE_HOST) {
    port = Number(process.env.VITE_PORT);
    host = process.env.VITE_HOST;
  }

  return defineConfig({
    server: {
      host,
      port,
      strictPort: true,
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**'],
      },
      // Pre-transform critical entry modules after the server starts.
      // Vite will have them in its transform cache before the browser
      // first requests them, avoiding the on-demand compilation delay.
      warmup: {
        clientFiles: [
          './renderer.ts',
          './App.vue',
          './initFyo.ts',
          './router.ts',
          './pages/Desk.vue',
          './pages/DatabaseSelector.vue',
          './styles/index.css',
        ],
      },
    },

    build: {
      outDir: path.resolve(import.meta.dirname, './src/dist'),
      target: 'esnext',
      sourcemap: true,
      cssCodeSplit: true,
      cssMinify: 'lightningcss',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('vue') ||
                id.includes('pinia') ||
                id.includes('vue-router')
              ) {
                return 'vendor-vue';
              }
              if (id.includes('lodash') || id.includes('luxon')) {
                return 'vendor-utils';
              }
              if (id.includes('pdfmake')) {
                return 'vendor-pdfmake';
              }
            }
          },
        },
      },
    },
    esbuild: {
      supported: {
        destructuring: true,
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        supported: {
          destructuring: true,
        },
      },
    },
    root: path.resolve(import.meta.dirname, './src'),
    plugins: [
      vue({
        script: {
          defineModel: true,
          propsDestructure: true,
        },
      }),
    ],
    resolve: {
      alias: {
        vue: 'vue/dist/vue.esm-bundler.js',
        fyo: path.resolve(import.meta.dirname, './fyo'),
        src: path.resolve(import.meta.dirname, './src'),
        schemas: path.resolve(import.meta.dirname, './schemas'),
        backend: path.resolve(import.meta.dirname, './backend'),
        models: path.resolve(import.meta.dirname, './models'),
        utils: path.resolve(import.meta.dirname, './utils'),
        regional: path.resolve(import.meta.dirname, './regional'),
        reports: path.resolve(import.meta.dirname, './reports'),
        dummy: path.resolve(import.meta.dirname, './dummy'),
        fixtures: path.resolve(import.meta.dirname, './fixtures'),
      },
    },
  });
};
