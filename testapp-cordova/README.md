# Cordova testapp

Uses `testapp/.env`; see [setup](../testapp/README.md). Set `TESTAPP_MODE=manual`
to open the home screen.

Run from the repository root:

```sh
yarn install --immutable
yarn workspace com.wultra.pwatest freshIos
# Or:
yarn workspace com.wultra.pwatest freshAndroid
```

No Metro needed. Re-run after changing the app or `.env`.

## Tests

Open **Automatic & Interactive Tests** in the app, or run:

```sh
yarn e2e:local:cordova
```

For CLI runs, unset `TESTAPP_MODE` and configure `TEST_COLLECTOR_URL`.
See [E2E setup](../E2E-Tests.md).
