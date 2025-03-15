const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['dist/**/*', 'node_modules/**/*'],
  },
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    files: ['**/*.js'],
    rules: {
      ...js.configs.recommended.rules,
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'indent': ['error', 2],
      'no-unused-vars': 'warn',
    },
  },
];
