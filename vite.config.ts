import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * This vite config file is used only for dev mode, i.e.
 * to create a serve build modules of the source code.
 * For building the project, vite is used programmatically
 * see build/scripts/build.mjs for this.
 */
export default () => {
  let port = 6969;
  let host = '127.0.0.1'; // Changed from 0.0.0.0 — don't expose to LAN
  if (process.env.VITE_PORT && process.env.VITE_HOST) {
    port = Number(process.env.VITE_PORT);
    host = process.env.VITE_HOST;
  }

  return defineConfig({
    base: './',
    clearScreen: false,
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    server: {
      host,
      port,
      strictPort: true,
      watch: {
        ignored: ['**/node_modules/**', '**/src-tauri/**'],
      },
    },
    build: {
      outDir: path.resolve(__dirname, './dist'),
      emptyOutDir: true,
      target: 'esnext',
      sourcemap: true,
      minify: 'esbuild',
      cssMinify: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('vue') || id.includes('vue-router')) {
                return 'vendor-vue';
              }
              if (id.includes('codemirror') || id.includes('lezer')) {
                return 'vendor-editor';
              }
              if (id.includes('kysely')) {
                return 'vendor-kysely';
              }
              if (id.includes('reka-ui') || id.includes('reka')) {
                return 'vendor-ui';
              }
              if (id.includes('pinia')) {
                return 'vendor-pinia';
              }
              if (id.includes('dayjs')) {
                return 'vendor-dayjs';
              }
              if (id.includes('pesa') || id.includes('luxon')) {
                return 'vendor-utils';
              }
              return 'vendor';
            }
          },
        },
      },
    },

    root: path.resolve(__dirname, './src'),
    plugins: [
      tailwindcss(),
      vue({
        script: {
          defineModel: true,
          propsDestructure: true,
        },
      }),
    ],
    resolve: {
      dedupe: ['@codemirror/state', '@codemirror/view', '@codemirror/language'],
      alias: {
        vue: 'vue/dist/vue.esm-bundler.js',
        fyo: path.resolve(__dirname, './src/fyo'),
        src: path.resolve(__dirname, './src'),
        schemas: path.resolve(__dirname, './src/schemas'),
        backend: path.resolve(__dirname, './backend'),
        models: path.resolve(__dirname, './src/models'),
        utils: path.resolve(__dirname, './src/utils/core'),
        regional: path.resolve(__dirname, './regional'),
        reports: path.resolve(__dirname, './src/reports'),
        dummy: path.resolve(__dirname, './dummy'),
        fixtures: path.resolve(__dirname, './fixtures'),
      },
    },
  });
};
