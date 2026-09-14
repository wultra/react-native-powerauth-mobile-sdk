# PowerAuth example and test app

The existing testapp hosts the manual example and automatic/interactive suites,
sharing SDK integration and configuration on Android and iOS. The iOS app uses
CocoaPods.

## Run

From the repository root, install dependencies and build the SDK:

```sh
yarn install --immutable
yarn build:rn
yarn e2e:infra:build
```

Copy `.env-example` to `.env` here if needed. Set `ENROLLMENT_SERVER_URL` and either
`SDK_CONFIG` or the existing `POWERAUTH_CLOUD_*` settings. **Get Configuration from
Server** on both manual screens reads `/admin/applications/{appId}` exactly as the
tests do and shows a checkmark once the configuration is loaded. The SDK
configuration string is never displayed. Initialization remains a separate action;
loading configuration does not create or remove activations and is available only
while the SDK instance is not configured. The enrollment URL comes from `.env`
and is not displayed. Choose the instance and algorithm from dropdowns.

Set `TESTAPP_MODE=manual` to open the home screen even when `TEST_COLLECTOR_URL` is
set. Rebuild after changing `.env`.

```sh
yarn workspace testapp android
# Or iOS with CocoaPods:
yarn workspace testapp freshIos
# Start Metro separately if needed:
yarn startReact
```

Choose **PowerAuth Testing** for individual operations or **Simple Configuration**
for configure/read/deconfigure on `config-instance`. Manual testing uses `dev`,
`testID2` and `invalid-instance`, matching Flutter. Switching instances deconfigures
the old instance without removing its activation.

## Manual coverage

The 39 actions cover activation creation/persistence/removal, protocol upgrades,
biometry, password validation/change, secure vault, an activation-scoped encryption
round trip, digital/JWS/server signatures, CSR, offline codes, request headers,
time synchronization, and activation-code/character validation. Environment info
and native activation/biometric state are also available. Actions show results and
errors; unavailable actions are disabled and input dialogs support cancellation.

Start with a server-issued activation code, persist with a password or biometry,
and exercise the actions. Test protocol upgrade with a legacy activation. Use a
biometric-capable device for prompt success/cancellation and enrollment changes.
Incorrect passwords affect the server's remaining attempts. Local-only removal
leaves the server registration intact. Passwords are cleared from forms after use;
vault checks display metadata, not key bytes.

Reference: Flutter `develop` at
[`7b1d6e466929c5d4035f62858133d8dcf45c9568`](https://github.com/wultra/flutter-powerauth-mobile-sdk/tree/7b1d6e466929c5d4035f62858133d8dcf45c9568/example/lib/src).
Dart isolate and SDK log-stream controls are intentionally skipped because React
Native has no equivalent APIs. Unlike Flutter's unfinished password-validation
handler, this app validates through `beginPasswordChange` and releases the result.
Native object checks fail visibly when cleanup/derivation expectations are unmet.

## Cordova

The [Cordova testapp](../testapp-cordova/README.md) exposes the same manual actions
through an HTML interface and shares this app’s environment configuration.

## Existing tests

**Automatic & Interactive Tests** opens the existing runner and starts regular
tests; **Run interactive** runs prompt-driven suites. Cancel and wait for completion
before returning home. With `TEST_COLLECTOR_URL` set and `TESTAPP_MODE` empty, launch
still starts tests automatically. See [E2E-Tests.md](../E2E-Tests.md).
