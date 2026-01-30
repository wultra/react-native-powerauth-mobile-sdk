# `mobile-test-runner`

Node-based collector for on-device integration tests.

## Usage

After building the package (`yarn workspace mobile-test-runner build`):

```bash
node packages/mobile-test-runner/dist/cli.js collect \
  --host 127.0.0.1 \
  --port 8137 \
  --out artifacts/e2e \
  --expected-runs x \
  --timeout 30m
```

Use `--watch` arg to ignore `--expected-runs` and `--timeout` for an indefinite watch run.

The process exits with code `0` when all expected runs succeed, otherwise with `1`.
