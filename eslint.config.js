// ESLint flat config: TypeScript, JavaScript and Astro files in src/, sanity/, api/ and tests/. The ink libraries in
// src/lib/ink predate this config and keep their own style; they are linted for errors only.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/', '.astro/', '.sanity/', 'node_modules/', 'public/', 'tests/.playwright/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  { files: ['src/**/*.js'], languageOptions: { globals: globals.browser } },
  { files: ['tests/**/*.mjs'], languageOptions: { globals: globals.node } },
  {
    files: ['src/lib/ink/*.js', 'src/scripts/home.js'],
    rules: {
      'no-var': 'off',
      'prefer-const': 'off',
      'no-empty': 'off',
      'prefer-rest-params': 'off',
      'no-redeclare': 'off',
      'no-useless-escape': 'off',
      'no-constant-condition': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
