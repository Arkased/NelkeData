import eslint from '@eslint/js';
import astro from 'eslint-plugin-astro';
import jsdoc from 'eslint-plugin-jsdoc';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/',
      '**/dist-tsc/',
      '**/.astro/',
      '**/test-results/',
      'extracted/',
      'output/',
      'node_modules/',
      '.claude/',
      'prototype/',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  ...astro.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['vitest.config.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/array-type': ['error', { default: 'array' }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'max-params': ['error', 4],
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/__tests__/**', 'vitest.config.ts'],
    ...jsdoc.configs['flat/recommended-typescript-error'],
    rules: {
      ...jsdoc.configs['flat/recommended-typescript-error'].rules,
      'jsdoc/require-jsdoc': [
        'error',
        { publicOnly: true, require: { FunctionDeclaration: true, ClassDeclaration: true, ArrowFunctionExpression: false } },
      ],
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/check-tag-names': ['error', { definedTags: ['sideEffects'] }],
      'jsdoc/require-description': 'error',
      'jsdoc/require-throws': 'error',
      'jsdoc/no-types': 'error',
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
      'jsdoc/require-template': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.astro'],
    ...tseslint.configs.disableTypeChecked,
  },
);
