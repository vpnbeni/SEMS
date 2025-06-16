module.exports = {
  env: {
    browser: false,
    commonjs: true,
    es6: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'airbnb-base'
  ],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'func-names': 'off',
    'no-plusplus': 'off',
    'no-process-exit': 'off',
    'class-methods-use-this': 'off',
    'prefer-destructuring': 'warn',
    'no-param-reassign': 'off',
    'consistent-return': 'off',
    'no-underscore-dangle': 'off',
    'max-len': ['error', { code: 120 }],
    'comma-dangle': ['error', 'never'],
    'object-curly-newline': 'off',
    'newline-per-chained-call': 'off',
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always']
  }
};