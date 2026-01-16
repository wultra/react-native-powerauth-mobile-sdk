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

// Note: this script is primarily used for CI. It generates the .env files from GH secrets.
// We don't need to rely on it locally.

const fs = require('fs');
const path = require('path');

function resolveFromRepoRoot(p) {
  if (path.isAbsolute(p)) return p;
  return path.resolve(__dirname, '../..', p);
}

function parseArgs(argv) {
  const args = { output: 'testapp/.env', force: false, ci: false };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];

    if (a === '--output' && next) {
      args.output = next;
      i++;
    } else if (a === '--force') {
      args.force = true;
    } else if (a === '--ci') {
      args.ci = true;
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  return args;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function envValue(name, fallback = '') {
  const v = process.env[name];
  if (v === undefined || v === null) return fallback;

  return String(v).replace(/\r?\n/g, '\\n');
}

const args = parseArgs(process.argv);
if (args.help) {
  // eslint-disable-next-line no-console
  console.log(
    [
      'write-testapp-env',
      '',
      'Writes testapp/.env from current process environment, primarily used for CI.',
      '',
      'Usage:',
      '  node scripts/e2e/write-testapp-env.cjs [--output testapp/.env] [--force] [--ci]',
      '',
    ].join('\n')
  );
  process.exit(0);
}

const outPath = resolveFromRepoRoot(args.output);
if (fs.existsSync(outPath) && !args.force) {
  // eslint-disable-next-line no-console
  console.log(`Skipped writing ${outPath} (already exists). Use --force to overwrite.`);
  process.exit(0);
}

if (args.ci) {
  requireEnv('POWERAUTH_CLOUD_URL');
  requireEnv('POWERAUTH_CLOUD_USERNAME');
  requireEnv('POWERAUTH_CLOUD_PASSWORD');
  requireEnv('POWERAUTH_CLOUD_APP_ID');
  requireEnv('ENROLLMENT_SERVER_URL');
  requireEnv('SDK_CONFIG');
}

const lines = [
  `POWERAUTH_CLOUD_URL=${envValue('POWERAUTH_CLOUD_URL')}`,
  `POWERAUTH_CLOUD_USERNAME=${envValue('POWERAUTH_CLOUD_USERNAME')}`,
  `POWERAUTH_CLOUD_PASSWORD=${envValue('POWERAUTH_CLOUD_PASSWORD')}`,
  `POWERAUTH_CLOUD_APP_ID=${envValue('POWERAUTH_CLOUD_APP_ID')}`,
  `ENROLLMENT_SERVER_URL=${envValue('ENROLLMENT_SERVER_URL')}`,
  `SDK_CONFIG=${envValue('SDK_CONFIG')}`,
  `UDS_SERVER_URL=${envValue('UDS_SERVER_URL')}`,
  `UDS_SERVER_USERNAME=${envValue('UDS_SERVER_USERNAME')}`,
  `UDS_SERVER_PASSWORD=${envValue('UDS_SERVER_PASSWORD')}`,
  `TEST_COLLECTOR_URL=${envValue('TEST_COLLECTOR_URL', 'http://127.0.0.1:8137')}`,
];

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8');

// eslint-disable-next-line no-console
console.log(`Wrote: ${outPath}`);
