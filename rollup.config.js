import fs from "node:fs"
import typescript from "rollup-plugin-typescript2"
import { dts } from "rollup-plugin-dts"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import terser from "@rollup/plugin-terser"

const buildTarget = process.env.BUILD_TARGET ?? "all"

const rnInput = "packages/lib-rn/build/rn/src/index.ts"
const cordovaInput = "packages/lib-cordova/.build/cdv/src/index.ts"
const cordovaExportsFile = "packages/lib-cordova/.build/cdv/runtime-exports.json"
const rollupTsconfig = "tsconfig.rollup.json"

const typescriptPlugin = (tsconfig, target, include) => typescript({
  include,
  tsconfig,
  tsconfigOverride: {
    compilerOptions: {
      allowImportingTsExtensions: false,
      declaration: false,
      declarationMap: false,
      module: "ESNext",
      moduleResolution: "Bundler",
      noEmit: false,
      sourceMap: true,
      target,
    },
  },
  useTsconfigDeclarationDir: false,
})

const replaceDevConstant = {
  name: "replace-dev-constant",
  transform(code) {
    return code.includes("__DEV__")
      ? { code: code.replaceAll("__DEV__", "false"), map: null }
      : null
  },
}

const writeCordovaExports = {
  name: "write-cordova-exports",
  writeBundle(_, bundle) {
    const entries = Object.values(bundle).filter((output) => output.type === "chunk" && output.isEntry)
    if (entries.length !== 1) throw new Error(`Expected one Cordova entry chunk, found ${entries.length}`)
    fs.writeFileSync(cordovaExportsFile, `${JSON.stringify(entries[0].exports.sort(), null, 2)}\n`)
  },
}

const rn = [
  {
    input: rnInput,
    external: ["react-native"],
    output: {
      file: "packages/lib-rn/build/rn/lib/commonjs/index.js",
      format: "cjs",
      exports: "named",
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
    plugins: [
      nodeResolve({ extensions: [".js", ".ts"] }),
      typescriptPlugin(rollupTsconfig, "ES2019", ["packages/lib-rn/build/rn/src/**/*.ts"]),
    ],
  },
  {
    input: rnInput,
    external: ["react-native"],
    output: {
      file: "packages/lib-rn/build/rn/lib/module/index.js",
      format: "es",
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
    plugins: [
      nodeResolve({ extensions: [".js", ".ts"] }),
      typescriptPlugin(rollupTsconfig, "ES2019", ["packages/lib-rn/build/rn/src/**/*.ts"]),
    ],
  },
  {
    input: rnInput,
    external: ["react-native"],
    output: {
      file: "packages/lib-rn/build/rn/lib/typescript/index.d.ts",
      format: "es",
    },
    plugins: [dts({ compilerOptions: { stripInternal: true } })],
  },
]

const cordova = [
  {
    input: cordovaInput,
    output: {
      file: "packages/lib-cordova/build/cdv/lib/index.js",
      format: "cjs",
      exports: "named",
      sourcemap: false,
    },
    plugins: [
      replaceDevConstant,
      nodeResolve({ extensions: [".js", ".ts"] }),
      typescriptPlugin(
        rollupTsconfig,
        "ES2019",
        ["packages/lib-cordova/.build/cdv/src/**/*.ts"],
      ),
      terser(),
      writeCordovaExports,
    ],
  },
  {
    input: cordovaInput,
    output: {
      file: "packages/lib-cordova/build/cdv/lib/index.d.ts",
      format: "es",
    },
    plugins: [dts({ compilerOptions: { stripInternal: true } })],
  },
]

const config = buildTarget === "rn"
  ? rn
  : buildTarget === "cordova"
    ? cordova
    : [...rn, ...cordova]

export default config
