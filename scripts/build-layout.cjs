/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const sharedDir = path.join(rootDir, 'packages', 'lib-shared');
const rnPackageDir = path.join(rootDir, 'packages', 'lib-rn');
const rnStageDir = path.join(rnPackageDir, 'build', 'rn');
const cordovaPackageDir = path.join(rootDir, 'packages', 'lib-cordova');
const cordovaStageDir = path.join(cordovaPackageDir, 'build', 'cdv');
const cordovaTempDir = path.join(cordovaPackageDir, '.build', 'cdv');

module.exports = {
  rootDir,
  rollupTsconfig: path.join(rootDir, 'tsconfig.rollup.json'),
  shared: {
    dir: sharedDir,
    jsDir: path.join(sharedDir, 'js'),
  },
  rn: {
    packageDir: rnPackageDir,
    stageDir: rnStageDir,
    input: path.join(rnStageDir, 'src', 'index.ts'),
    sourceGlob: 'packages/lib-rn/build/rn/src/**/*.ts',
    outputs: {
      commonjs: path.join(rnStageDir, 'lib', 'commonjs', 'index.js'),
      module: path.join(rnStageDir, 'lib', 'module', 'index.js'),
      types: path.join(rnStageDir, 'lib', 'typescript', 'index.d.ts'),
    },
  },
  cordova: {
    packageDir: cordovaPackageDir,
    stageDir: cordovaStageDir,
    tempDir: cordovaTempDir,
    input: path.join(cordovaTempDir, 'src', 'index.ts'),
    sourceGlob: 'packages/lib-cordova/.build/cdv/src/**/*.ts',
    exportsFile: path.join(cordovaTempDir, 'runtime-exports.json'),
    outputs: {
      bundle: path.join(cordovaStageDir, 'lib', 'index.js'),
      types: path.join(cordovaStageDir, 'lib', 'index.d.ts'),
    },
  },
};
