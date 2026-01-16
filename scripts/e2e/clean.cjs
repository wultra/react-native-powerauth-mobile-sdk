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

function resolveFromRepoRoot(p) {
  if (path.isAbsolute(p)) return p;
  return path.resolve(__dirname, '../..', p);
}

const target = process.argv[2] || 'artifacts/e2e';
const dir = resolveFromRepoRoot(target);

fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });

// eslint-disable-next-line no-console
console.log(`Cleaned: ${dir}`);
