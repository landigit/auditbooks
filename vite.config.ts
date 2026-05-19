import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * This vite config file is used only for dev mode, i.e.
 * to create a serve build modules of the source code
 * which will be rendered by electron.
 *
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
    server: {
      host,
      port,
      strictPort: true,
      watch: {
        ignored: ['**/node_modules/**', '**/dist_electron/**'],
      },
    },
    build: {
      target: 'esnext',
      sourcemap: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('vue') || id.includes('router')) {
                return 'vendor-vue';
              }
              if (id.includes('codemirror') || id.includes('lezer')) {
                return 'vendor-editor';
              }
              if (id.includes('luxon') || id.includes('pesa')) {
                return 'vendor-utils';
              }
              return 'vendor';
            }
          },
        },
      },
    },
    optimizeDeps: {
      exclude: ['electron', 'sql.js', '@libsql/client'],
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
      alias: {
        '@libsql/client': path.resolve(__dirname, './src/renderer/mocks/libsql-client.ts'),
        'fs/promises': path.resolve(__dirname, './src/renderer/mocks/fs.ts'),
        fs: path.resolve(__dirname, './src/renderer/mocks/fs.ts'),
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
  });
};
