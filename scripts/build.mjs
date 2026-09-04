/**
 * Stages, builds, and packages the React Native and Cordova libraries.
 */

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import layout from "./build-layout.cjs"

const rootDir = layout.rootDir
const sharedDir = layout.shared.dir
const rnDir = layout.rn.packageDir
const cordovaDir = layout.cordova.packageDir
const rnStageDir = layout.rn.stageDir
const cordovaStageDir = layout.cordova.stageDir
const cordovaTempDir = layout.cordova.tempDir
const cordovaExportsFile = layout.cordova.exportsFile
const cordovaPluginName = "PowerAuthPlugin"
const cordovaModulesPlaceholder = "<!-- PLACEHOLDER_MODULES -->"
const androidJsPath = path.join(
  "android",
  "src",
  "main",
  "java",
  "com",
  "wultra",
  "android",
  "powerauth",
  "js",
)

/**
 * Copies a file or directory into a staged package.
 * @param {string} source Source path.
 * @param {string} destination Destination path.
 * @param {boolean} [optional=false] Skip a missing source when true.
 */
function copy(source, destination, optional = false) {
  if (!fs.existsSync(source)) {
    if (optional) return
    throw new Error(`Missing build input: ${path.relative(rootDir, source)}`)
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.cpSync(source, destination, { recursive: true, force: true })
}

/**
 * Reads a package.json file.
 * @param {string} packageDir Package directory.
 * @returns {object} Parsed package data.
 */
function readPackage(packageDir) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8"))
}

/**
 * Writes formatted JSON to a file.
 * @param {string} filePath Output path.
 * @param {unknown} value Value to write.
 */
function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

/**
 * Generates the TypeScript SDK version file.
 * @param {string} sourceDir Staged source directory.
 * @param {string} version SDK version.
 */
function writeSdkVersion(sourceDir, version) {
  const versionDir = path.join(sourceDir, "internal")
  fs.mkdirSync(versionDir, { recursive: true })
  fs.writeFileSync(
    path.join(versionDir, "SDKVersion.ts"),
    `// AUTO-GENERATED\nexport const SDK_VERSION = '${version}';\n`,
  )
}

/**
 * Converts bundled module declarations to Cordova-compatible ambient declarations.
 * @param {string} declarationPath Declaration file path.
 */
function makeCordovaDeclarationsAmbient(declarationPath) {
  const declaration = fs.readFileSync(declarationPath, "utf8")
  const ambientDeclaration = declaration.replace(/^export(?: type)? \{ [^}]+ \};\n?/gm, "")
  if (ambientDeclaration === declaration || /^(?:import|export)\s/m.test(ambientDeclaration)) {
    throw new Error(
      `Failed to create ambient declarations in ${path.relative(rootDir, declarationPath)}`,
    )
  }
  fs.writeFileSync(declarationPath, ambientDeclaration)
}

/**
 * Reads the runtime exports reported by Rollup for the Cordova entry chunk.
 * @returns {string[]} Exported names.
 */
function cordovaExports() {
  const names = JSON.parse(fs.readFileSync(cordovaExportsFile, "utf8"))
  if (!Array.isArray(names) || names.length === 0 || names.some((name) => typeof name !== "string")) {
    throw new Error("Rollup reported invalid Cordova runtime exports")
  }
  return names
}

/**
 * Generates Cordova shims and expands the staged plugin.xml template.
 */
function generateCordovaModules() {
  const packageJson = readPackage(cordovaStageDir)
  const declarationPath = path.join(cordovaStageDir, packageJson.types)
  makeCordovaDeclarationsAmbient(declarationPath)
  const moduleNames = cordovaExports()
  const libDir = path.join(cordovaStageDir, "lib")

  // Preserve legacy module IDs by forwarding them to the Rollup bundle.
  for (const moduleName of moduleNames) {
    fs.writeFileSync(
      path.join(libDir, `${moduleName}.js`),
      `module.exports = require("${packageJson.name}.${cordovaPluginName}").${moduleName};\n`,
    )
  }

  // Register the bundle and expose each shim under its original global name.
  const moduleDefinitions = [
    [packageJson.main, cordovaPluginName],
    ...moduleNames.map((moduleName) => [`lib/${moduleName}.js`, moduleName]),
  ].map(([source, name]) =>
    `    <js-module src="${source}" name="${name}"><clobbers target="${name}" /></js-module>`,
  ).join("\n")

  // Expand only the staged plugin.xml template.
  const pluginPath = path.join(cordovaStageDir, "plugin.xml")
  const pluginXml = fs.readFileSync(pluginPath, "utf8")
  if (!pluginXml.includes(cordovaModulesPlaceholder)) {
    throw new Error(`Cordova plugin is missing ${cordovaModulesPlaceholder}`)
  }
  fs.writeFileSync(pluginPath, pluginXml.replace(cordovaModulesPlaceholder, moduleDefinitions))
}

/**
 * Validates and returns the shared package version.
 * @returns {string} SDK version.
 */
function sdkVersion() {
  const rootVersion = readPackage(rootDir).version
  const rnVersion = readPackage(rnDir).version
  const cordovaVersion = readPackage(cordovaDir).version
  if (rootVersion !== rnVersion || rnVersion !== cordovaVersion) {
    throw new Error(
      `Package versions differ: root ${rootVersion}, RN ${rnVersion}, Cordova ${cordovaVersion}`,
    )
  }
  return rnVersion
}

/**
 * Creates the staged React Native package.
 * @param {string} version SDK version.
 */
