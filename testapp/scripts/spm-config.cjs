/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS tooling. */
// A persisted CLI config command keeps Xcode's automatic SPM resync on ios-spm.
// Shell environment variables alone would be lost when opening Xcode directly.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const result = spawnSync(
  process.execPath,
  [path.join(path.dirname(require.resolve('react-native/package.json')), 'cli.js'), 'config'],
  {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, POWERAUTH_TESTAPP_IOS_SPM: '1' },
    stdio: 'inherit',
  },
);
if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
