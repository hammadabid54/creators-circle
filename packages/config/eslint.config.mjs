import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['node_modules/**', '.next/**', 'dist/**', '.expo/**', '.turbo/**'],
  },
];
