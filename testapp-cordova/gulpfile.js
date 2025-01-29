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
const envConfig = dotenv.parse(fs.readFileSync(`${rnTestAppDir}/.env`))
console.log(`Reading env config env with pa server ${envConfig.POWERAUTH_SERVER_URL} and enrollment server ${envConfig.ENROLLMENT_SERVER_URL}`)
const envConfigStr = `const EnvConfig = ${JSON.stringify(envConfig)};`

const copyTestFiles = () =>
    gulp
        .src([`${rnTestAppDir}/src/testbed/**/**.ts`, `${rnTestAppDir}/src/Config.ts`, `${rnTestAppDir}/src/TestExecutor.ts`, `${rnTestAppDir}/_tests/**/**.ts`], { base: rnTestAppDir })
        .pipe(replace(/import {[a-zA-Z }\n,]+from "react-native-powerauth-mobile-sdk";/g, ''))
        .pipe(replace('import { Platform } from "react-native";', platformClass))
        .pipe(replace('import { Config as EnvConfig } from "react-native-config";', envConfigStr))
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
const prepareIOS = () => exec("npx cordova prepare ios")

// patch testapp files
const patchNativeFiles = () =>
    gulp
        .src("patch-files/platforms/**/**", { base: "patch-files" })
        .pipe(gulp.dest("."))

const patchIOSPlists = () => {

    const plistPath = "platforms/ios/PowerAuthTest/PowerAuthTest-Info.plist";
    const entlPaths = ["platforms/ios/PowerAuthTest/Entitlements-Debug.plist", "platforms/ios/PowerAuthTest/Entitlements-Release.plist"]
    const plistBuddy = "/usr/libexec/PlistBuddy"
    const faceIdKey = "NSFaceIDUsageDescription"
    const secGroupKey = "com.apple.security.application-groups"
    const secGroupValue = "group.com.wultra.testGroup"

    return new Promise((resolve) => {
        // we need to modify ios plist so we can test on faceid phones. The command check if the faceid key exist and if not, it will add it
        exec(`${plistBuddy} -c "print :${faceIdKey}" ${plistPath} || ${plistBuddy} -c "add :${faceIdKey} string For Tests" ${plistPath}`)

        // we also need to add entitlements to ensure that the shared data tests will work
        entlPaths.forEach((entlFile) => {
            exec(`${plistBuddy} -c "print :${secGroupKey}:0" ${entlFile} || (${plistBuddy} -c "add :${secGroupKey} array" ${entlFile} && ${plistBuddy} -c "add :${secGroupKey}:0 string ${secGroupValue}" ${entlFile})`)
        })

        resolve()
    });
}


gulp.task("default", gulp.series(
    cleanTemp,
    copyTestFiles,
    copyAppFiles,
    compile,
    cleanTemp,
    prepareIOS,
    patchNativeFiles,
    patchIOSPlists,
));