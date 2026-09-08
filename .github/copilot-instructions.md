# PowerAuth JavaScript Mobile SDK

This Yarn 4.3.1 monorepo publishes React Native and Cordova wrappers around the
native PowerAuth SDKs.

## Build, test, and lint

Run commands from the repository root. Use Node 24 to match CI, enable Corepack
with `corepack enable`, and install with `yarn install --immutable`.

- Build both wrappers with `yarn build`; use `yarn build:rn` or `yarn build:cdv`
  for one wrapper.
- `yarn packAll` builds, packs, and verifies both published archives. The
  targeted equivalents are `yarn packReactNative` and `yarn packCordova`;
  `yarn verify:packages` verifies archives that already exist.
- Type-check the React Native package with
  `yarn workspace react-native-powerauth-mobile-sdk typecheck`. For E2E
  infrastructure, use `yarn workspace mobile-testbed typecheck`,
  `yarn workspace mobile-test-reporter typecheck`, or
  `yarn workspace mobile-test-runner typecheck`.
  A Cordova build performs its TypeScript compilation through Rollup.
- Run `yarn lint:sdk` for shared SDK, Cordova override, and build-script
  sources; run `yarn lint:testapp` for the React Native host, or `yarn lint`
  for both.
- Build native integration hosts with `yarn buildReactIos`,
  `yarn buildReactAndroid`, `yarn buildCordovaIos`, or
  `yarn buildCordovaAndroid`.
- Run on-device E2E suites with `yarn e2e:local:rn`,
  `yarn e2e:local:cordova`, or `yarn e2e:local:full`. These require
  `testapp/.env`, including a scheme-qualified `TEST_COLLECTOR_URL`; never
  commit that environment file. For one platform, first run
  `yarn e2e:clean && yarn e2e:infra:build`, then, for example,
  `node scripts/e2e/run.cjs rn --platforms android`. Replace `rn` with
  `cordova` or `full`, and `android` with `ios`, as needed. See
  [E2E-Tests.md](../E2E-Tests.md) for native tooling and environment setup.

There is no Jest runner or CLI test-name filter. Tests in `testapp/_tests/`
run inside the mobile app. To focus one method within a suite, temporarily set
`suite.runOnlyOneTest = 'testMethodName'` on its instance in
`testapp/_tests/AllTests.ts`, then launch the desired E2E/host command. Other
registered suites still run unless temporarily excluded from the suite lists
used by that host. Restore the full lists and remove filters before committing.
Test discovery uses `test*` on both platforms, plus `androidTest*` or `iosTest*`
on the matching platform.

## Repository layout and build

- `packages/lib-shared/` contains the shared TypeScript API in `js/` and native
  implementations in `android/` and `ios/`. The public API is assembled by
  `packages/lib-shared/js/index.ts`.
- `packages/lib-rn/` contains React Native adapters, platform configuration,
  and the podspec. Its workspace name is
  `react-native-powerauth-mobile-sdk`.
- `packages/lib-cordova/` contains Cordova adapters and the `plugin.xml`
  template. Its `src/` files overlay shared TypeScript internals during the
  build. Its workspace name is
  `cordova-powerauth-mobile-sdk`.
- `scripts/build.mjs` stages shared and wrapper-specific files according to
  `scripts/build-layout.cjs`, generates `SDKVersion.ts`, and invokes
  `rollup.config.js`. React Native publishes CommonJS, ES module, and declaration
  entries. Cordova publishes one minified CommonJS bundle plus ambient
  declarations, generated legacy export shims, and an expanded `plugin.xml`.
- `testapp/` and `testapp-cordova/` are the integration hosts. Shared E2E
  infrastructure lives in `packages/mobile-testbed` (suite execution),
  `packages/mobile-test-reporter` (device-to-host events),
  `packages/mobile-test-runner` (HTTP collector/JUnit artifacts), and
  `scripts/e2e/`. Cordova's Gulp preparation deliberately bundles the React
  Native host's shared tests, so test changes normally belong in
  `testapp/_tests/`, not in generated Cordova `www/` output.

## Architecture: how a native-backed call flows

Trace every affected layer when adding or changing a native-backed method:

1. The public TypeScript API in `packages/lib-shared/js/` and its exports in
   `index.ts`.
