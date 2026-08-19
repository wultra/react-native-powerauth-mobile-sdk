const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

// Metro 0.83+ enforces package "exports" in `metro-config`, which means our hack import failed. We're filtering manually now.
function escapeForMetroExclusionList(pattern) {
  if (pattern instanceof RegExp) {
    // Convert literal "/" or escaped "\/" into the current OS separator.
    return pattern.source.replace(/\/|\\\//g, '\\' + path.sep);
  } else if (typeof pattern === 'string') {

    // Escape all regex metacharacters so the arbitrary string can be safely injected into RegExp.
    const escaped = pattern.replace(/[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');

    // Normalize "/" to platform separators for Metro's blockList.
    return escaped.replaceAll('/', '\\' + path.sep);
  }
  throw new Error(
    `Expected exclusionList pattern to be RegExp or string, got: ${typeof pattern}`
  );
}

function exclusionList(additionalExclusions) {
  // Default exclusion: any "__tests__" folder subtree.
  const defaults = [/\/__tests__\/.*/];
  // Build a single regex that matches any exclusion entry at the end of the path.
  return new RegExp(
    '(' +
      (additionalExclusions || [])
        .concat(defaults)
        .map(escapeForMetroExclusionList)
        .join('|') +
      ')$'
  );
}

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const root = path.resolve(__dirname, '..');
const sdk = path.resolve(root, 'packages', 'lib-rn');
const sharedSdkSource = path.resolve(root, 'packages', 'lib-shared', 'js');
const sharedSdkEntry = path.join(sharedSdkSource, 'index.ts');
const sharedSdkVersionImporter = path.join(sharedSdkSource, 'PowerAuthUtils.ts');
const stagedSdkVersion = path.join(sdk, 'build', 'rn', 'src', 'internal', 'SDKVersion.ts');
// TODO remove this watcher when/if the packages are fully separated
const testInfraPackages = [
  path.resolve(root, 'packages', 'mobile-testbed'),
  path.resolve(root, 'packages', 'mobile-test-reporter'),
];
const singletons = ['react', 'react-native'];

const config = {
  watchFolders: [sdk, sharedSdkSource, ...testInfraPackages],
  resolver: {
    unstable_enableSymlinks: true,
    unstable_enablePackageExports: true,
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
    resolveRequest: (context, moduleName, platform) => {
      // Bundle editable shared sources directly; the staged package remains the native autolinking root.
      if (moduleName === 'react-native-powerauth-mobile-sdk') {
        return {filePath: sharedSdkEntry, type: 'sourceFile'};
      }
      // SDKVersion is generated during staging and intentionally has no canonical source file.
      if (
        context.originModulePath === sharedSdkVersionImporter &&
        moduleName === './internal/SDKVersion'
      ) {
        return {filePath: stagedSdkVersion, type: 'sourceFile'};
      }
      return context.resolveRequest(context, moduleName, platform);
    },
    // Example: for singletons ['react'], we block "<root>/node_modules/react/**" so Metro resolves only the app copy.
    blockList: exclusionList(
      // Replace both "/" and "\\" so the regex works on all OS path separators.
      singletons.map(m => new RegExp(`^${path.join(root, 'node_modules', m).replace(/[\\/]/g, '[\\/]')}/.*$`))
    ),
    extraNodeModules: singletons.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {}),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
