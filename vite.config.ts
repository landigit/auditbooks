import path from 'node:path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

const alias = {
  vue: 'vue/dist/vue.esm-bundler.js',
  fyo: path.resolve(__dirname, './fyo'),
  src: path.resolve(__dirname, './src'),
  main: path.resolve(__dirname, './main'),
  schemas: path.resolve(__dirname, './schemas'),
  backend: path.resolve(__dirname, './backend'),
  models: path.resolve(__dirname, './models'),
  utils: path.resolve(__dirname, './utils'),
  regional: path.resolve(__dirname, './regional'),
  reports: path.resolve(__dirname, './reports'),
  dummy: path.resolve(__dirname, './dummy'),
  fixtures: path.resolve(__dirname, './fixtures'),
};

export default defineConfig({
  root: path.resolve(__dirname, './src'),
  plugins: [
    vue(),
    electron([
      {
        // Main-process entry file of the Electron App.
        entry: path.resolve(__dirname, 'main.ts'),
        vite: {
          resolve: { alias },
          build: {
            outDir: path.resolve(__dirname, 'dist-electron'),
            sourcemap: true,
            minify: false,
            rollupOptions: {
              external: ['electron', 'better-sqlite3', 'bree', 'knex'],
            },
          },
        },
      },
      {
        entry: path.resolve(__dirname, 'main/preload.ts'),
        vite: {
          resolve: { alias },
          build: {
            outDir: path.resolve(__dirname, 'dist-electron/main'),
            sourcemap: true,
            minify: false,
          },
        },
      },
    ]),
    renderer(),
  ],
  server: {
    host: process.env.VITE_HOST || '127.0.0.1',
    port: Number(process.env.VITE_PORT) || 6969,
    strictPort: true,
  },
  resolve: {
    alias,
  },
  build: {
    outDir: path.resolve(__dirname, './dist'),
    emptyOutDir: true,
  },
});
