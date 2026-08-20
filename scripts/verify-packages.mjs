/**
 * Smoke-tests the packages produced by npm pack.
 */

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import ts from "typescript"
import layout from "./build-layout.cjs"

const require = createRequire(import.meta.url)
const Module = require("node:module")
const rootDir = layout.rootDir
const rootPackage = readJson(rootDir, "package.json")

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function requireFile(packageDir, relativePath) {
  assert(typeof relativePath === "string" && relativePath.length > 0, "Invalid file path")
  const packageRoot = path.resolve(packageDir)
  const filePath = path.resolve(packageRoot, relativePath)
  assert(filePath.startsWith(`${packageRoot}${path.sep}`), `Path escapes package: ${relativePath}`)
  assert(fs.statSync(filePath, { throwIfNoEntry: false })?.isFile(), `Missing ${relativePath}`)
  return filePath
}

function requireEntry(packageDir, entry) {
  for (const suffix of ["", ".js", ".ts"]) {
    const relativePath = `${entry}${suffix}`
    const filePath = path.resolve(packageDir, relativePath)
    if (filePath.startsWith(`${path.resolve(packageDir)}${path.sep}`)
      && fs.statSync(filePath, { throwIfNoEntry: false })?.isFile()) return filePath
  }
  throw new Error(`Missing entry point ${entry}`)
}

