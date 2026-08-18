import gulp from "gulp"
import ts from "gulp-typescript"
import replace from "gulp-replace"
import concat  from "gulp-concat"
import filter from "gulp-filter"
import { build } from "esbuild"
import stripImportExport from "gulp-strip-import-export"
import { rimraf } from "rimraf"
import fs from "fs"
import { exec } from "child_process"
import path from "path"

const buildDir = "build"
const tmpDir = ".build"

const RN_packageDir = "../lib-rn"
const sharedSourcesDir = "../lib-shared"

let libVersion = "0.0.1-dev"
try {
  const rnPkgPath = path.join(RN_packageDir, "package.json")
  const rnPkg = JSON.parse(fs.readFileSync(rnPkgPath, "utf8"))
  if (typeof rnPkg.version === "string" && rnPkg.version.length > 0) {
    libVersion = rnPkg.version
  }
} catch {}

const CDV_packageJson = `./package.json`
const CDV_pluginXml = `./plugin.xml`
const CDV_buildDir = `${buildDir}/cdv`
const CDV_tempDir = `${tmpDir}/cdv`
const CDV_libDir = "lib"
const CDV_typingsFile = "typings.d.ts"
const CDV_outFileDir = `${CDV_buildDir}/${CDV_libDir}`
const CDV_pluginName = "PowerAuthPlugin"
const CDV_outFile = `${CDV_outFileDir}/${CDV_pluginName}.js`

const clearCDVall = () => rimraf([ CDV_buildDir, CDV_tempDir ])
const clearCDVtemp = () => rimraf([ CDV_tempDir ])

const copyCDVSourceFiles = () =>
  gulp
    .src(`${sharedSourcesDir}/js/**/*.ts`, { base: `${sharedSourcesDir}/js`, allowEmpty: true })
    .pipe(replace("__DEV__", "false"))
    .pipe(gulp.dest(`${CDV_tempDir}/src`))

const writeCDVVersionFile = async () => {
  const outDir = `${CDV_tempDir}/src/internal`
  await fs.promises.mkdir(outDir, { recursive: true })
  await fs.promises.writeFile(`${outDir}/SDKVersion.ts`, `// AUTO-GENERATED\nexport const SDK_VERSION = '${libVersion}';\n`)
}

const copyCDVPatchSourceFiles = () =>
  gulp
    .src([`./src/**/**.ts`], { base: "." })
    .pipe(gulp.dest(CDV_tempDir))

const compileCDVTask = () =>
  build({
    entryPoints: [`${CDV_tempDir}/src/index.ts`],
    outfile: CDV_outFile,
    bundle: true,
    format: "cjs",
    target: "ios13",
    minify: true,
  })

const createCDVDtsTask = () =>
  gulp
    .src([`${CDV_tempDir}/src/PowerAuth**.ts`, `${CDV_tempDir}/src/*/**.ts`])
    .pipe(stripImportExport())
    .pipe(ts({ declaration: true, emitDeclarationOnly: true }))
    .pipe(filter(f => !f.path.includes(`${CDV_tempDir}/src/internal/`)))
    .pipe(concat(CDV_typingsFile))
    .pipe(gulp.dest(CDV_buildDir))

let objectsToExport = []

const processCDVobjectsToExport = () => new Promise(resolve => {
  try {
    const typingsPath = `${CDV_buildDir}/${CDV_typingsFile}`
    if (fs.existsSync(typingsPath)) {
      const matches = fs.readFileSync(typingsPath, 'utf8').matchAll(/declare(\sabstract)? [a-z]* (?<name>[A-Za-z0-9_]*)/g)
      objectsToExport = [...matches].flatMap(r => r.groups).flatMap(r => r?.name).filter(Boolean)
    } else {
      objectsToExport = []
    }
  } catch {
    objectsToExport = []
  }
  resolve()
})

