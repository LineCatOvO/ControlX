import nodeConfig from '@controlx/eslint-config/node.js';

export default [
  ...nodeConfig,
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'src/**/*.test.ts'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];
