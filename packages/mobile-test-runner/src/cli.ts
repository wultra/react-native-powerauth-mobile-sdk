#!/usr/bin/env node
//
// Copyright 2026 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { runCollector } from './collector/runCollector';

function printHelp(exitCode: number) {
  // eslint-disable-next-line no-console
  console.error(
    [
      'mobile-test-runner',
      '',
      'Usage:',
      '  mobile-test-runner collect --out <dir> [--port 8137] [--host 127.0.0.1] [--expected-runs 1] [--timeout 20m]',
      '  mobile-test-runner collect --watch --out <dir> [--port 8137] [--host 127.0.0.1]',
      '',
      'Options:',
      '  --watch               Run until interrupted (disables expected-runs and timeout)',
      '  --expected-runs 0     Do not auto-exit on completion',
      '  --timeout 0           Disable timeout',
      '',
    ].join('\n')
  );

  process.exit(exitCode);
}

function parseDurationToMs(value: string): number {
  const m = /^(\d+)(ms|s|m|h)?$/.exec(value.trim());
  if (!m) {
    throw new Error(`Invalid duration '${value}'.`);
  }

  const num = Number(m[1]);
  const unit = m[2] ?? 'ms';

  switch (unit) {
    case 'ms':
      return num;
    case 's':
      return num * 1000;
    case 'm':
      return num * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported duration unit '${unit}'.`);
  }
}

async function main(): Promise<void> {
  const [, , cmd, ...args] = process.argv;
  if (cmd !== 'collect') {
    printHelp(1);
  }

  let host = '127.0.0.1';
  let port = 8137;
  let outDir = 'artifacts/e2e';
  let expectedRuns = 1;
  let timeoutMs = parseDurationToMs('20m');
  let watch = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--host' && next) {
      host = next;
      i++;
    } else if (arg === '--port' && next) {
      port = Number(next);
      i++;
    } else if (arg === '--out' && next) {
      outDir = next;
      i++;
    } else if (arg === '--expected-runs' && next) {
      expectedRuns = Number(next);
      i++;
    } else if (arg === '--timeout' && next) {
      timeoutMs = parseDurationToMs(next);
      i++;
    } else if (arg === '--watch') {
      watch = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp(0);
    } else {
      // eslint-disable-next-line no-console
      console.error(`Unknown argument: ${arg}`);
      printHelp(1);
    }
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid --port value '${port}'.`);
  }

  if (!Number.isFinite(expectedRuns) || expectedRuns < 0) {
    throw new Error(`Invalid --expected-runs value '${expectedRuns}'.`);
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error(`Invalid --timeout value '${timeoutMs}'.`);
  }

  if (watch) {
    expectedRuns = 0;
    timeoutMs = 0;
  }

  // This should not be necessary, but I was burned way too many times during testing...
  if (expectedRuns === 0 && timeoutMs > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[mobile-test-runner] WARNING: --expected-runs 0 with a non-zero timeout will still exit on timeout. Use --watch or --timeout 0 to run indefinitely.`
    );
  }

  const result = await runCollector({ host, port, outDir, expectedRuns, timeoutMs });
  process.exit(result.success ? 0 : 1);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e?.stack ?? String(e));
  process.exit(2);
});