2. The shared native interface and invocation through `NativeWrapper` and
   `NativeModulesProvider`, including the Cordova overrides in
   `packages/lib-cordova/src/internal/`.
3. Android's React Native `@ReactMethod` adapter and Cordova `execute` dispatch,
   both delegating to the shared `*JsModule` implementation.
4. The shared iOS implementation in `packages/lib-shared/ios/PowerAuth/`,
   exported for each wrapper through `PAJS.h` bridge macros.

Keep method names, argument order/types, return shapes, null handling, error
codes, and promise/callback completion consistent across these layers.

## Native method routing

- React Native resolves modules through `NativeModules`, for example
  `NativeModules.PowerAuth` and `NativeModules.PowerAuthPassword`. Android
  registers modules in `PowerAuthReactPackage`; methods use `@ReactMethod`.
- Cordova passes a separate plugin name, action name, and positional argument
  array to `cordova.exec`. For example, the base API uses plugin
  `PowerAuthModule` with action `configure`. Plugin names must match the
  `plugin.xml` feature entries, and Android actions must match the plugin's
  `execute` dispatch and argument readers.
- iOS `PAJS_METHOD_START` macros export the same method to React Native or
  consume Cordova's positional arguments in declaration order. Cordova iOS
  returns JSON strings with a `result` envelope for success and an error
  object for failure; `NativeCordovaModule` unwraps them. Android Cordova
  returns values directly. Preserve this normalization in the JS adapter.

## Conventions

- Edit source or generators, never staged/generated
  `packages/lib-rn/build/`, `packages/lib-cordova/build/`,
  `packages/lib-cordova/.build/`, package `dist/`, Cordova `www/` or
  `platforms/`, or native app build output.
- Native errors are normalized to `PowerAuthError` through
  `NativeWrapper.processException`. Keep `PowerAuthErrorCode` values and
  platform-specific error data consistent across TypeScript, Android, and iOS.
- Model/configuration objects and positional arguments must retain the keys,
  enum wire values, optional fields, and numeric/string representations read
  by the native implementations. Native object references are opaque IDs;
  preserve ownership and release semantics when passing them across the bridge.
- iOS bridge implementations are intentionally shared through `PAJS.h` macros
  selected by each wrapper's `PAJSPlatform.h`; do not fork React Native and
  Cordova implementations when the macro abstraction can express the change.
  Android business logic similarly belongs in `lib-shared/.../powerauth/js`,
  with wrapper directories kept as adapters.
- Preserve native-object lifecycle semantics. Objects derived from
  `BaseNativeObject` lazily allocate an ID, recover once from
  `INVALID_NATIVE_OBJECT`, and expose explicit `release()`; `PowerAuth`
  instances are cleaned up with `deconfigure()`.
- Do not log activation material, passwords, possession keys, tokens,
  encryption keys, request signatures, or test environment credentials.
  Extend the existing redaction in `NativeWrapper` if adding traced calls with
  sensitive arguments.
- Public API or behavior changes require corresponding `docs/` and changelog
  updates.
- New TypeScript, Java/Kotlin, and Objective-C source files should carry the
  existing Apache 2.0 header with `Copyright <year> Wultra s.r.o.`; copy the
  header style from a neighboring source file.
- Keep `<!-- PLACEHOLDER_MODULES -->` in the source Cordova `plugin.xml`; the
  build replaces it from Rollup's runtime exports. Use `yarn packCordova` to
  validate generated shims, ambient declarations, plugin entries, and package
  contents.
- E2E suites extend `TestSuite`, call the superclass from lifecycle overrides,
  and are registered in `testapp/_tests/AllTests.ts`. Place tests requiring
  prompts or biometry in `getInteractiveLibraryTests()`; automatic CI runs use
  `getLibraryTests().concat(getTestbedTests())`.

## Releases and reviews

The usual PR target is `develop`; release streams use `release/a.b.x`.
Keep the root, React Native, Cordova, and source `plugin.xml` versions
synchronized. Development versions are `0.0.1-dev`.

Use `.prepare-release.json` and `scripts/prepare-release.sh` for coordinated
version and `docs/Changelog.md` updates. `SDKVersion.ts` is generated during
staging, so update the source manifests rather than editing the generated
version file. `yarn packAll` verifies both final package archives.

For PR reviews, follow [the repository review skill](skills/code-review/SKILL.md),
including its API compatibility, native-boundary, security, and release checks.
