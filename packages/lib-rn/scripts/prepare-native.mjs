import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharedDir = path.resolve(packageDir, "../lib-shared");
const nativeOutput = path.join(packageDir, "native");
const androidOutput = path.join(
    nativeOutput,
    "android/src/main/java/com/wultra/android/powerauth/js",
);
const iosOutput = path.join(nativeOutput, "ios/PowerAuth");

async function copyDirectory(source, destination) {
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
}

await rm(nativeOutput, { recursive: true, force: true });
await copyDirectory(
    path.join(sharedDir, "android/src/main/java/com/wultra/android/powerauth/js"),
    androidOutput,
);

await copyDirectory(path.join(sharedDir, "ios/PowerAuth"), iosOutput);
await cp(path.join(packageDir, "ios/ReactNative"), iosOutput, { recursive: true });

console.log("Prepared shared native sources for the React Native package.");
