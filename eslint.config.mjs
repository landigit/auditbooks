import js from '@eslint/js';
import tsEslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import pluginPrettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';

export default tsEslint.config(
  {
    ignores: [
      '*.mjs',
      'uitest/**',
      'tailwind.config.js',
      'node_modules/**',
      'dist_electron/**',
      '**/*.spec.ts',
      'vite.config.ts',
      'postcss.config.js',
      'src/components/**/*.vue',
      'electron-builder.ts',
      '.eslintrc.js',
    ],
  },
  js.configs.recommended,
  ...tsEslint.configs.recommendedTypeChecked,
  ...pluginVue.configs['flat/recommended'],
  pluginPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parser: vueParser,
      parserOptions: {
        parser: tsEslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      'arrow-body-style': 'off',
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
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-useless-escape': 'warn',
    },
  },
  {
    files: ['**/*.vue'],
    rules: {
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  }
);
