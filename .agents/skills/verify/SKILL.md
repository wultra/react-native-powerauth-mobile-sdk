---
name: verify
description: Run the appropriate test sequence in this React Native SDK. Use when asked to verify, test, or validate the SDK checkout.
---

# Verify

Run the repository's existing test commands without modifying source code or test
configuration. Inspect the package scripts, project documentation, and test
directories first so every command matches the checkout.

## Verification contract

Run commands sequentially and stop at the first failure. Do not skip a failed
phase to produce a success-shaped result. Never install new test tooling;
restore declared dependencies only when they are missing.

Before running mobile integration tests, confirm that the required device,
emulator, or simulator is available. If multiple suitable targets make the
choice ambiguous, ask the user which one to use.

## React Native

Use the repository's local E2E runner, but **never run a `full` E2E target**.
This prohibition includes commands such as `e2e:local:full`, suite arguments
named `full`, aliases that expand to a full run, and any command that runs all
SDK variants together.

Run only the relevant non-full suite, split into two independent invocations:

1. Android only.
2. iOS only, after Android succeeds.

Inspect the local E2E script before invoking it and ensure each command resolves
to exactly one platform. Do not call a package script that defaults to
`android,ios`, and do not blindly append a platform argument when that might
leave the default both-platform argument active. Invoke the underlying local
runner directly when necessary.

For this repository, the React Native sequence is:

```bash
yarn e2e:clean && yarn e2e:infra:build && node scripts/e2e/run.cjs rn --platforms android
yarn e2e:clean && yarn e2e:infra:build && node scripts/e2e/run.cjs rn --platforms ios
```

Do not run the Cordova suite unless the user explicitly asks to verify Cordova.
When requested, apply the same Android-first, iOS-second split with the
non-full `cordova` suite.

## Result

Report each phase as passed, failed, or not run. Include the failing command and
the concise root error when verification stops. Never claim the SDK is fully
verified when a required phase was skipped or unavailable.
