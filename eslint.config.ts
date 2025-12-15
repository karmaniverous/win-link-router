import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import prettierPlugin from 'eslint-plugin-prettier';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    ignores: [
      '**/node_modules/**',
      '**/*.d.ts',
      '.stan/**',
      '.vite/**',
      'coverage/**',
      'dist/**',
      'out/**',
    ],
  },
  eslint.configs.recommended,
  {
    // Formatting + import ordering for all JS/TS files in the repo (not just
    // src/). This covers config/tooling code as well.
    files: ['**/*.{js,jsx,cjs,mjs,ts,tsx,cts,mts}'],
    plugins: {
      import: importPlugin,
      prettier: prettierPlugin,
      'simple-import-sort': simpleImportSortPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // Enforce Prettier formatting via ESLint.
      'prettier/prettier': 'error',

      // Deterministic import ordering.
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    // Enable type-aware linting for TS files (required by strictTypeChecked).
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
  },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    rules: {
      // TypeScript owns undefined-variable checks.
      'no-undef': 'off',

      // Use TS equivalents instead of core rules for TS files.
      'no-restricted-imports': 'off',
      'no-unused-vars': 'off',

      'prettier/prettier': 'error',
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': 'error',

      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-restricted-imports': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],

      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },
  {
    files: [
      'eslint.config.ts',
      'forge.config.ts',
      'vite.*.config.ts',
      '**/*.{config,conf}.{js,cjs,mjs,ts,cts,mts}',
      'src/main.ts',
      'src/preload.ts',
    ],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['src/renderer.ts', 'src/**/*.tsx'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // Must be last: disables ESLint rules that conflict with Prettier.
  eslintConfigPrettier,
]);
