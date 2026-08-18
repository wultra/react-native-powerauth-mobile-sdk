import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sharedDir = path.join(rootDir, "packages", "lib-shared")
const rnDir = path.join(rootDir, "packages", "lib-rn")
const cordovaDir = path.join(rootDir, "packages", "lib-cordova")
const rnStageDir = path.join(rnDir, "build", "rn")
const cordovaStageDir = path.join(cordovaDir, "build", "cdv")
const cordovaTempDir = path.join(cordovaDir, ".build", "cdv")
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

function copy(source, destination, optional = false) {
  if (!fs.existsSync(source)) {
    if (optional) return
    throw new Error(`Missing build input: ${path.relative(rootDir, source)}`)
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true })
  fs.cpSync(source, destination, { recursive: true, force: true })
}

function readPackage(packageDir) {
  return JSON.parse(fs.readFileSync(path.join(packageDir, "package.json"), "utf8"))
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function writeSdkVersion(sourceDir, version) {
  const versionDir = path.join(sourceDir, "internal")
  fs.mkdirSync(versionDir, { recursive: true })
  fs.writeFileSync(
    path.join(versionDir, "SDKVersion.ts"),
    `// AUTO-GENERATED\nexport const SDK_VERSION = '${version}';\n`,
  )
}

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
  copy(
    path.join(sharedDir, "ios", "PowerAuth.xcodeproj"),
    path.join(cordovaStageDir, "ios", "PowerAuth.xcodeproj"),
  )
  copy(
    path.join(sharedDir, "ios", "PowerAuth.xcworkspace"),
    path.join(cordovaStageDir, "ios", "PowerAuth.xcworkspace"),
    true,
  )
  copy(path.join(cordovaDir, "ios", "PowerAuth"), path.join(cordovaStageDir, "ios", "PowerAuth"))

  for (const fileName of ["README.md", "LICENSE", "plugin.xml"]) {
    copy(path.join(cordovaDir, fileName), path.join(cordovaStageDir, fileName), fileName !== "plugin.xml")
  }
  const packageJson = readPackage(cordovaDir)
  packageJson.scripts = {}
  writeJson(path.join(cordovaStageDir, "package.json"), packageJson)
}

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

function runRollup(target) {
  run("yarn", ["rollup", "-c"], {
    env: { ...process.env, BUILD_TARGET: target },
  })
}

function pack(stageDir) {
  run("npm", ["pack"], { cwd: stageDir })
}

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
fs.rmSync(cordovaTempDir, { recursive: true, force: true })

if (flags.has("--pack")) {
  if (target === "rn" || target === "all") pack(rnStageDir)
  if (target === "cordova" || target === "all") pack(cordovaStageDir)
}