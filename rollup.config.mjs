import typescript from "rollup-plugin-typescript2";
import { dts } from "rollup-plugin-dts";
import { nodeResolve } from "@rollup/plugin-node-resolve";

const sharedInput = "packages/lib-shared/js/index.ts";
const rnDir = "packages/lib-rn";
const cordovaDir = "packages/lib-cordova";

const writeExportsManifest = {
    name: "write-cordova-exports-manifest",
    generateBundle(_options, bundle) {
        const chunk = Object.values(bundle).find(output => output.type === "chunk" && output.isEntry);
        if (!chunk) {
            this.error("Cordova entry chunk was not generated.");
        }
        this.emitFile({
            type: "asset",
            fileName: ".exports.json",
            source: `${JSON.stringify(chunk.exports, null, 2)}\n`,
        });
    },
};

const replaceCordovaDevFlag = {
    name: "replace-cordova-dev-flag",
    transform(code, id) {
        if (!id.includes("/lib-shared/js/")) {
            return null;
        }
        return { code: code.replace(/\b__DEV__\b/g, "false"), map: null };
    },
};

const rn = [
    {
        input: `${rnDir}/src/index.ts`,
        external: ["react-native"],
        output: [
            { file: `${rnDir}/lib/module/index.js`, format: "es", sourcemap: true },
            { file: `${rnDir}/lib/commonjs/index.js`, format: "cjs", exports: "named", sourcemap: true },
        ],
        plugins: [
            typescript({
                tsconfig: `${rnDir}/tsconfig.json`,
                include: [`${rnDir}/src/**/*.ts`, "packages/lib-shared/js/**/*.ts"],
                clean: true,
            }),
            nodeResolve({ extensions: [".js", ".ts"] }),
        ],
    },
    {
        input: sharedInput,
        output: { file: `${rnDir}/lib/typescript/index.d.ts`, format: "es" },
        plugins: [dts()],
    },
];

const cordova = [
    {
        input: `${cordovaDir}/src/index.ts`,
        output: {
            file: `${cordovaDir}/build/cdv/lib/PowerAuthPlugin.js`,
            format: "cjs",
            exports: "named",
            sourcemap: true,
        },
        plugins: [
            replaceCordovaDevFlag,
            typescript({
                tsconfig: `${cordovaDir}/tsconfig.json`,
                include: [`${cordovaDir}/src/**/*.ts`, "packages/lib-shared/js/**/*.ts"],
                clean: true,
            }),
            nodeResolve({ extensions: [".js", ".ts"] }),
            writeExportsManifest,
        ],
    },
    {
        input: sharedInput,
        output: { file: `${cordovaDir}/build/cdv/typings.d.ts`, format: "es" },
        plugins: [dts()],
    },
];

export default commandLineArgs => {
    if (commandLineArgs.configTarget === "rn") {
        return rn;
    }
    if (commandLineArgs.configTarget === "cordova") {
        return cordova;
    }
    return [...rn, ...cordova];
};
