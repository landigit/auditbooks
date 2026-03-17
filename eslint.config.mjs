import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default ts.config(
  {
    ignores: [
      '*.mjs',
      'uitest/**',
      'node_modules/**',
      'dist_electron/**',
      '*.spec.ts',
      'vite.config.ts',
      'postcss.config.js',
      'src/components/**/*.vue', // Incrementally fix these
      'electron-builder.ts',
      'build/**',
      'scripts/**',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  prettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2018,
      },
      parserOptions: {
        parser: ts.parser,
        project: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      'arrow-body-style': 'off',
      'prettier/prettier': 'warn',
      'prefer-arrow-callback': 'warn',
      'vue/no-mutating-props': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-useless-template-attributes': 'off',
      'vue/one-component-per-file': 'off',
      'vue/no-reserved-component-names': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
    },
  },
  {
    files: ['*.vue', '**/*.vue'],
    rules: {
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  }
);
