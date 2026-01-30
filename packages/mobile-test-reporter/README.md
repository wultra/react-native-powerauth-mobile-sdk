# `mobile-test-reporter`

Reporter package for sending on-device test events to a HTTP-based collector.

`HttpTestReporter` implements `TestMonitor` and can be attached to a `TestMonitorGroup`.

Lifecycle:

- create the reporter with `collectorUrl`, `runName`, and `client` metadata
- call `await startRun()` before the test run starts
- execute tests (events are buffered and flushed in batches)
- call `await completeRun(...)` after tests finish

`collectorUrl` must be a full URL (e.g. `http://127.0.0.1:8137`).

The helper `adjustCollectorUrlForPlatform()` rewrites these to `10.0.2.2` on Android.
