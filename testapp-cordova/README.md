# Cordova testapp

The app provides **PowerAuth Testing**, **Simple Configuration**, and the existing
**Automatic & Interactive Tests** runner on Android and iOS. Manual actions and
configuration loading use the same sources as the React Native testapp.

Set up `testapp/.env` as described in [the shared app guide](../testapp/README.md).
Set `TESTAPP_MODE=manual` to open the home screen. Without that override, a configured
`TEST_COLLECTOR_URL` launches the automated suites as before. The SDK configuration
and enrollment URL are not shown in the UI. Password fields accept digits only.

From the repository root:

```sh
yarn install --immutable
yarn workspace com.wultra.pwatest freshAndroid
# Or on macOS:
yarn workspace com.wultra.pwatest freshIos
```

These commands build/install the local plugin, bundle the app, prepare the native
projects, and launch the app. Cordova does not use Metro. Re-run after changing the
shared actions, Cordova UI, or `.env`.

To check the JavaScript bundle without a native build:

```sh
yarn workspace com.wultra.pwatest bundle
```

Use a device for biometric prompts. Automatic tests start when their screen opens;
cancel and wait for completion before returning to manual testing.
