import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rnDir = path.resolve(packageDir, "../lib-rn");
const sharedDir = path.resolve(packageDir, "../lib-shared");
const outputDir = path.join(packageDir, "build/cdv");

async function copy(source, destination, options = {}) {
    await cp(source, destination, { recursive: true, ...options });
}

function replaceRequired(content, search, replacement, description) {
    if (!content.includes(search)) {
        throw new Error(`Cannot replace ${description}: expected placeholder was not found.`);
    }
    return content.replace(search, replacement);
}

async function prepare() {
    await rm(outputDir, { recursive: true, force: true });
    await mkdir(path.join(outputDir, "lib"), { recursive: true });

    const rnPackage = JSON.parse(await readFile(path.join(rnDir, "package.json"), "utf8"));
    const cordovaPackage = replaceRequired(
        await readFile(path.join(packageDir, "package.json"), "utf8"),
        "<!-- PLACEHOLDER_VERSION -->",
        rnPackage.version,
        "Cordova package version",
    );
    await writeFile(path.join(outputDir, "package.json"), cordovaPackage);

    await copy(path.join(sharedDir, "ios/PowerAuth"), path.join(outputDir, "ios/PowerAuth"));
    await copy(path.join(rnDir, "ios/PowerAuth.xcodeproj"), path.join(outputDir, "ios/PowerAuth.xcodeproj"));
    await copy(path.join(rnDir, "ios/PowerAuth.xcworkspace"), path.join(outputDir, "ios/PowerAuth.xcworkspace"));
    const projectPath = path.join(outputDir, "ios/PowerAuth.xcodeproj/project.pbxproj");
    const cordovaProject = replaceRequired(
        await readFile(projectPath, "utf8"),
        "path = ../native/ios/PowerAuth;",
        "path = PowerAuth;",
        "Cordova Xcode native source path",
    );
    await writeFile(projectPath, cordovaProject);
    await copy(
        path.join(sharedDir, "android/src/main/java/com/wultra/android/powerauth/js"),
        path.join(outputDir, "android/src/main/java/com/wultra/android/powerauth/js"),
    );

    await copy(path.join(packageDir, "ios"), path.join(outputDir, "ios"));
    await copy(path.join(packageDir, "android"), path.join(outputDir, "android"));
}

async function finalize() {
    const exports = JSON.parse(await readFile(path.join(outputDir, "lib/.exports.json"), "utf8"));
    const pluginName = "PowerAuthPlugin";

    // Cordova exposes the SDK as globals. Keep its declaration file ambient, as before.
    const typingsPath = path.join(outputDir, "typings.d.ts");
    const ambientTypings = (await readFile(typingsPath, "utf8"))
        .replace(/^export(?: type)? \{.*\};\n?/gm, "");
    await writeFile(typingsPath, ambientTypings);

    for (const exportedName of exports) {
        const wrapper = `require("cordova-powerauth-mobile-sdk.${pluginName}");\nmodule.exports = ${pluginName}.${exportedName};`;
        await writeFile(path.join(outputDir, `lib/${exportedName}.js`), wrapper);
    }

    const modules = [pluginName, ...exports]
        .map(name => `    <js-module src="lib/${name}.js" name="${name}"><clobbers target="${name}" /></js-module>`)
        .join("\n");
    const rnPackage = JSON.parse(await readFile(path.join(rnDir, "package.json"), "utf8"));
    const pluginTemplate = await readFile(path.join(packageDir, "plugin.xml"), "utf8");
    const versionedPlugin = replaceRequired(
        pluginTemplate,
        "<!-- PLACEHOLDER_VERSION -->",
        rnPackage.version,
        "Cordova plugin version",
    );
    const pluginXml = replaceRequired(
        versionedPlugin,
        "<!-- PLACEHOLDER_MODULES -->",
        modules,
        "Cordova JavaScript modules",
    );
    await writeFile(path.join(outputDir, "plugin.xml"), pluginXml);
    await rm(path.join(outputDir, "lib/.exports.json"));

    const packed = spawnSync("npm", ["pack"], {
        cwd: outputDir,
        stdio: "inherit",
        env: {
            ...process.env,
            npm_config_cache: "/tmp/powerauth-mobile-sdk-npm-cache",
            npm_config_workspaces: "false",
        },
    });
    if (packed.status !== 0) {
        process.exit(packed.status ?? 1);
    }
}

const command = process.argv[2];
if (command === "prepare") {
    await prepare();
} else if (command === "finalize") {
    await finalize();
} else {
    throw new Error(`Unknown command: ${command}`);
}
