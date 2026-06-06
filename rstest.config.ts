import { defineConfig } from '@rstest/core';
import { pluginVue } from '@rsbuild/plugin-vue';

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
  // Use Node environment for server-side tests (models, fyo, backend)
  // Use jsdom for Vue component tests (src/tests)
  globals: true,

  // Setup file applied to every test suite
  setupFiles: ['./tests/rstest-setup.ts'],

  // Override environment per directory
  environmentOptions: {},

  testEnvironment: 'node',

  // Test file patterns
  include: [
    'backend/**/*.spec.ts',
    'dummy/**/*.spec.ts',
    'fyo/**/*.spec.ts',
    'models/**/*.spec.ts',
    'schemas/**/*.spec.ts',
    'tests/**/*.spec.ts',
    'src/**/*.spec.ts',
  ],

  // Resolve TypeScript paths matching tsconfig.json
  resolve: {
    alias: {
      'src/': './src/',
      'fyo/': './fyo/',
      'schemas/': './schemas/',
      'backend/': './backend/',
      'regional/': './regional/',
      'fixtures/': './fixtures/',
      'reports/': './reports/',
      'models/': './models/',
      'utils/': './utils/',
      'dummy/': './dummy/',
      'main/': './main/',
    },
  },
});