const exportModules = () => new Promise(resolve => {
  objectsToExport.forEach((v) => {
    fs.writeFileSync(`${CDV_outFileDir}/${v}.js`, `require("cordova-powerauth-mobile-sdk.${CDV_pluginName}");\nmodule.exports = ${CDV_pluginName}.${v};`)
  })
  resolve()
})

// Copy sources based on package.json for cordova, but the source directory (the root project) doesn't contain all the mentioned files.
// It's necessary to filter files not present in the source directory. Otherwise it fails completely.
const cdvPackageRegex = /.*\/powerauth\/cdv\/.*/
const copyCDVFiles = () =>
  gulp
    .src((() => {
      const files = JSON.parse(fs.readFileSync(CDV_packageJson, 'utf8')).files
        .filter((file) => !file.startsWith(`${CDV_libDir}/`) && !file.match(cdvPackageRegex))
        // Exclude patterns whose base directory doesn't exist in this package (they may come from RN and are copied separately - like Android patches etc)
        .filter((pattern) => {
          const lastSlash = pattern.lastIndexOf('/')
          const baseDir = lastSlash >= 0 ? pattern.substring(0, lastSlash) : pattern
          try {
            return fs.existsSync(baseDir)
          } catch {
            return false
          }
        })
      return files
    })(), { base: ".", allowEmpty: true })
    .pipe(gulp.dest(CDV_buildDir))

const copyCDVPatchIOSFiles = () =>
  gulp
    .src([`./ios/PowerAuth/**`], { base: "." })
    .pipe(gulp.dest(CDV_buildDir))

// Copy shared iOS native sources required by plugin.xml (Constants.h, *.m, etc.)
const copySharedIosFiles = () =>
  gulp
    .src([`${sharedSourcesDir}/ios/PowerAuth/**`], { base: sharedSourcesDir })
    .pipe(gulp.dest(CDV_buildDir))

// Copy shared iOS Xcode project and workspace
const copySharedIosProject = () =>
  gulp
    .src([
      `${sharedSourcesDir}/ios/PowerAuth.xcodeproj/**`,
      `${sharedSourcesDir}/ios/PowerAuth.xcworkspace/**`
    ], { base: sharedSourcesDir, allowEmpty: true })
    .pipe(gulp.dest(CDV_buildDir))

// Copy shared Android JS bridge sources
const copySharedAndroidJsFiles = () =>
  gulp
    .src([`${sharedSourcesDir}/android/src/main/java/com/wultra/android/powerauth/js/**`], { base: sharedSourcesDir })
    .pipe(gulp.dest(CDV_buildDir))

const copyCDVPatchAndroidFiles = () =>
  gulp
    .src([`./android/**`], { base: "." })
    .pipe(gulp.dest(CDV_buildDir))

const copyCDVStaticFiles = () =>
  gulp
    .src([CDV_packageJson, CDV_pluginXml])
    .pipe(replace("<!-- PLACEHOLDER_MODULES -->", [CDV_pluginName, ...objectsToExport].map((v) => `    <js-module src="${CDV_libDir}/${v}.js" name="${v}"><clobbers target="${v}" /></js-module>`).join("\n")))
    .pipe(replace("<!-- PLACEHOLDER_VERSION -->", libVersion))
    .pipe(gulp.dest(CDV_buildDir))

const packCDVPackage = () => exec(`cd ${CDV_buildDir} && npm pack`)

const CDV_buildTask = gulp.series(
  clearCDVall,
  copyCDVSourceFiles,
  writeCDVVersionFile,
  copyCDVPatchSourceFiles,
  compileCDVTask,
  createCDVDtsTask,
  processCDVobjectsToExport,
  exportModules,
  copyCDVFiles,
  copySharedIosFiles,
  copySharedIosProject,
  copySharedAndroidJsFiles,
  copyCDVPatchIOSFiles,
  copyCDVPatchAndroidFiles,
  copyCDVStaticFiles,
  packCDVPackage,
  clearCDVtemp,
)

gulp.task("cdv", gulp.series(CDV_buildTask))
