# Swift Package Manager consumer

The generated `ios-spm/` project runs the same testapp UI through the SDK's own
`Package.swift` and native `PowerAuth2` dependency. It installs as **PowerAuth SPM**
(`com.wultra.reactnative.test.spm`), alongside the existing CocoaPods app.
The normal `ios/` project and E2E commands remain unchanged.

## Run

Use macOS, Xcode, CocoaPods and the declared Node/Yarn dependencies. CocoaPods is
needed by React Native's conversion/scaffolding tool; no pods are linked into this
consumer. Initial setup downloads React Native XCFrameworks and Swift packages.

Configure `.env` following the [app guide](README.md), then run from the repo root:

```sh
yarn workspace testapp spm                 # Prepare the disposable Xcode project
yarn workspace testapp start              # Metro, in a separate terminal
yarn workspace testapp ios:spm            # Build/install on the single booted simulator
# Or select a simulator explicitly:
yarn workspace testapp ios:spm --udid <simulator-UUID>
# Compile/link without launching:
yarn workspace testapp buildIosSpm
```

For a physical device, prepare the project and open `testapp/ios-spm/testapp.xcodeproj`.
Select the device and configure signing for the SPM bundle identifier. The project
preserves the testapp's Face ID description and app-group entitlement.

Every prepare/build/run command stages the current SDK, copies the native template,
generates `.env` constants and configures SPM. Edits inside `ios-spm/` are replaced;
shared native changes belong in `ios/`. `ENVFILE` accepts an absolute path to another
environment file. Set `TESTAPP_MODE=manual` for manual testing, or leave it empty
with a collector URL to run the existing automatic suite.

## Integration details

React Native 0.87's experimental SPM tooling changes the project and Podfile, so
conversion happens only in the disposable copy. Its scaffolder supplies manifests
for the existing `react-native-config` and `react-native-safe-area-context`
dependencies; the SDK manifest is preserved. Preparation explicitly runs the
environment-source generator normally invoked by the config module's podspec.

The generated aggregate incorrectly targets iOS 15.0 while the SDK requires 15.1.
The preparation script normalizes only that generated manifest after setup and
Xcode sync. It does not modify React Native or SDK sources. See
[React Native's SPM scripts](https://github.com/facebook/react-native/blob/v0.87.0/packages/react-native/scripts/spm/__doc__/spm-scripts.md).

Use the manual configuration, activation and biometric workflows to exercise the
SPM-linked bridge, including relaunch/persistence checks. Building the package alone
does not establish backend or biometric behavior.
