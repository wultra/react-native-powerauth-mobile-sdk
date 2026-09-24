# React Native testapp

Create `testapp/.env` from [`.env-example`](.env-example), fill in your server
settings, and set `TESTAPP_MODE=manual`.

Run from the repository root:

```sh
yarn install --immutable
yarn build:rn
yarn e2e:infra:build

# Launch the app and Metro:
yarn runReactIos
# Or:
yarn runReactAndroid
```

Rebuild after changing `.env`.

## Tests

Open **Automatic & Interactive Tests** in the app, or run:

```sh
yarn e2e:local:rn
```

For CLI runs, unset `TESTAPP_MODE` and configure `TEST_COLLECTOR_URL`.
See [E2E setup](../E2E-Tests.md) or the [Cordova testapp](../testapp-cordova/README.md).
