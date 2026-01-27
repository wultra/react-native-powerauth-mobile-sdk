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

  let { host, port, outDir, expectedRuns, timeoutMs, watch } = parseArgs(args);

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

type CliArgs = {
  host: string;
  port: number;
  outDir: string;
  expectedRuns: number;
  timeoutMs: number;
  watch: boolean;
};

function parseArgs(args: string[]): CliArgs {
  const options: CliArgs = {
    host: '127.0.0.1',
    port: 8137,
    outDir: 'artifacts/e2e',
    expectedRuns: 1,
    timeoutMs: parseDurationToMs('20m'),
    watch: false,
  };

  for (let i = 0; i < args.length; ) {
    const arg = args[i];

    switch (arg) {
      case '--host':
        options.host = requireValue(arg, args[i + 1]);
        i += 2;
        break;
      case '--port':
        options.port = Number(requireValue(arg, args[i + 1]));
        i += 2;
        break;
      case '--out':
        options.outDir = requireValue(arg, args[i + 1]);
        i += 2;
        break;
      case '--expected-runs':
        options.expectedRuns = Number(requireValue(arg, args[i + 1]));
        i += 2;
        break;
      case '--timeout':
        options.timeoutMs = parseDurationToMs(requireValue(arg, args[i + 1]));
        i += 2;
        break;
      case '--watch':
        options.watch = true;
        i += 1;
        break;
      case '--help':
      case '-h':
        printHelp(0);
        return options;
      default:
        // eslint-disable-next-line no-console
        console.error(`Unknown argument: ${arg}`);
        printHelp(1);
        return options;
    }
  }

  return options;
}

function requireValue(flag: string, value: string | undefined): string {
  if (!value) {
    // eslint-disable-next-line no-console
    console.error(`Missing value for ${flag}.`);
    printHelp(1);
    return '';
  }
  return value;
}
