---
name: code-review
description: Review pull requests in the PowerAuth JavaScript Mobile SDK repository. Use when reviewing React Native, Cordova, native bridge, public API, security, or release changes.
---

# PowerAuth JavaScript Mobile SDK review

## Review contract

Review the PR target, head, and current checkout before examining the diff. This
repository's normal target is `develop`; release targets are `release/a.b.x`.
Default to approval. Report only a concrete, reproducible defect introduced by
the PR, with its file and line, user/security impact, and a specific correction.
Do not make style, formatting, workflow/CI, speculative, or “consider adding
tests” comments. Do not post review content to GitHub without the user's
approval; any content that could be posted must start with `🤖`.

The PR CI workflows intentionally create a visible cancelled first attempt for
`pull_request: synchronize` events. The first step of each E2E job cancels that
attempt before checkout or expensive build/E2E work starts; rerunning the
workflow or an individual job is the supported way to execute CI for that
exact commit. The cancellation log explains that this saves CI time. Do not
report this expected cancellation or the absence of a
custom aggregate status as a PR defect.

Check grammar only in public documentation/JSDoc, and only when the PR base is
not a `release/*` branch. Public API, behavior, or release changes need matching
user-facing documentation and changelog coverage; internal refactors do not.

## Repository map and release rules

This Yarn 4.3.1 monorepo publishes the React Native and Cordova wrappers:

* `packages/lib-shared/js/` is the shared TypeScript API. Shared Android bridge
  implementations live in `packages/lib-shared/android/src/main/java/com/wultra/android/powerauth/js/`,
  and shared iOS code lives in `packages/lib-shared/ios/PowerAuth/`.
* `packages/lib-rn/` contains the React Native manifest, native adapters,
  platform header, and podspec. Its Yarn workspace name remains
  `react-native-powerauth-mobile-sdk`.
* `packages/lib-cordova/` contains the Cordova manifest, `plugin.xml` template,
  native adapters, and TypeScript overrides in `src/internal/`. Its Yarn
  workspace name remains `cordova-powerauth-mobile-sdk`.
* `scripts/build.mjs` stages shared sources with platform-specific files and
  invokes `rollup.config.js` to build both wrappers. `scripts/build-layout.cjs`
  defines source and output paths; `scripts/verify-packages.mjs` checks the
  packed archives.
* `packages/mobile-testbed`, `packages/mobile-test-runner`, and
  `packages/mobile-test-reporter` implement the end-to-end protocol; do not
  confuse generated `dist/` and `build/` output with source.
* `testapp/` and `testapp-cordova/` are integration hosts; `scripts/e2e/` and
  `.github/workflows/mobile-e2e.yml` exercise Android and iOS.

The package version substituted at deployment is
`%DEPLOY_VERSION%` in the package manifests. A release-to-`develop` change must
declare `0.0.1-dev` wherever it declares a package version; do not accept a
release number leaking back to development. Treat `packages/*/build`,
`packages/*/dist`, `packages/lib-cordova/.build`, `node_modules`,
platform-generated files, and app build directories as generated unless the PR
intentionally changes their generator.

Relevant validation commands are `yarn build`, `yarn packAll` (build, pack, and
verify both wrappers), `yarn lint`, targeted workspace
commands (`yarn workspace react-native-powerauth-mobile-sdk build`), and the
appropriate `yarn buildReactIos`, `yarn buildReactAndroid`,
`yarn buildCordovaIos`, or `yarn buildCordovaAndroid`. E2E entry points are
`yarn e2e:local:rn`, `yarn e2e:local:cordova`, and `yarn e2e:local:full`.

## API and native-boundary checks

The shared API entry point is `packages/lib-shared/js/index.ts`. React Native
stages it in `packages/lib-rn/build/src/index.ts` and publishes
`lib/commonjs/index.js`, `lib/module/index.js`, and `lib/typescript/index.d.ts`
from that staged package. Cordova overlays `packages/lib-cordova/src/` onto
the shared sources in `packages/lib-cordova/.build/src/` and publishes
`lib/index.js` and ambient declarations in `lib/index.d.ts` from
`packages/lib-cordova/build/`. Check the staged manifests as well as the source
manifests: the build rewrites React Native entry paths and generates Cordova
compatibility shims and `plugin.xml` module entries. Review changes to
`PowerAuth`, activation/configuration/authentication models, password,
encryptor/decryptor, token store, secure vault, signature, biometry, and
native-object registration as compatibility-sensitive.

For every JS/TypeScript-to-native operation, trace the complete bridge:

1. public TypeScript method and its argument/result serialization;
2. shared Android Java/Kotlin and iOS Objective-C implementation/export name,
   including the React Native or Cordova adapter;
3. matching error code, nullable-value representation, and promise/callback
   completion on every path; and
4. native PowerAuth lifetime and explicit release/destroy semantics.

Flag a bridge change only when a method name, argument key/type, return shape,
error, or completion behavior diverges across these layers. Never expose raw
activation material, passwords, possession keys, tokens, encryption keys, or
request signatures in logs, test reports, URLs, or JavaScript exceptions.
Preserve native secure-storage/keychain configuration and cryptographic
algorithm selection rather than reimplementing them in JavaScript.

Review concurrent promise/callback flows for double resolution, lost native
callbacks, use after disposal, or callbacks delivered after a JS object is
released. Operations changing activation, token, password, encryptor, or
time-synchronization state must remain serialized as the native SDK expects.

## Network, serialization, and tests

Inspect `node-fetch` use, testbed/runner HTTP endpoints, and event/report
protocol changes for explicit local binding, bounded request parsing, correct
content/error handling, and no sensitive payload retention. Validate data at
the TypeScript/native boundary rather than trusting a cast from JS maps.

For a behavior change in either wrapper, require focused coverage in the
appropriate package or host/E2E scenario when an existing test seam covers it.
For test-protocol changes, keep `mobile-testbed`, runner, reporter, and both
hosts compatible. Public API additions/removals require the package README,
`docs/`, and changelog/release material where applicable.
