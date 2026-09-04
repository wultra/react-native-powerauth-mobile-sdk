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

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

function resolveFromRepoRoot(p) {
  if (path.isAbsolute(p)) return p;
  return path.resolve(__dirname, '../..', p);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDurationToMs(value) {
  const m = /^(\d+)(ms|s|m|h)?$/.exec(String(value).trim());
  if (!m) {
    throw new Error(`Invalid duration '${value}'.`);
  }

  const num = Number(m[1]);
  const unit = m[2] || 'ms';

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

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const out = {};

  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');

    if (idx < 0) continue;

    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1);
    out[key] = val;
  }

  return out;
}

function ensureTestappEnv(envPath) {
  if (fs.existsSync(envPath)) {
    return;
  }
  throw new Error(`Missing ${envPath}.`);
}

function spawnLogged(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  return child;
}

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} for ${url}`);
  }

  return await resp.json();
}

function waitForExit(child, name) {
  return new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      if (signal) {
        resolve({ code: 128, signal });
      } else {
        resolve({ code: code ?? 1, signal: undefined });
      }
    });

    child.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error(`${name} failed to start: ${err?.message ?? String(err)}`);
      resolve({ code: 1, signal: undefined });
    });
  });
}

function terminate(child, name) {
  if (!child || child.killed) return;

  try {
    child.kill('SIGINT');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`Failed to terminate ${name}: ${e?.message ?? String(e)}`);
  }
}

function listAdbDevices() {
  const out = spawnSync('adb', ['devices'], { encoding: 'utf8' });
  if (out.status !== 0) {
    return [];
  }

  const lines = String(out.stdout || '').split(/\r?\n/);
  const devices = [];
  for (const line of lines) {
    if (!line || line.startsWith('List of devices')) continue;
    const parts = line.trim().split(/\s+/);

    if (parts.length >= 2 && parts[1] === 'device') {
      devices.push(parts[0]);
    }
  }

  return devices;
}

function adbReverseAllDevices(port) {
  const devices = listAdbDevices();
  if (devices.length === 0) {
    return;
  }

  for (const id of devices) {
    spawnSync('adb', ['-s', id, 'reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'ignore' });
  }
}

function printHelp(exitCode) {
  // eslint-disable-next-line no-console
  console.error(
    [
      'e2e-run',
      '',
      'Runs the collector and launches the test apps for automated integration tests.',
      '',
      'Usage:',
      '  node scripts/e2e/run.cjs <rn|cordova|full> [options]',
      '',
      'Options:',
      '  --platforms android,ios        Platforms to run (default: android,ios)',
      '  --out artifacts/e2e            Output directory (default: artifacts/e2e)',
      '  --collector-host 127.0.0.1     Collector bind host (default: 127.0.0.1)',
      '  --collector-port 8137          Collector port (default: 8137)',
      '  --metro-port 8081              Metro port (default: 8081)',
      '  --timeout 45m                  Collector timeout (default: 45m)',
      '  --expected-runs N              Override expected runs',
      '  --ios-simulator \"iPhone 15\"    iOS simulator name (optional)',
      '  --no-metro                     Do not start Metro (RN only)',
      '  --metro-reset-cache            Start Metro with --reset-cache',
      '  --ci                           CI defaults (Metro reset, no-packager)',
      '  --watch                        Run indefinitely (ignore expected-runs and timeout)',
      '',
      'Requirements:',
      '  - testapp/.env must exist and set TEST_COLLECTOR_URL for reported runs',
      '  - in CI mode, the file is generated from process environment variables',
      '  - packages must be built (yarn e2e:infra:build)',
      '',
    ].join('\n')
  );
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    mode: argv[2],
    platforms: ['android', 'ios'],
    outDir: 'artifacts/e2e',
    collectorHost: '127.0.0.1',
    collectorPort: 8137,
    metroPort: 8081,
    timeout: '45m',
    expectedRuns: undefined,
    iosSimulator: undefined,
    metro: true,
    metroResetCache: false,
    ci: false,
  };

  if (args.mode === '--help' || args.mode === '-h') {
    args.help = true;
    args.mode = undefined;

    return args;
  }

  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];

    if (a === '--platforms' && next) {
      args.platforms = next.split(',').map((s) => s.trim()).filter(Boolean);
      i++;
    } else if (a === '--out' && next) {
      args.outDir = next;
      i++;
    } else if (a === '--collector-host' && next) {
      args.collectorHost = next;
      i++;
    } else if (a === '--collector-port' && next) {
      args.collectorPort = Number(next);
      i++;
    } else if (a === '--metro-port' && next) {
      args.metroPort = Number(next);
      i++;
    } else if (a === '--timeout' && next) {
      args.timeout = next;
      i++;
    } else if (a === '--expected-runs' && next) {
      args.expectedRuns = Number(next);
      i++;
    } else if (a === '--ios-simulator' && next) {
      args.iosSimulator = next;
      i++;
    } else if (a === '--no-metro') {
      args.metro = false;
    } else if (a === '--metro-reset-cache') {
      args.metroResetCache = true;
    } else if (a === '--ci') {
      args.ci = true;
      args.metroResetCache = true;
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.mode) {
    printHelp(args.help ? 0 : 1);
  }

  if (!['rn', 'cordova', 'full'].includes(args.mode)) {
    printHelp(1);
  }

  if (!Number.isFinite(args.collectorPort) || args.collectorPort <= 0) {
    throw new Error(`Invalid --collector-port value '${args.collectorPort}'.`);
  }
  if (!Number.isInteger(args.metroPort) || args.metroPort <= 0 || args.metroPort > 65535) {
    throw new Error(`Invalid --metro-port value '${args.metroPort}'.`);
  }

  // Derive how many runs the collector should wait for.
  const platformsCount = args.platforms.length;
  const includeRn = args.mode === 'rn' || args.mode === 'full';
  const includeCordova = args.mode === 'cordova' || args.mode === 'full';
  const derivedExpected = platformsCount * (includeRn ? 1 : 0) + platformsCount * (includeCordova ? 1 : 0);
  const expectedRuns = args.expectedRuns ?? derivedExpected;

  if (includeRn) {
    const stage = spawnSync('yarn', ['workspace', 'testapp', 'prepare:powerauth'], {
      cwd: resolveFromRepoRoot('.'),
      stdio: 'inherit',
    });
    if (stage.status !== 0) {
      throw stage.error ?? new Error('Failed to stage the React Native SDK.');
    }
  }

  const outDir = resolveFromRepoRoot(args.outDir);
  fs.mkdirSync(outDir, { recursive: true });

  const envPath = resolveFromRepoRoot('testapp/.env');
  ensureTestappEnv(envPath);
  const env = parseEnvFile(envPath);

  if (!env.TEST_COLLECTOR_URL) {
    throw new Error(`TEST_COLLECTOR_URL is missing or empty in ${envPath}.`);
  }

  // eslint-disable-next-line no-console
  console.log(`[e2e] TEST_COLLECTOR_URL from testapp/.env: ${env.TEST_COLLECTOR_URL}`);
  if (!String(env.TEST_COLLECTOR_URL).includes('://')) {
    throw new Error(
      `TEST_COLLECTOR_URL must include a URL scheme (http:// or https://). Example: http://127.0.0.1:8137`
    );
  }

  // Validate that the collector CLI exists.
  const collectorCli = resolveFromRepoRoot('packages/mobile-test-runner/dist/cli.js');
  if (!fs.existsSync(collectorCli)) {
    throw new Error(`Missing ${collectorCli}. Build packages first: yarn e2e:infra:build`);
  }

  const children = [];
  const shutdown = () => {
    for (const { child, name } of children) {
      terminate(child, name);
    }
  };

  process.on('SIGINT', () => {
    shutdown();
    process.exit(130);
  });

  process.on('SIGTERM', () => {
    shutdown();
    process.exit(143);
  });

  // Start collector.
  const collectorArgs = [
    collectorCli,
    'collect',
    '--host',
    args.collectorHost,
    '--port',
    String(args.collectorPort),
    '--out',
    args.outDir,
    '--expected-runs',
    String(expectedRuns),
    '--timeout',
    args.timeout,
  ];

  // eslint-disable-next-line no-console
  console.log(`[e2e] Starting collector (expectedRuns=${expectedRuns})...`);
  const collector = spawnLogged(process.execPath, collectorArgs, { cwd: resolveFromRepoRoot('.') });
  children.push({ child: collector, name: 'collector' });

  // Configure port forwarding for Android devices (physical or emulator).
  // This allows the app to reach the host collector via 127.0.0.1/localhost when needed.
  try {
    adbReverseAllDevices(args.collectorPort);
  } catch {
    // ignore
  }

  // TODO this is a simple polling to fial fast for runs that dont start.
  const healthUrl = `http://127.0.0.1:${args.collectorPort}/health`;
  let lastHealth = { runs: -1, completed: -1 };

  let startTime;
  const startDeadlineMs = parseDurationToMs(process.env.E2E_STARTUP_TIMEOUT || '2m');

  const healthTimer = setInterval(async () => {
    try {
      const health = await fetchJson(healthUrl);
      const runs = Number(health.runs ?? 0);
      const completed = Number(health.completed ?? 0);

      if (runs !== lastHealth.runs || completed !== lastHealth.completed) {
        lastHealth = { runs, completed };
        // eslint-disable-next-line no-console
        console.log(`[e2e] collector status: runs=${runs} completed=${completed}`);
      }

      if (startTime && runs === 0 && Date.now() - startTime > startDeadlineMs) {
        // eslint-disable-next-line no-console
        console.error(`[e2e] No run started within the startup timeout. Verify HTTP access to TEST_COLLECTOR_URL from the apps.`);

        shutdown();
        process.exit(1);
      }
    } catch (e) {
      // Ignore transient errors while the collector is starting.
    }
  }, 5000);

  // Start Metro for RN and skip it later.
  let metro = null;
  if (includeRn && args.metro) {
    const metroArgs = ['workspace', 'testapp', 'start:prepared', '--port', String(args.metroPort)];

    if (args.metroResetCache) {
      metroArgs.push('--reset-cache');
    }

    // eslint-disable-next-line no-console
    console.log(`[e2e] Starting Metro...`);
    metro = spawnLogged('yarn', metroArgs, { cwd: resolveFromRepoRoot('.') });

    children.push({ child: metro, name: 'metro' });

    // Allow Metro to start accepting connections before app launches.
    await sleep(2500);
  }

  const runResults = [];

  const runRnAndroid = async () => {
    const cmd = 'yarn';
    const base = ['workspace', 'testapp', 'android:prepared', '--port', String(args.metroPort)];
    const argv = args.metro || args.ci ? base.concat(['--no-packager']) : base;

    // eslint-disable-next-line no-console
    console.log(`[e2e] Launching RN Android...`);

    const child = spawnLogged(cmd, argv, {
      cwd: resolveFromRepoRoot('.'),
      env: {
        ...process.env,
        RCT_METRO_PORT: String(args.metroPort),
      },
    });
    const r = await waitForExit(child, 'rn-android');

    runResults.push({ name: 'rn-android', ...r });
  };

  const runRnIos = async () => {
    const cmd = 'yarn';
    const base = ['workspace', 'testapp', 'ios:prepared', '--port', String(args.metroPort)];
    const extra = [];

    if (args.metro || args.ci) extra.push('--no-packager');

    if (args.iosSimulator) {
      extra.push('--simulator', args.iosSimulator);
    }

    const argv = base.concat(extra);

    // eslint-disable-next-line no-console
    console.log(`[e2e] Launching RN iOS...`);

    const child = spawnLogged(cmd, argv, {
      cwd: resolveFromRepoRoot('.'),
      env: {
        ...process.env,
        RCT_METRO_PORT: String(args.metroPort),
      },
    });
    const r = await waitForExit(child, 'rn-ios');

    runResults.push({ name: 'rn-ios', ...r });
  };

  const runCordovaAndroid = async () => {
    // eslint-disable-next-line no-console
    console.log(`[e2e] Launching Cordova Android...`);

    const child = spawnLogged('yarn', ['freshCordovaAndroid'], { cwd: resolveFromRepoRoot('.') });
    const r = await waitForExit(child, 'cordova-android');

    runResults.push({ name: 'cordova-android', ...r });
  };

  const runCordovaIos = async () => {
    // eslint-disable-next-line no-console
    console.log(`[e2e] Launching Cordova iOS...`);

    const child = spawnLogged('yarn', ['freshCordovaIos'], { cwd: resolveFromRepoRoot('.') });
    const r = await waitForExit(child, 'cordova-ios');

    runResults.push({ name: 'cordova-ios', ...r });
  };

  try {
    // Launch selected apps/platforms.
    for (const platform of args.platforms) {
      if (includeRn) {
        if (platform === 'android') await runRnAndroid();
        if (platform === 'ios') await runRnIos();
      }

      if (includeCordova) {
        if (platform === 'android') await runCordovaAndroid();
        if (platform === 'ios') await runCordovaIos();
      }
    }

    startTime = Date.now();

    // eslint-disable-next-line no-console
    console.log(`[e2e] Waiting for collector to finish...`);
    const collectorExit = await waitForExit(collector, 'collector');

    clearInterval(healthTimer);

    // Stop Metro
    if (metro) {
      terminate(metro, 'metro');
    }

    // eslint-disable-next-line no-console
    console.log(`[e2e] App launch results: ${JSON.stringify(runResults)}`);
    process.exit(collectorExit.code);
  } finally {
    clearInterval(healthTimer);
    shutdown();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e?.stack ?? String(e));
  process.exit(2);
});
