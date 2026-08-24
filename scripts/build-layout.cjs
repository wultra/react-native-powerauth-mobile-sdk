/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const sharedDir = path.join(rootDir, 'packages', 'lib-shared');
const rnPackageDir = path.join(rootDir, 'packages', 'lib-rn');
const rnStageDir = path.join(rnPackageDir, 'build');
const cordovaPackageDir = path.join(rootDir, 'packages', 'lib-cordova');
const cordovaStageDir = path.join(cordovaPackageDir, 'build');
const cordovaTempDir = path.join(cordovaPackageDir, '.build');

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
    sourceGlob: 'packages/lib-rn/build/src/**/*.ts',
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
    sourceGlob: 'packages/lib-cordova/.build/src/**/*.ts',
    exportsFile: path.join(cordovaTempDir, 'runtime-exports.json'),
    outputs: {
      bundle: path.join(cordovaStageDir, 'lib', 'index.js'),
      types: path.join(cordovaStageDir, 'lib', 'index.d.ts'),
    },
  },
};
