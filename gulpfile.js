// Dependencies
const gulp = require("gulp"); // gulp itself
const ts = require("gulp-typescript"); // to be able to compiles typescript
const footer = require("gulp-footer"); // file appender
const stripImportExport = require("gulp-strip-import-export"); // import/export removal to be able to compile into single file js
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
    const CDV_tsConfig = `${CDV_patchSourcesDir}/tsconfig.json`;
    const CDV_buildDir = `${buildDir}/cdv`;
    const CDV_tempDir = `${tmpDir}/cdv`
    // order matters in sources!
    const CDV_sources = [ "src/internal/NativePowerAuth.ts", "src/internal/NativeModulesProvider.ts", "src/debug/*.ts", "src/internal/*.ts", "src/model/*.ts", "src/PowerAuth**.ts", "src/custom/ModuleExport.ts" ];
    const CDV_libDir = "lib";
    const CDV_outFileDir = `${CDV_buildDir}/${CDV_libDir}`;

    const clearCDVall = () => rimraf([ CDV_buildDir, CDV_tempDir ]);
    const clearCDVtemp = () => rimraf([ CDV_tempDir ]);

    const copyCDVSourceFiles = () =>
        gulp
            .src(CDV_sources, { base: ".", allowEmpty: true })
            .pipe(gulp.dest(CDV_tempDir));

    const copyCDVPatchSourceFiles = () =>
        gulp
            .src([`${CDV_patchSourcesDir}/src/**/**.ts`], { base: CDV_patchSourcesDir })
            .pipe(gulp.dest(CDV_tempDir));
    
    const compileCDVTask = () =>
        gulp
            .src(CDV_sources.map((v) => `${CDV_tempDir}/${v}`), { base: CDV_tempDir })
            .pipe(stripImportExport())
            .pipe(ts(CDV_tsConfig))
            .pipe(gulp.dest(CDV_outFileDir));

    const copyCDVFiles = () =>
        gulp
            .src(JSON.parse(fs.readFileSync(CDV_packageJson, 'utf8')).files.filter((file) => !file.startsWith(`${CDV_libDir}/`) && !file != "plugin.xml"), { base: "." })
            .pipe(gulp.dest(CDV_buildDir));

    const copyCDVPatchIOSFiles = () =>
        gulp
            .src([`${CDV_patchSourcesDir}/ios/PowerAuth/**.{h,mm}`], { base: CDV_patchSourcesDir })
            .pipe(gulp.dest(CDV_buildDir));

    const copyCDVSupportFiles = () => 
        gulp
            .src([CDV_packageJson, CDV_pluginXml])
            .pipe(gulp.dest(CDV_buildDir));

    const packCDVPackage = () => exec(`pushd ${CDV_buildDir} && npm pack`);

    // join cordova compile and modify for export task
    var CDV_buildTask = gulp.series(clearCDVall, copyCDVSourceFiles, copyCDVPatchSourceFiles, compileCDVTask, copyCDVFiles, copyCDVPatchIOSFiles, copyCDVSupportFiles, packCDVPackage, clearCDVtemp);
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
