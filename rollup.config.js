import fs from "node:fs"
import typescript from "rollup-plugin-typescript2"
import { dts } from "rollup-plugin-dts"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import terser from "@rollup/plugin-terser"
import layout from "./scripts/build-layout.cjs"

const buildTarget = process.env.BUILD_TARGET ?? "all"

const typescriptPlugin = (target, sourceIncludes) => typescript({
  include: sourceIncludes,
  tsconfig: layout.rollupTsconfig,
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
    include: sourceIncludes,
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
    fs.writeFileSync(layout.cordova.exportsFile, `${JSON.stringify(entries[0].exports.sort(), null, 2)}\n`)
  },
}

const rn = [
  {
    input: layout.rn.input,
    external: ["react-native"],
    output: {
      file: layout.rn.outputs.commonjs,
      format: "cjs",
      exports: "named",
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
    plugins: [
      nodeResolve({ extensions: [".js", ".ts"] }),
      typescriptPlugin("ES2019", [layout.rn.sourceGlob]),
    ],
  },
  {
    input: layout.rn.input,
    external: ["react-native"],
    output: {
      file: layout.rn.outputs.module,
      format: "es",
      sourcemap: true,
      sourcemapExcludeSources: true,
    },
    plugins: [
      nodeResolve({ extensions: [".js", ".ts"] }),
      typescriptPlugin("ES2019", [layout.rn.sourceGlob]),
    ],
  },
  {
    input: layout.rn.input,
    external: ["react-native"],
    output: {
      file: layout.rn.outputs.types,
      format: "es",
    },
    plugins: [dts({ compilerOptions: { stripInternal: true } })],
  },
]

const cordova = [
  {
    input: layout.cordova.input,
    output: {
      file: layout.cordova.outputs.bundle,
      format: "cjs",
      exports: "named",
      sourcemap: false,
    },
    plugins: [
      replaceDevConstant,
      nodeResolve({ extensions: [".js", ".ts"] }),
      typescriptPlugin("ES2019", [layout.cordova.sourceGlob]),
      terser(),
      writeCordovaExports,
    ],
  },
  {
    input: layout.cordova.input,
    output: {
      file: layout.cordova.outputs.types,
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
