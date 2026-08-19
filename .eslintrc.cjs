module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['@react-native/eslint-config', 'plugin:@typescript-eslint/recommended', 'prettier'],
  ignorePatterns: ['**/.build/**', '**/build/**', '**/lib/**', '**/node_modules/**'],
  settings: {
    react: {
      version: '19.0',
    },
  },
  overrides: [
    {
      files: [
        'packages/lib-cordova/src/internal/NativeCordovaModule.ts',
        'packages/lib-cordova/src/internal/NativeModulesProvider.ts',
        'packages/lib-cordova/src/internal/NativePowerAuth.ts',
        'packages/lib-cordova/src/internal/Utils.ts',
      ],
      rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
      },
    },
    {
      files: [
        'packages/lib-shared/js/**/*.ts',
        'packages/lib-cordova/src/internal/NativeCordovaModule.ts',
        'packages/lib-cordova/src/internal/NativeModulesProvider.ts',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: [
        '.eslintrc.cjs',
        'rollup.config.js',
        'packages/lib-rn/react-native.config.js',
        'scripts/**/*.mjs',
      ],
      env: {
        node: true,
      },
    },
  ],
};
