const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const packageDir = path.join(__dirname, '..');
const sharedDir = path.join(packageDir, '..', 'lib-shared');
const stageDir = path.join(packageDir, 'build', 'rn');

const androidJsPackagePath = path.join(
  'android',
  'src',
  'main',
  'java',
  'com',
  'wultra',
  'android',
  'powerauth',
  'js'
);

function copyDir(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source)) {
    fs.cpSync(path.join(source, entry), path.join(destination, entry), {
      recursive: true,
      force: true,
    });
  }
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

function stagePackageJson() {
  const pkg = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
  pkg.main = 'lib/commonjs/index.js';
  pkg.module = 'lib/module/index.js';
  pkg.types = 'lib/typescript/index.d.ts';
  pkg['react-native'] = 'src/index';
  pkg.source = 'src';
  pkg.scripts = {};
  if (Array.isArray(pkg.files) && !pkg.files.includes('react-native.config.js')) {
    pkg.files.push('react-native.config.js');
  }
  fs.writeFileSync(
    path.join(stageDir, 'package.json'),
    JSON.stringify(pkg, null, 2) + '\n'
  );
  return pkg.version;
}

function assemble() {
  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });

  // Shared TypeScript sources.
  copyDir(path.join(sharedDir, 'js'), path.join(stageDir, 'src'));

  // Shared Android JS bridge sources.
  copyDir(
    path.join(sharedDir, androidJsPackagePath),
    path.join(stageDir, androidJsPackagePath)
  );

  // React Native specific Android overlay.
  for (const relativePath of [
    path.join('android', 'src', 'main', 'AndroidManifest.xml'),
    path.join('android', 'src', 'main', 'java', 'com', 'wultra', 'android', 'powerauth', 'bridge'),
    path.join('android', 'src', 'main', 'java', 'com', 'wultra', 'android', 'powerauth', 'reactnative'),
    path.join('android', 'build.gradle'),
    path.join('android', 'generated', 'jni', 'CMakeLists.txt'),
  ]) {
    copyFile(path.join(packageDir, relativePath), path.join(stageDir, relativePath));
  }

  // Shared iOS sources and Xcode project.
  copyDir(path.join(sharedDir, 'ios', 'PowerAuth'), path.join(stageDir, 'ios', 'PowerAuth'));
  copyDir(
    path.join(sharedDir, 'ios', 'PowerAuth.xcodeproj'),
    path.join(stageDir, 'ios', 'PowerAuth.xcodeproj')
  );

  // React Native specific iOS overlay.
  copyFile(
    path.join(packageDir, 'ios', 'PowerAuth', 'PAJSPlatform.h'),
    path.join(stageDir, 'ios', 'PowerAuth', 'PAJSPlatform.h')
  );

  // Package metadata and build configuration.
  for (const fileName of [
    'react-native-powerauth-mobile-sdk.podspec',
    'react-native.config.js',
    'tsconfig.json',
    'tsconfig.build-types.json',
  ]) {
    copyFile(path.join(packageDir, fileName), path.join(stageDir, fileName));
  }

  // Optional metadata files referenced by the "files" field.
  for (const fileName of ['README.md', 'LICENSE']) {
    const source = path.join(packageDir, fileName);
    if (fs.existsSync(source)) {
      copyFile(source, path.join(stageDir, fileName));
    }
  }

  const version = stagePackageJson();

  const versionDir = path.join(stageDir, 'src', 'internal');
  fs.mkdirSync(versionDir, { recursive: true });
  fs.writeFileSync(
    path.join(versionDir, 'SDKVersion.ts'),
    `// AUTO-GENERATED\nexport const SDK_VERSION = '${version}';\n`
  );
}

function resolveBin(name) {
  const candidates = [
    path.join(packageDir, 'node_modules', '.bin', name),
    path.join(packageDir, '..', '..', 'node_modules', '.bin', name),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || name;
}

function runInStage(binName, args) {
  execFileSync(resolveBin(binName), args, { cwd: stageDir, stdio: 'inherit' });
}

function main() {
  const args = process.argv.slice(2);

  assemble();
  console.log(`Assembled the React Native package in ${path.relative(process.cwd(), stageDir)}.`);

  if (args.includes('--typecheck')) {
    runInStage('tsc', ['-p', 'tsconfig.json', '--noEmit']);
    return;
  }

  if (args.includes('--compile') || args.includes('--pack')) {
    runInStage('bob', ['build']);
    runInStage('tsc', ['-p', 'tsconfig.build-types.json']);
  }

  if (args.includes('--pack')) {
    execFileSync('npm', ['pack'], { cwd: stageDir, stdio: 'inherit' });
  }
}

main();
