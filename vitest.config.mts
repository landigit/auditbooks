import vue from '@vitejs/plugin-vue';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/tests/setup.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],
  },
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
      tests: path.resolve(import.meta.dirname, './tests'),
    },
  },
});
