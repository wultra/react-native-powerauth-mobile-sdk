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

Check grammar only in public documentation/JSDoc, and only when the PR base is
not a `release/*` branch. Public API, behavior, or release changes need matching
user-facing documentation and changelog coverage; internal refactors do not.

## Repository map and release rules

This Yarn 4.3.1 monorepo publishes the React Native and Cordova wrappers:

* `packages/react-native-powerauth-mobile-sdk/src/` is the TypeScript React
  Native API, with Android in `android/src/main/java/com/wultra/android/powerauth/reactnative/`
  and iOS in `ios/PowerAuth/`.
* `packages/cordova-powerauth-mobile-sdk/src/` is the TypeScript Cordova API,
  with the native plugin in its `android/` and `ios/PowerAuth/` trees.
* `packages/mobile-testbed`, `packages/mobile-test-runner`, and
  `packages/mobile-test-reporter` implement the end-to-end protocol; do not
  confuse generated `dist/` and `build/` output with source.
* `testapp/` and `testapp-cordova/` are integration hosts; `scripts/e2e/` and
  `.github/workflows/mobile-e2e.yml` exercise Android and iOS.

The package version substituted at deployment is
`%DEPLOY_VERSION%` in the package manifests. A release-to-`develop` change must
declare `0.0.1-dev` wherever it declares a package version; do not accept a
release number leaking back to development. Treat `packages/*/build`,
`packages/*/dist`, `node_modules`, platform-generated files, and app build
directories as generated unless the PR intentionally changes their generator.

Relevant validation commands are `yarn build`, `yarn lint`, targeted workspace
commands (`yarn workspace react-native-powerauth-mobile-sdk build`), and the
appropriate `yarn buildReactIos`, `yarn buildReactAndroid`,
`yarn buildCordovaIos`, or `yarn buildCordovaAndroid`. E2E entry points are
`yarn e2e:local:rn`, `yarn e2e:local:cordova`, and `yarn e2e:local:full`.

## API and native-boundary checks

The published React Native entry point and declarations must agree with
`packages/react-native-powerauth-mobile-sdk/src/index.ts` and `lib/index.d.ts`;
the Cordova equivalent is its package source/build entry. Review changes to
`PowerAuth`, activation/configuration/authentication models, password,
encryptor/decryptor, token store, secure vault, signature, biometry, and
native-object registration as compatibility-sensitive.

For every JS/TypeScript-to-native operation, trace the complete bridge:

1. public TypeScript method and its argument/result serialization;
2. Android Java and iOS Objective-C implementation/export name;
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
