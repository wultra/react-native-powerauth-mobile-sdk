//
// Copyright 2024 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

// Dependencies
const gulp = require("gulp"); // gulp itself
const ts = require("gulp-typescript"); // to be able to compiles typescript
const replace = require('gulp-replace');
const concat = require('gulp-concat');
const { build } = require("esbuild");
const stripImportExport = require("gulp-strip-import-export"); 
const { rimraf } = require('rimraf'); // folder cleaner
const fs = require('fs');
const exec = require('child_process').exec;

// Out files
const buildDir = "build";
const tmpDir = ".build";

/***********************
* REACT-NATIVE SECTION *
************************/
{
    const RN_packageJson = "package.json";
    const RN_tsConfig = "tsconfig.json";
    const RN_buildDir = `${buildDir}/react-native`;
    const RN_sources = "src/**/**.ts";
    const RN_libDir = "lib";

    const clearRN = () => rimraf([ RN_buildDir ]);

    const compileRNTask = () =>
        gulp
            .src(RN_sources)
            .pipe(ts(RN_tsConfig))
            .pipe(gulp.dest(`${RN_buildDir}/${RN_libDir}`));

    const copyRNFiles = () =>
        gulp
            .src(JSON.parse(fs.readFileSync(RN_packageJson, 'utf8')).files.filter((file) => !file.startsWith(`${RN_libDir}/`)), { base: "." })
            .pipe(gulp.dest(RN_buildDir));

    const copyRNPackageJson = () => 
        gulp
            .src(RN_packageJson)
            .pipe(gulp.dest(RN_buildDir));

    const packRNPackage = () => exec(`pushd ${RN_buildDir} && npm pack`);

    var RN_buildTask = gulp.series(clearRN, compileRNTask, copyRNFiles, copyRNPackageJson, packRNPackage);
}

/***********************
* CAPACITOR.JS SECTION *
************************/
{
    const CAP_packageJson = "cordova-support/package-capacitor.json";
    const CAP_tsConfig = "cordova-support/tsconfig-capacitor.json";
    const CAP_buildDir = `${buildDir}/capjs`;
    const CAP_sources = "src/**/**.ts";
    const CAP_libDir = "lib";

    const clearCAP = () => rimraf([ CAP_buildDir ]);

    const compileCAPTask = () =>
        gulp
            .src(CAP_sources)
            .pipe(ts(CAP_tsConfig))
            .pipe(gulp.dest(`${CAP_buildDir}/${CAP_libDir}`));

    const copyCAPFiles = () =>
        gulp
            .src(JSON.parse(fs.readFileSync(CAP_packageJson, 'utf8')).files.filter((file) => !file.startsWith(`/${CAP_libDir}`)), { base: "." })
            .pipe(gulp.dest(CAP_buildDir));

    const copyCAPPackageJson = () => 
        gulp
            .src(CAP_packageJson)
            .pipe(gulp.dest(CAP_buildDir));

    const packCAPPackage = () => exec(`pushd ${CAP_buildDir} && npm pack`);

    var CAP_buildTask = gulp.series(clearCAP, compileCAPTask, copyCAPFiles, copyCAPPackageJson, packCAPPackage);
}

