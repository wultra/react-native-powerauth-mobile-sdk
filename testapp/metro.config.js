const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const root = path.resolve(__dirname, '..');
const sdk = path.resolve(root, 'packages', 'react-native-powerauth-mobile-sdk');
const singletons = ['react', 'react-native'];

const config = {
  watchFolders: [sdk],
  resolver: {
    unstable_enableSymlinks: true,
    enablePackageExports: true,
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
    blacklistRE: exclusionList(
      singletons.map(m => new RegExp(`^${path.join(root, 'node_modules', m).replace(/[\\/]/g, '[\\/]')}\/.*$`))
    ),
    extraNodeModules: singletons.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
