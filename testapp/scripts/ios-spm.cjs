/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS tooling. */
// Generate an isolated native consumer of the SDK's real SwiftPM manifest.
// The JavaScript app and native source template are shared with the pod app.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { normalizePlatform } = require('./spm-platform.cjs');

const appRoot = path.resolve(__dirname, '..');
const fixtureRoot = path.join(appRoot, 'ios-spm');
const projectPath = path.join(fixtureRoot, 'testapp.xcodeproj');
const derivedData = path.join(fixtureRoot, 'DerivedData');
const bundleId = 'com.wultra.reactnative.test.spm';
const layout = require('../../scripts/build-layout.cjs');
const args = process.argv.slice(2);
const action = args.shift() ?? 'prepare';

function run(command, argv, options = {}) {
  const result = spawnSync(command, argv, {
    cwd: fixtureRoot,
    env: process.env,
    stdio: 'inherit',
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status ?? result.signal}).`);
  }
  return result.stdout;
}

function copyNativeTemplate() {
  fs.mkdirSync(projectPath, { recursive: true });
  for (const relative of [
    'testapp',
    '.xcode.env',
    'Podfile',
    'testapp.xcodeproj/project.pbxproj',
    'testapp.xcodeproj/xcshareddata/xcschemes/testapp.xcscheme',
  ]) {
    fs.cpSync(path.join(appRoot, 'ios', relative), path.join(fixtureRoot, relative), {
      recursive: true,
    });
  }
  // Reset only generated integration metadata when refreshing the native template.
  fs.rmSync(path.join(projectPath, '.spm-injected.json'), { force: true });
  const pbxproj = path.join(projectPath, 'project.pbxproj');
  fs.writeFileSync(
    pbxproj,
    fs
      .readFileSync(pbxproj, 'utf8')
      .replaceAll(
        'PRODUCT_BUNDLE_IDENTIFIER = com.wultra.reactnative.test;',
        `PRODUCT_BUNDLE_IDENTIFIER = ${bundleId};`,
      ),
  );
  run('/usr/libexec/PlistBuddy', [
    '-c',
    'Set :CFBundleDisplayName PowerAuth SPM',
    path.join(fixtureRoot, 'testapp/Info.plist'),
  ]);
}


function preserveMinimumPlatform(reactNativeRoot) {
  const { findObjectByUuid, findField, setScalarField, quoteIfNeeded } = require(
    path.join(reactNativeRoot, 'scripts/spm/spm-pbxproj.js'),
  );
  const pbxproj = path.join(projectPath, 'project.pbxproj');
  let project = fs.readFileSync(pbxproj, 'utf8');
  const phaseMatch = project.match(/([A-F0-9]{24}) \/\* Sync SPM Autolinking \*\/ = \{/);
  if (!phaseMatch) {
    throw new Error('React Native did not generate the expected SPM sync build phase.');
  }
  const phase = findObjectByUuid(project, phaseMatch[1]);
  const field = findField(project, phase, 'shellScript');
  const script = JSON.parse(field.value);
  const normalize = '\n"$NODE_BINARY" "$SRCROOT/../scripts/spm-platform.cjs"\n';
  project = setScalarField(project, phase, 'shellScript', quoteIfNeeded(script + normalize));
  fs.writeFileSync(pbxproj, project);
  const schemePath = path.join(projectPath, 'xcshareddata/xcschemes/testapp.xcscheme');
  const scheme = fs.readFileSync(schemePath, 'utf8');
  const patchedScheme = scheme.replace(
    /(title = "Sync SPM Autolinking"\s+scriptText = ")([^"]*)"/,
    (_, prefix, contents) => prefix + contents + normalize.replaceAll('"', '&quot;') + '"',
  );
  if (patchedScheme === scheme) {
    throw new Error('Cannot preserve the minimum deployment target in the SPM scheme sync.');
  }
  fs.writeFileSync(schemePath, patchedScheme);
  normalizePlatform();
}

function prepare() {
  if (process.platform !== 'darwin') {
    throw new Error('The iOS SwiftPM consumer requires macOS and Xcode.');
  }
  const reactNativeRoot = path.dirname(require.resolve('react-native/package.json'));
  const envRoot = path.dirname(require.resolve('react-native-config/package.json'));
  const sdkManifest = path.join(layout.rn.stageDir, 'Package.swift');
  const originalManifest = fs.readFileSync(sdkManifest);
  copyNativeTemplate();

  // This podspec script is not run by SwiftPM. Generate its source before the
  // scaffold scans source files and before Xcode resolves the package graph.
  const configSources = path.join(envRoot, 'ios/ReactNativeConfig');
  fs.mkdirSync(path.join(fixtureRoot, 'build'), { recursive: true });
  run('ruby', [path.join(configSources, 'BuildDotenvConfig.rb'), appRoot, configSources], {
    cwd: appRoot,
    env: { ...process.env, BUILD_DIR: path.join(fixtureRoot, 'build') },
    // Upstream prints the entire dotenv map, including credentials.
    stdio: 'pipe',
  });

  // The two existing community dependencies do not ship manifests. RN's
  // explicit scaffolder supplies those, while preserving our SDK manifest.
  // All deintegration is confined to the generated fixture; ios/ is untouched.
  run(process.execPath, [
    path.join(reactNativeRoot, 'scripts/setup-apple-spm.js'),
    'scaffold',
    '--deintegrate',
    '--yes',
    '--xcodeproj',
    'testapp.xcodeproj',
    '--product-name',
    'testapp',
    '--config-command',
    JSON.stringify([process.execPath, path.join(__dirname, 'spm-config.cjs')]),
  ]);
  if (!originalManifest.equals(fs.readFileSync(sdkManifest))) {
    throw new Error('SPM setup unexpectedly modified the SDK manifest.');
  }
  preserveMinimumPlatform(reactNativeRoot);
  console.log(`Open ${projectPath} to run on a physical device with signing.`);
}

function build(destination) {
  run('xcodebuild', [
    '-project',
    projectPath,
    '-scheme',
    'testapp',
    '-configuration',
    'Debug',
    '-destination',
    destination,
    '-derivedDataPath',
    derivedData,
    'build',
  ]);
}

function runSimulator() {
  const requested = args[0] === '--udid' ? args[1] : undefined;
  if (args.length && (args.length !== 2 || !requested)) {
    throw new Error('Usage: yarn ios:spm --udid <simulator-UUID>');
  }
  const inventory = JSON.parse(
    run('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }),
  );
  const devices = Object.entries(inventory.devices)
    .filter(([runtime]) => runtime.includes('.SimRuntime.iOS-'))
    .flatMap(([, runtimeDevices]) => runtimeDevices);
  const candidates = requested
    ? devices.filter((device) => device.udid === requested)
    : devices.filter((device) => device.state === 'Booted');
  if (candidates.length !== 1) {
    throw new Error(
      'Boot one iOS simulator or pass --udid from `xcrun simctl list devices available`.',
    );
  }
  const device = candidates[0];
  if (device.state !== 'Booted') {
    run('xcrun', ['simctl', 'boot', device.udid]);
  }
  run('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);
  build(`platform=iOS Simulator,id=${device.udid}`);
  run('xcrun', [
    'simctl',
    'install',
    device.udid,
    path.join(derivedData, 'Build/Products/Debug-iphonesimulator/testapp.app'),
  ]);
  run('xcrun', ['simctl', 'launch', device.udid, bundleId]);
}

try {
  if (!['prepare', 'build', 'run'].includes(action)) {
    throw new Error(`Unknown action: ${action}`);
  }
  if (action !== 'run' && args.length) {
    throw new Error(`Unexpected arguments: ${args.join(' ')}`);
  }
  prepare();
  if (action === 'build') {
    build('generic/platform=iOS Simulator');
  } else if (action === 'run') {
    runSimulator();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
