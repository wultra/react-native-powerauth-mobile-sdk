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

    private static detectPlatform(): string {
        return cordova.platformId
    }
}
`

// parse environment configuration
const envConfig = dotenv.parse(fs.readFileSync(`${rnTestAppDir}/.env`))
console.log(`Reading env config env with PA Cloud server ${envConfig.POWERAUTH_CLOUD_URL} and enrollment server ${envConfig.ENROLLMENT_SERVER_URL}`)
const envConfigStr = `const EnvConfig = ${JSON.stringify(envConfig)};`

const copyTestFiles = () =>
    gulp
        .src([`${rnTestAppDir}/src/IntegrationUtils.ts`, `${rnTestAppDir}/src/TestExecutor.ts`, `${rnTestAppDir}/_tests/**/**.ts`], { base: rnTestAppDir })
        .pipe(replace(/import {[a-zA-Z }\n,]+from "react-native-powerauth-mobile-sdk";/g, ''))
        .pipe(replace(/import {[a-zA-Z }\n,]+from "react-native-powerauth-mobile-sdk"/g, ''))
        .pipe(replace(/import\s*\{\s*Platform\s*\}\s*from\s*["']react-native["'];?/g, platformClass))
        .pipe(replace('import { Config as EnvConfig } from "react-native-config"', envConfigStr))
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
        // Resolve workspace packages from source to build the e2e infra packages always
        mainFields: ['source', 'module', 'main'],
        target: "ios13",
        // minify: true // do not minify for easier debug, also, it doesn't work :)
    })

// to make sure all files are copied in the proper place
const prepareIOS = () => exec("npx cordova prepare ios")
const prepareAndroid = () => exec("npx cordova prepare android")

// patch testapp files
const patchNativeFiles = () =>
    gulp
        .src("patch-files/platforms/**/**", { base: "patch-files" })
        .pipe(gulp.dest("."))

const patchIOSPlists = () => {

    const appDirCandidates = ["platforms/ios/App", "platforms/ios/PowerAuthTest"];
    const appDir = appDirCandidates.find((dir) => fs.existsSync(dir));
    if (!appDir) {
        console.warn("iOS app directory not found, skipping plist patch.");
        return Promise.resolve();
    }

    const plistPath = appDir.endsWith("/App")
        ? `${appDir}/App-Info.plist`
        : `${appDir}/PowerAuthTest-Info.plist`;
    const entlPaths = [`${appDir}/Entitlements-Debug.plist`, `${appDir}/Entitlements-Release.plist`]
    const plistBuddy = "/usr/libexec/PlistBuddy"
    const faceIdKey = "NSFaceIDUsageDescription"
    const atsKey = "NSAppTransportSecurity"
    const atsAllowsArbitraryLoadsKey = "NSAllowsArbitraryLoads"
    const atsAllowsArbitraryLoadsInWebContentKey = "NSAllowsArbitraryLoadsInWebContent"
    const atsExceptionDomainsKey = "NSExceptionDomains"
    const secGroupKey = "com.apple.security.application-groups"
    const secGroupValue = "group.com.wultra.testGroup"
    const atsExceptionHosts = ["127.0.0.1", "localhost"]

    return new Promise((resolve) => {
        // we need to modify ios plist so we can test on faceid phones. The command checks if the faceid key exist and if not, it will add it
        exec(`${plistBuddy} -c "print :${faceIdKey}" ${plistPath} || ${plistBuddy} -c "add :${faceIdKey} string For Tests" ${plistPath}`)

        // allow test app to reach local/insecure endpoints - TODO: this is now needed even with the content of config.xml, lets re-test with later cordova-ios releases
        exec(`${plistBuddy} -c "print :${atsKey}" ${plistPath} || ${plistBuddy} -c "add :${atsKey} dict" ${plistPath}`)
        exec(`${plistBuddy} -c "print :${atsKey}:${atsAllowsArbitraryLoadsKey}" ${plistPath} || ${plistBuddy} -c "add :${atsKey}:${atsAllowsArbitraryLoadsKey} bool true" ${plistPath}`)
        exec(`${plistBuddy} -c "print :${atsKey}:${atsAllowsArbitraryLoadsInWebContentKey}" ${plistPath} || ${plistBuddy} -c "add :${atsKey}:${atsAllowsArbitraryLoadsInWebContentKey} bool true" ${plistPath}`)
        exec(`${plistBuddy} -c "print :${atsKey}:${atsExceptionDomainsKey}" ${plistPath} || ${plistBuddy} -c "add :${atsKey}:${atsExceptionDomainsKey} dict" ${plistPath}`)
        atsExceptionHosts.forEach((host) => {
            exec(`${plistBuddy} -c "print :${atsKey}:${atsExceptionDomainsKey}:${host}" ${plistPath} || ${plistBuddy} -c "add :${atsKey}:${atsExceptionDomainsKey}:${host} dict" ${plistPath}`)
            exec(`${plistBuddy} -c "print :${atsKey}:${atsExceptionDomainsKey}:${host}:NSExceptionAllowsInsecureHTTPLoads" ${plistPath} || ${plistBuddy} -c "add :${atsKey}:${atsExceptionDomainsKey}:${host}:NSExceptionAllowsInsecureHTTPLoads bool true" ${plistPath}`)
            exec(`${plistBuddy} -c "print :${atsKey}:${atsExceptionDomainsKey}:${host}:NSIncludesSubdomains" ${plistPath} || ${plistBuddy} -c "add :${atsKey}:${atsExceptionDomainsKey}:${host}:NSIncludesSubdomains bool true" ${plistPath}`)
        })

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
    prepareAndroid,
    patchNativeFiles,
    patchIOSPlists,
));