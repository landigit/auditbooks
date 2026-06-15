import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import prettier from 'eslint-plugin-prettier/recommended';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  prettier,
  {
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'warn',
      'no-debugger': 'warn',
      'arrow-body-style': 'off',
      'prettier/prettier': 'off',
      'prefer-arrow-callback': 'warn',
      'vue/no-mutating-props': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-useless-template-attributes': 'off',
      'vue/one-component-per-file': 'off',
      'vue/no-reserved-component-names': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-types': 'off',
      'no-case-declarations': 'off',
      'no-empty': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-unreachable': 'off',
      'no-extra-boolean-cast': 'off',
      'no-useless-escape': 'off',
      'no-constant-binary-expression': 'off',
      'no-sparse-arrays': 'off',
      'no-fallthrough': 'off',
      'no-prototype-builtins': 'off',
      'no-unsafe-optional-chaining': 'off',
      'no-useless-catch': 'off',
      'prefer-const': 'off',
      'no-unsafe-finally': 'off',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    ignores: [
      '*.mjs',
      'eslint.config.mjs',
      'uitest/**',
      'tailwind.config.js',
      'node_modules/**',
      '*.spec.ts',
      'vite.config.ts',
      'vitest.config.ts',
      'postcss.config.js',
      'src/components/**/*.vue',
      'src-tauri/**',
      'dist/**',
      'gen/**',
      'src/dist/**',
      'scratch/**',
    ],
  }
);
