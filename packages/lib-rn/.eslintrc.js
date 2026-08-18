module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['@react-native/eslint-config', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['lib/', 'node_modules/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
};


