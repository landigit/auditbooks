import vue from '@vitejs/plugin-vue';
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
  let host = 'localhost';
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
    },
    optimizeDeps: {
      exclude: ['electron'],
    },
    root: path.resolve(__dirname, './src'),
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
