# Local & CI E2E tests

Our dev setup and the nature of the SDK required test runs as **real on-device integration tests**.

To make these tests CI-friendly, our test framework streams structured test events from the app to a Node “collector” which produces **JUnit XML** + raw artifacts.

## Packages

The packages are part of our monorepo. They are, however, ready for an individual publishing if/when we decide to reuse the framework in other SDKs.

- `packages/mobile-testbed/`
  - Test framework (TestSuite/TestRunner + TestEvent/TestMonitor).
- `packages/mobile-test-reporter/`
  - In app reporter(s) that implement `TestMonitor` and send events to the collector over HTTP.
- `packages/mobile-test-runner/`
  - Node collector CLI that aggregates events and writes JUnit + artifacts, both locally and on CI.

## How it works

1. CI starts the collector (`mobile-test-runner collect ...`).
2. The mobile app runs test suites with `TestRunner` and emits `TestEvent`s to a `TestMonitorGroup`.
3. `HttpTestReporter` buffers events and POSTs them to the collector.
4. When tests finish, the app sends an explicit **run completion** request.
5. The collector writes:
   - `artifacts/e2e/junit.xml`
   - `artifacts/e2e/events.jsonl`
   - `artifacts/e2e/summary.json`
   - `artifacts/e2e/runs/<runId>/*` (run metadata + raw events)
   - Logs from the Android and iOS devices

## Running locally

1. Build the infra packages (so `dist/` exists):
```bash
yarn e2e:infra:build 
```
or
```bash
yarn workspace mobile-testbed build
yarn workspace mobile-test-reporter build
yarn workspace mobile-test-runner build
```

2. Add collector URL to `testapp/.env`:

- `TEST_COLLECTOR_URL=http://127.0.0.1:8137` (the URL must include the scheme)

3. Start the collector (in a separate terminal):

```bash
mkdir -p artifacts/e2e
node packages/mobile-test-runner/dist/cli.js collect --host 127.0.0.1 --port 8137 --out artifacts/e2e --expected-runs 1 --timeout 30m
```

4. Run the app on device/simulator (tests auto-start in `TestExecutor`):

```bash
yarn runReactAndroid
# or
yarn runReactIos
```
OR
```bash
yarn freshCordovaAndroid
# or
yarn freshCordovaIos
```

When the run completes, check:
- `artifacts/e2e/junit.xml`
- `artifacts/e2e/events.jsonl`

If you want to run both platforms and have the collector exit only after both complete:

```bash
mkdir -p artifacts/e2e
node packages/mobile-test-runner/dist/cli.js collect --host 127.0.0.1 --port 8137 --out artifacts/e2e --expected-runs 2 --timeout 45m
```

Then run both:

```bash
yarn runReactAndroid
yarn runReactIos
```

Alternatively you can run it as "automation" with the following commands:

```bash
yarn e2e:local:rn
# or
yarn e2e:local:cordova
# or
yarn e2e:local:full
```

## Watchmode

The collector supports an "indefinite" watch mode when running test locally. It ignores the `--expected-runs` and `--timeout` params.
You can run it with:

```bash
node packages/mobile-test-runner/dist/cli.js collect --host 127.0.0.1 --port 8137 --out artifacts/e2e --watch
```

## CI workflow

Workflow file: `.github/workflows/mobile-e2e.yml`

PRs and default branch pushes run both RN and Cordova.