function readJson(packageDir, relativePath) {
  return JSON.parse(fs.readFileSync(requireFile(packageDir, relativePath), "utf8"))
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`)
  }
  return result.stdout
}

function extractPackage(archivePath, destination) {
  const entries = run("tar", ["-tzf", archivePath]).trim().split("\n").filter(Boolean)
  assert(entries.length > 0, `${archivePath} is empty`)
  for (const entry of entries) {
    const normalized = path.posix.normalize(entry)
    assert(
      normalized === "package" || normalized.startsWith("package/"),
      `${archivePath} contains an unsafe path: ${entry}`,
    )
  }
  fs.mkdirSync(destination, { recursive: true })
  run("tar", ["-xzf", archivePath, "-C", destination])
  const packageDir = path.join(destination, "package")
  assert(fs.statSync(packageDir, { throwIfNoEntry: false })?.isDirectory(), "Missing package root")
  return { packageDir, entries }
}

function verifyDeclaration(filePath) {
  const source = ts.createSourceFile(
    filePath,
    fs.readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
  )
  assert(source.parseDiagnostics.length === 0, `Invalid declaration file ${filePath}`)
}

function verifyModuleSyntax(filePath) {
  const result = spawnSync(process.execPath, ["--input-type=module", "--check"], {
    encoding: "utf8",
    input: fs.readFileSync(filePath, "utf8"),
  })
  assert(result.status === 0, `Invalid ES module ${filePath}:\n${result.stderr}`)
}

function runtimeExports(entryPath, platform) {
  const previousLoad = Module._load
  const previousCordova = global.cordova
  const previousDev = global.__DEV__
  const reactNativeMock = new Proxy(function () {}, {
    get: (_, property) => property === "OS" ? "android" : reactNativeMock,
    apply: () => reactNativeMock,
    construct: () => reactNativeMock,
  })
  const resolvedPath = require.resolve(entryPath)

  Module._load = function (request) {
    if (request === "react-native") return reactNativeMock
    return previousLoad.apply(this, arguments)
  }
  global.__DEV__ = false

  const load = (platformId) => {
    if (platformId) global.cordova = { platformId, exec() {} }
    delete require.cache[resolvedPath]
    return Object.keys(require(resolvedPath)).sort()
  }

  try {
    const exports = load(platform === "cordova" ? "android" : undefined)
    assert(exports.length > 0, `${entryPath} has no runtime exports`)
    if (platform === "cordova") {
      assert(
        JSON.stringify(load("ios")) === JSON.stringify(exports),
        "Cordova runtime exports differ between Android and iOS",
      )
    }
    return exports
  } finally {
    delete require.cache[resolvedPath]
    Module._load = previousLoad
    if (previousCordova === undefined) delete global.cordova
    else global.cordova = previousCordova
    if (previousDev === undefined) delete global.__DEV__
    else global.__DEV__ = previousDev
  }
}

function verifyManifest(packageDir, expectedPackage) {
  const packageJson = readJson(packageDir, "package.json")
  assert(packageJson.name === expectedPackage.name, `Expected ${expectedPackage.name}`)
  assert(packageJson.version === rootPackage.version, `${packageJson.name} has version ${packageJson.version}`)
  assert(Object.keys(packageJson.scripts ?? {}).length === 0, `${packageJson.name} publishes scripts`)
  return packageJson
}

function verifyReactNative(packageDir, expectedPackage) {
  const packageJson = verifyManifest(packageDir, expectedPackage)
  assert(packageJson.main === "lib/commonjs/index.js", "Unexpected React Native CommonJS entry")
  assert(packageJson.module === "lib/module/index.js", "Unexpected React Native module entry")
  assert(packageJson.types === "lib/typescript/index.d.ts", "Unexpected React Native types entry")
  assert(packageJson["react-native"] === "src/index", "Unexpected React Native source entry")
  assert(packageJson.source === "src", "Unexpected React Native source directory")
  const mainPath = requireEntry(packageDir, packageJson.main)
  const modulePath = requireEntry(packageDir, packageJson.module)
  const declarationPath = requireEntry(packageDir, packageJson.types)
  requireEntry(packageDir, packageJson["react-native"])
  requireFile(packageDir, "react-native.config.js")
  requireFile(packageDir, "react-native-powerauth-mobile-sdk.podspec")
  requireFile(packageDir, "android/build.gradle")
  verifyModuleSyntax(modulePath)
  verifyDeclaration(declarationPath)
  return runtimeExports(mainPath, "react-native")
}

function xmlModules(pluginXml) {
  return [...pluginXml.matchAll(
    /<js-module\b[^>]*\bsrc="([^"]+)"[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/js-module>/g,
  )].map((match) => ({ source: match[1], name: match[2], body: match[3] }))
}

function verifyCordova(packageDir, expectedPackage) {
  const packageJson = verifyManifest(packageDir, expectedPackage)
  assert(packageJson.main === "lib/index.js", "Unexpected Cordova CommonJS entry")
  assert(packageJson.types === "lib/index.d.ts", "Unexpected Cordova types entry")
  assert(packageJson.type === "commonjs", "Unexpected Cordova module type")
  const mainPath = requireEntry(packageDir, packageJson.main)
  verifyDeclaration(requireEntry(packageDir, packageJson.types))
  const exports = runtimeExports(mainPath, "cordova")

  const pluginXml = fs.readFileSync(requireFile(packageDir, "plugin.xml"), "utf8")
  assert(!pluginXml.includes("PLACEHOLDER"), "Cordova plugin contains an unresolved placeholder")
  const pluginTag = pluginXml.match(/<plugin\b[^>]*>/)?.[0] ?? ""
  assert(pluginTag.includes(`id="${packageJson.name}"`), "Cordova plugin id differs from package name")
  assert(pluginTag.includes(`version="${packageJson.version}"`), "Cordova plugin version differs")

  const modules = xmlModules(pluginXml)
  const expectedNames = ["PowerAuthPlugin", ...exports]
  assert(modules.length === expectedNames.length, "Cordova plugin module count is incorrect")
  const modulesByName = new Map(modules.map((module) => [module.name, module]))
  assert(modulesByName.size === modules.length, "Cordova plugin contains duplicate modules")

  for (const name of expectedNames) {
    const module = modulesByName.get(name)
    assert(module, `Cordova plugin is missing runtime export ${name}`)
    const expectedSource = name === "PowerAuthPlugin" ? packageJson.main : `lib/${name}.js`
    assert(module.source === expectedSource, `Cordova module ${name} points to ${module.source}`)
    assert(new RegExp(`<clobbers\\s+target="${name}"\\s*/>`).test(module.body), `${name} is not clobbered`)
    if (name !== "PowerAuthPlugin") {
      const shim = fs.readFileSync(requireFile(packageDir, expectedSource), "utf8")
      assert(
        shim === `module.exports = require("${packageJson.name}.PowerAuthPlugin").${name};\n`,
        `Cordova module ${name} has an invalid shim`,
      )
    }
  }

  for (const match of pluginXml.matchAll(
    /<(?:framework|header-file|js-module|source-file)\b[^>]*\bsrc="([^"]+)"/g,
  )) {
    if (!match[1].includes("://")) requireFile(packageDir, match[1])
  }
  return exports
}

const packages = [
  {
    target: "rn",
    sourceDir: layout.rn.packageDir,
    stageDir: layout.rn.stageDir,
    verify: verifyReactNative,
  },
  {
    target: "cordova",
    sourceDir: layout.cordova.packageDir,
    stageDir: layout.cordova.stageDir,
    verify: verifyCordova,
  },
]

const target = process.argv[2] ?? "all"
assert(["rn", "cordova", "all"].includes(target), `Unknown package target: ${target}`)
const selectedPackages = target === "all" ? packages : packages.filter((item) => item.target === target)
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "powerauth-packages-"))

try {
  for (const item of selectedPackages) {
    const expectedPackage = readJson(item.sourceDir, "package.json")
    assert(expectedPackage.version === rootPackage.version, `${item.target} source version differs`)
    const archiveName = `${expectedPackage.name.replace(/^@/, "").replaceAll("/", "-")}-${expectedPackage.version}.tgz`
    const archivePath = requireFile(item.stageDir, archiveName)
    const { packageDir, entries } = extractPackage(archivePath, path.join(tempDir, item.target))
    assert(!entries.some((entry) => entry.includes("/node_modules/")), `${item.target} contains node_modules`)
    assert(!entries.some((entry) => entry.includes("/.build/")), `${item.target} contains temporary files`)
    const exports = item.verify(packageDir, expectedPackage)
    console.log(`Verified ${expectedPackage.name}: ${exports.length} runtime exports.`)
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
