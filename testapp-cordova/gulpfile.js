const gulp = require("gulp");
const replace = require('gulp-replace');
const { build } = require("esbuild");
const { rimraf } = require('rimraf'); // folder cleaner
const exec = require('child_process').exec;
const dotenv = require('dotenv');
const fs = require('fs');

const tempDir = ".temp"
const rnTestAppDir = "../testapp"
const outFile = "www/js/index.js"

let cleanTemp = () => rimraf([ tempDir ])

// TODO: do better
const platformClass = `
class Platform {
    
    static OS = this.detectPlatform()

    // TODO: we should probably make this more robust
    private static detectPlatform(): string {

        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            return "ios";
        }
    
        return "android"; // we consider everything else android
    }
}
`

// parse environment configuration
const getEnvConfig = dotenv.parse(fs.readFileSync(`${rnTestAppDir}/.env`))
const envConfig = `const EnvConfig = ${JSON.stringify(getEnvConfig)};`

const copyTestFiles = () =>
    gulp
        .src([`${rnTestAppDir}/src/testbed/**/**.ts`, `${rnTestAppDir}/src/Config.ts`, `${rnTestAppDir}/_tests/**/**.ts`], { base: rnTestAppDir })
        .pipe(replace(/import {[a-zA-Z }\n,]+from "react-native-powerauth-mobile-sdk";/g, ''))
        .pipe(replace('import { Platform } from "react-native";', platformClass))
        .pipe(replace('import { Config as EnvConfig } from "react-native-config";', envConfig))
        .pipe(gulp.dest(tempDir));

const copyAppFiles = () =>
    gulp
        .src(["src/App.tsx"], { base: "." })
        .pipe(gulp.dest(tempDir));

const compile = () => 
    build({
        entryPoints: [`${tempDir}/src/App.tsx`],
        outfile: outFile,
        bundle: true,
        target: "ios13",
        // minify: true // do not minify for easier debug
    })

// to make sure all files are copied in the proper place
const prepareIOS = () => exec("cordova prepare ios")

gulp.task("default", gulp.series(
    cleanTemp,
    copyTestFiles,
    copyAppFiles,
    compile,
    cleanTemp,
    prepareIOS,
));