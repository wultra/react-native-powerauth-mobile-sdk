module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['@react-native/eslint-config', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['node_modules/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off'
  },
  overrides: [
    {
      files: ['metro.config.js', 'react-native.config.js', 'babel.config.js'],
      env: { node: true },
      parserOptions: { sourceType: 'script' },
      rules: {
        '@typescript-eslint/no-require-imports': 'off'
      }
    }
  ]
};
