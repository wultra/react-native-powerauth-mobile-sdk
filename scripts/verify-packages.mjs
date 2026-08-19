import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const rnStageDir = path.join(rootDir, "packages", "lib-rn", "build", "rn")
const cordovaStageDir = path.join(rootDir, "packages", "lib-cordova", "build", "cdv")

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function requireFile(packageDir, relativePath) {
  const filePath = path.join(packageDir, relativePath)
  assert(fs.statSync(filePath, { throwIfNoEntry: false })?.isFile(), `Missing ${relativePath}`)
  return filePath
}

function readJson(packageDir, relativePath) {
  return JSON.parse(fs.readFileSync(requireFile(packageDir, relativePath), "utf8"))
}

function declarationExports(filePath) {
  const declaration = fs.readFileSync(filePath, "utf8")
  const match = declaration.match(/^export \{ ([^}]+) \};$/m)
  assert(match, `Missing declaration export list in ${path.relative(rootDir, filePath)}`)
  return match[1].split(",").map((name) => name.trim()).sort()
}

function cordovaModuleNames(filePath) {
  const declaration = fs.readFileSync(filePath, "utf8")
  const matches = declaration.matchAll(/declare(\sabstract)? [a-z]* (?<name>[A-Za-z0-9_]*)/g)
  return [...new Set([...matches].map((match) => match.groups?.name).filter(Boolean))]
}

function xmlModules(pluginXml) {
  return [...pluginXml.matchAll(/<js-module\b[^>]*\bsrc="([^"]+)"[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/js-module>/g)]
    .map((match) => ({ source: match[1], name: match[2], body: match[3] }))
}

const rnPackage = readJson(rnStageDir, "package.json")
const cordovaPackage = readJson(cordovaStageDir, "package.json")
const rootPackage = readJson(rootDir, "package.json")
assert(
  rootPackage.version === rnPackage.version && rnPackage.version === cordovaPackage.version,
  "Root and staged package versions differ",
)

const rnDeclaration = requireFile(rnStageDir, rnPackage.types)
requireFile(rnStageDir, rnPackage.main)
requireFile(rnStageDir, rnPackage.module)
requireFile(rnStageDir, "src/index.ts")
requireFile(rnStageDir, "react-native-powerauth-mobile-sdk.podspec")
requireFile(rnStageDir, "android/build.gradle")

const cordovaDeclaration = requireFile(cordovaStageDir, cordovaPackage.types)
requireFile(cordovaStageDir, cordovaPackage.main)
requireFile(cordovaStageDir, `${cordovaPackage.main}.map`)
requireFile(cordovaStageDir, "android/build.gradle")

assert(
  JSON.stringify(declarationExports(rnDeclaration)) === JSON.stringify(declarationExports(cordovaDeclaration)),
  "React Native and Cordova public exports differ",
)

const pluginPath = requireFile(cordovaStageDir, "plugin.xml")
const pluginXml = fs.readFileSync(pluginPath, "utf8")
assert(!pluginXml.includes("PLACEHOLDER"), "Cordova plugin contains an unresolved placeholder")
assert(!/<merges\b/.test(pluginXml), "Cordova plugin must preserve individual module clobbers")

const expectedCordovaModules = ["PowerAuthPlugin", ...cordovaModuleNames(cordovaDeclaration)]
const actualCordovaModules = xmlModules(pluginXml)
assert(
  actualCordovaModules.length === expectedCordovaModules.length,
  `Cordova plugin exposes ${actualCordovaModules.length} modules instead of ${expectedCordovaModules.length}`,
)
const modulesByName = new Map(actualCordovaModules.map((module) => [module.name, module]))
for (const moduleName of expectedCordovaModules) {
  const module = modulesByName.get(moduleName)
  assert(module, `Cordova plugin is missing module ${moduleName}`)
  const expectedSource = moduleName === "PowerAuthPlugin" ? cordovaPackage.main : `lib/${moduleName}.js`
  assert(module.source === expectedSource, `Cordova module ${moduleName} points to ${module.source}`)
  assert(
    new RegExp(`<clobbers\\s+target="${moduleName}"\\s*\\/>`).test(module.body),
    `Cordova module ${moduleName} does not clobber ${moduleName}`,
  )
  if (moduleName !== "PowerAuthPlugin") {
    const shim = fs.readFileSync(requireFile(cordovaStageDir, expectedSource), "utf8")
    assert(
      shim === `module.exports = require("cordova-powerauth-mobile-sdk.PowerAuthPlugin").${moduleName};\n`,
      `Cordova module ${moduleName} has an invalid compatibility shim`,
    )
  }
}

for (const match of pluginXml.matchAll(/<(?:framework|header-file|js-module|source-file)\b[^>]*\bsrc="([^"]+)"/g)) {
  const source = match[1]
  if (!source.includes("://")) requireFile(cordovaStageDir, source)
}

assert(!fs.existsSync(path.join(cordovaStageDir, "node_modules")), "Cordova package contains node_modules")
assert(
  !fs.existsSync(path.join(rootDir, "packages", "lib-cordova", ".build", "cdv")),
  "Cordova temporary build directory was not cleaned",
)

console.log(`Verified React Native and Cordova ${rnPackage.version} packages.`)
