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
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
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
      // TypeScript owns undefined-variable checks.
      'no-undef': 'off',

      // Enforce Prettier formatting via ESLint.
      'prettier/prettier': 'error',

      // Deterministic import ordering.
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // House rules: prefer underscore for intentionally-unused vars/args.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Keep type-only imports explicit and consistent.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },
  {
    files: [
      'forge.config.ts',
      'vite.*.config.ts',
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
