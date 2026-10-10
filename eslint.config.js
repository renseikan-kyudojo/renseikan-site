// ESLint flat config: TypeScript and Astro files in src/, sanity/ and api/. The vanilla ink libraries in public/ are
// left alone (they predate this config and are being moved under src/ in the modernization pass).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

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
);