/***********************
*  CORDOVA.JS SECTION  *
************************/
{
    const CDV_patchSourcesDir = "other-platforms-support/cordova";
    const CDV_packageJson = `${CDV_patchSourcesDir}/package.json`;
    const CDV_pluginXml = `${CDV_patchSourcesDir}/plugin.xml`;
    const CDV_buildDir = `${buildDir}/cdv`;
    const CDV_tempDir = `${tmpDir}/cdv`
    const CDV_libDir = "lib";
    const CDV_outFileDir = `${CDV_buildDir}/${CDV_libDir}`;
    const CDV_pluginName = "PowerAuthPlugin"
    const CDV_outFile = `${CDV_outFileDir}/${CDV_pluginName}.js`

    const clearCDVall = () => rimraf([ CDV_buildDir, CDV_tempDir ]);
    const clearCDVtemp = () => rimraf([ CDV_tempDir ]);

    const copyCDVSourceFiles = () =>
        gulp
            .src("src/**/**.ts", { base: ".", allowEmpty: true })
            .pipe(gulp.dest(CDV_tempDir));

    const copyCDVPatchSourceFiles = () =>
        gulp
            .src([`${CDV_patchSourcesDir}/src/**/**.ts`], { base: CDV_patchSourcesDir })
            .pipe(gulp.dest(CDV_tempDir));

    const compileCDVTask = () => 
        build({
            entryPoints: [`${CDV_tempDir}/src/index.ts`],
            outfile: CDV_outFile,
            bundle: true,
            format: "cjs",
            target: "ios13",
            minify: true
        })

    const createCDVDtsTask = () =>
        gulp
            .src([`${CDV_tempDir}/src/PowerAuth**.ts`, `${CDV_tempDir}/src/*/**.ts`])
            .pipe(stripImportExport())
            .pipe(ts({ declaration: true, emitDeclarationOnly: true }))
            .pipe(concat(`typings.d.ts`))
            .pipe(gulp.dest(CDV_buildDir))

    // TODO: extract from the code
    const objectsToExport = [
        "PowerAuth",
        "PowerAuthError",
        "PowerAuthActivation",
        "PowerAuthAuthentication",
        "PowerAuthActivationCodeUtil",
        "PowerAuthTokenStore",
        "PowerAuthPassphraseMeter",
        "PowerAuthActivationState",
        "PowerAuthBiometryConfiguration",
        "PowerAuthBiometryStatus",
        "PowerAuthBiometryType",
        "PowerAuthClientConfiguration",
        "PowerAuthConfiguration",
        "PowerAuthErrorCode",
        "PowerAuthKeychainConfiguration",
        "PowerAuthKeychainProtection",
        "PowerAuthSharingConfiguration",
        "PowerAuthPassword",
        "BaseNativeObject",
        "PinTestIssue",
        "buildConfiguration",
        "buildClientConfiguration",
        "buildBiometryConfiguration",
        "buildKeychainConfiguration",
        "buildSharingConfiguration",
        "PowerAuthDebug",
        "NativeObjectRegister",
    ]

    const exportModules = () => {
        return new Promise(function(resolve) {
            objectsToExport.forEach((v) => {
                fs.writeFileSync(
                    `${CDV_outFileDir}/${v}.js`, 
                    // TODO: extract
                    `require("cordova-powerauth-mobile-sdk.${CDV_pluginName}");\nmodule.exports = ${CDV_pluginName}.${v};`
                );
            })
            resolve()
        });
    }

    // Copy sources based on package.json for cordova, but the source directory (the root project) doesn't contain all the mentioned files.
    // It's necessary to filter files not present in the source directory. Otherwise it fails completely.
    const cdvPackageRegex = /.*\/powerauth\/cdv\/.*/;
    const copyCDVFiles = () =>
        gulp
            .src(
                JSON.parse(fs.readFileSync(CDV_packageJson, 'utf8'))
                    .files.filter((file) => !file.startsWith(`${CDV_libDir}/`) && !file.match(cdvPackageRegex)), 
                { base: ".", allowEmpty: true })
            .pipe(gulp.dest(CDV_buildDir));

    const copyCDVPatchIOSFiles = () =>
        gulp
            .src([`${CDV_patchSourcesDir}/ios/PowerAuth/**`], { base: CDV_patchSourcesDir })
            .pipe(gulp.dest(CDV_buildDir));
            
    const copyCDVPatchAndroidFiles = () =>
        gulp
            .src([`${CDV_patchSourcesDir}/android/**`], { base: CDV_patchSourcesDir })
            .pipe(gulp.dest(CDV_buildDir));


    const copyCDVStaticFiles = () => 
        gulp
            .src([CDV_packageJson, CDV_pluginXml])
            .pipe(
                replace(
                    "<!-- PLACEHOLDER_MODULES -->",
                    [CDV_pluginName, ...objectsToExport]
                        .map((v) => `    <js-module src="${CDV_libDir}/${v}.js" name="${v}"><clobbers target="${v}" /></js-module>`)
                        .join("\n")
                )
            )
            .pipe(gulp.dest(CDV_buildDir));

    const packCDVPackage = () => exec(`pushd ${CDV_buildDir} && npm pack`);

    // join cordova compile and modify for export task
    var CDV_buildTask = gulp.series(
        clearCDVall, 
        copyCDVSourceFiles, 
        copyCDVPatchSourceFiles, 
        compileCDVTask, 
        createCDVDtsTask, 
        exportModules, 
        copyCDVFiles, 
        copyCDVPatchIOSFiles, 
        copyCDVPatchAndroidFiles, 
        copyCDVStaticFiles, 
        packCDVPackage, 
        clearCDVtemp
    );
}

let cleanBuild = () => rimraf([ buildDir ])
let cleanTemp = () => rimraf([ tmpDir ])

// first, delete output folders, then compile cordova and capacitor in parallel
const buildAllTask = gulp.series(
    cleanBuild,
    cleanTemp,
    gulp.parallel(
        RN_buildTask,
        //CAP_buildTask,
        CDV_buildTask
    ),
    cleanTemp
);

// watch and default task
gulp.task("watch", () => { gulp.watch("src/ts/**/*.ts", buildAllTask) });
gulp.task("default", buildAllTask);
gulp.task("clean", gulp.parallel(cleanBuild, cleanTemp));
gulp.task("rn", RN_buildTask);
gulp.task("cap", CAP_buildTask);
gulp.task("cdv", CDV_buildTask);