function stageReactNative(version) {
  fs.rmSync(rnStageDir, { recursive: true, force: true })
  fs.mkdirSync(rnStageDir, { recursive: true })

  copy(path.join(sharedDir, "js"), path.join(rnStageDir, "src"))
  writeSdkVersion(path.join(rnStageDir, "src"), version)

  copy(path.join(sharedDir, androidJsPath), path.join(rnStageDir, androidJsPath))
  for (const relativePath of [
    path.join("android", "src", "main", "AndroidManifest.xml"),
    path.join("android", "src", "main", "java", "com", "wultra", "android", "powerauth", "bridge"),
    path.join("android", "src", "main", "java", "com", "wultra", "android", "powerauth", "reactnative"),
    path.join("android", "build.gradle"),
    path.join("android", "generated", "jni", "CMakeLists.txt"),
  ]) {
    copy(path.join(rnDir, relativePath), path.join(rnStageDir, relativePath))
  }

  copy(path.join(sharedDir, "ios", "PowerAuth"), path.join(rnStageDir, "ios", "PowerAuth"))
  copy(
    path.join(sharedDir, "ios", "PowerAuth.xcodeproj"),
    path.join(rnStageDir, "ios", "PowerAuth.xcodeproj"),
  )
  copy(
    path.join(rnDir, "ios", "PowerAuth", "PAJSPlatform.h"),
    path.join(rnStageDir, "ios", "PowerAuth", "PAJSPlatform.h"),
  )

  for (const fileName of [
    "react-native-powerauth-mobile-sdk.podspec",
    "react-native.config.js",
    "tsconfig.json",
  ]) {
    copy(path.join(rnDir, fileName), path.join(rnStageDir, fileName))
  }
  for (const fileName of ["README.md", "LICENSE"]) {
    copy(path.join(rnDir, fileName), path.join(rnStageDir, fileName), true)
  }

  const packageJson = readPackage(rnDir)
  packageJson.main = "lib/commonjs/index.js"
  packageJson.module = "lib/module/index.js"
  packageJson.types = "lib/typescript/index.d.ts"
  packageJson["react-native"] = "src/index"
  packageJson.source = "src"
  packageJson.scripts = {}
  if (!packageJson.files.includes("react-native.config.js")) {
    packageJson.files.push("react-native.config.js")
  }
  writeJson(path.join(rnStageDir, "package.json"), packageJson)
}

/**
 * Creates the staged Cordova package and temporary TypeScript sources.
 * @param {string} version SDK version.
 */
function stageCordova(version) {
  fs.rmSync(cordovaStageDir, { recursive: true, force: true })
  fs.rmSync(cordovaTempDir, { recursive: true, force: true })
  fs.mkdirSync(cordovaStageDir, { recursive: true })

  copy(path.join(sharedDir, "js"), path.join(cordovaTempDir, "src"))
  copy(path.join(cordovaDir, "src"), path.join(cordovaTempDir, "src"))
  writeSdkVersion(path.join(cordovaTempDir, "src"), version)

  copy(path.join(sharedDir, androidJsPath), path.join(cordovaStageDir, androidJsPath))
  copy(path.join(cordovaDir, "android"), path.join(cordovaStageDir, "android"))

  copy(path.join(sharedDir, "ios", "PowerAuth"), path.join(cordovaStageDir, "ios", "PowerAuth"))
  copy(path.join(cordovaDir, "ios", "PowerAuth"), path.join(cordovaStageDir, "ios", "PowerAuth"))

  for (const fileName of ["README.md", "LICENSE", "plugin.xml"]) {
    copy(path.join(cordovaDir, fileName), path.join(cordovaStageDir, fileName), fileName !== "plugin.xml")
  }
  const packageJson = readPackage(cordovaDir)
  packageJson.scripts = {}
  writeJson(path.join(cordovaStageDir, "package.json"), packageJson)
}

/**
 * Runs a command and exits when it fails.
 * @param {string} command Command name.
 * @param {string[]} args Command arguments.
 * @param {object} [options] Spawn options.
 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
    ...options,
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

/**
 * Builds the selected target with Rollup.
 * @param {string} target Build target.
 */
function runRollup(target) {
  run("yarn", ["rollup", "-c"], {
    env: { ...process.env, BUILD_TARGET: target },
  })
}

/**
 * Creates an npm package from a staged directory.
 * @param {string} stageDir Staged package directory.
 */
function pack(stageDir) {
  run("npm", ["pack"], { cwd: stageDir })
}

// Read the requested target and flags.
const target = process.argv[2] ?? "all"
const flags = new Set(process.argv.slice(3))
if (!["rn", "cordova", "all"].includes(target)) {
  throw new Error(`Unknown build target: ${target}`)
}

const version = sdkVersion()
if (target === "rn" || target === "all") stageReactNative(version)
if (target === "cordova" || target === "all") stageCordova(version)

if (flags.has("--stage")) process.exit(0)
if (flags.has("--typecheck")) {
  if (target !== "rn") throw new Error("Typecheck is only available for the RN target")
  run("yarn", ["tsc", "-p", path.join(rnStageDir, "tsconfig.json"), "--noEmit"])
  process.exit(0)
}

runRollup(target)
// Generate Cordova modules after Rollup creates the declaration file.
if (target === "cordova" || target === "all") generateCordovaModules()
fs.rmSync(cordovaTempDir, { recursive: true, force: true })

if (flags.has("--pack")) {
  if (target === "rn" || target === "all") pack(rnStageDir)
  if (target === "cordova" || target === "all") pack(cordovaStageDir)
}
