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
assert((pluginXml.match(/<js-module\b/g) ?? []).length === 1, "Cordova plugin must contain one JS module")
assert(/<merges target="window"\s*\/>/.test(pluginXml), "Cordova module must merge into window")

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