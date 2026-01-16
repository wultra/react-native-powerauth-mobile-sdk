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

import type { RunEvent } from 'mobile-test-reporter';

export interface FinalizedRun {
  runId: string;
  runName: string;
  displayName: string;
  success: boolean;
  events: RunEvent[];
}

type TestStatus = 'passed' | 'failed' | 'skipped';

interface TestCaseModel {
  suite: string;
  name: string;
  status?: TestStatus;
  startAtMs?: number;
  endAtMs?: number;
  failureMessage?: string;
  failureStack?: string;
  output: string[];
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/\"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeCdata(value: string): string {
  // Split on ']]>' to keep CDATA valid.
  return value.replace(/\]\]>/g, ']]]]><![CDATA[>');
}

function parseIsoToMs(iso: string): number | undefined {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : undefined;
}

function getOrCreateCase(map: Map<string, TestCaseModel>, suite: string, test: string): TestCaseModel {
  const key = `${suite}::${test}`;
  const existing = map.get(key);

  if (existing) return existing;

  const created: TestCaseModel = { suite, name: test, output: [] };
  map.set(key, created);

  return created;
}

function buildCases(run: FinalizedRun): TestCaseModel[] {
  const cases = new Map<string, TestCaseModel>();
  const events = [...run.events].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));

  for (const e of events) {
    const test = e.test;
    if (!test) {
      continue;
    }

    const testCase = getOrCreateCase(cases, e.suite, test);
    const at = parseIsoToMs(e.at);

    switch (e.type) {
      case 'TEST_START':
        testCase.startAtMs ??= at;
        break;
      case 'TEST_SUCCESS':
        testCase.status = 'passed';
        testCase.endAtMs ??= at;
        break;
      case 'TEST_SKIPPED':
        testCase.status = 'skipped';
        testCase.endAtMs ??= at;

        if (e.message) {
          testCase.output.push(`SKIP: ${e.message}`);
        }
        break;
      case 'TEST_FAIL':
        testCase.status = 'failed';
        testCase.endAtMs ??= at;
        testCase.failureMessage = e.failure?.message ?? e.message ?? 'Test failed';
        testCase.failureStack = e.failure?.stack;
        break;
      case 'TEST_INFO':
      case 'TEST_WARN':
        if (e.message) {
          testCase.output.push(`${e.type}: ${e.message}`);
        }
        break;
      default:
        break;
    }
  }

  // Any test without one of the closing events is a failure
  for (const c of cases.values()) {
    if (!c.status) {
      c.status = 'failed';
      c.failureMessage = c.failureMessage ?? 'Missing terminal event (no success/fail/skip received).';
    }
  }

  return Array.from(cases.values());
}

/**
 * Generates a JUnit XML report from collected runs.
 */
export function generateJUnitXml(runs: FinalizedRun[]): string {
  const suites: string[] = [];

  suites.push('<?xml version="1.0" encoding="UTF-8"?>');
  suites.push('<testsuites>');

  for (const run of runs) {
    const cases = buildCases(run);

    // Group by suite name inside the run.
    const bySuite = new Map<string, TestCaseModel[]>();
    for (const c of cases) {
      const arr = bySuite.get(c.suite) ?? [];

      arr.push(c);
      bySuite.set(c.suite, arr);
    }

    // Please note that the generator is intentionally tolerant to partial data (missing timestamps, missing stacks, ...),
    // but will always represent missing terminal test events as failures.
    for (const [suiteName, suiteCases] of bySuite.entries()) {
      const tests = suiteCases.length;
      const failures = suiteCases.filter((c) => c.status === 'failed').length;
      const skipped = suiteCases.filter((c) => c.status === 'skipped').length;

      const totalTimeSec =
        suiteCases.reduce((sum, c) => {
          const timestamp1 = c.startAtMs ?? c.endAtMs;
          const timestampt2 = c.endAtMs ?? c.startAtMs;

          if (!timestamp1 || !timestampt2) return sum;

          return sum + Math.max(0, timestampt2 - timestamp1) / 1000;
        }, 0) ?? 0;

      const suiteDisplayName = `${run.displayName} :: ${suiteName}`;
      suites.push(
        `  <testsuite name="${escapeXmlAttr(suiteDisplayName)}" tests="${tests}" failures="${failures}" skipped="${skipped}" time="${totalTimeSec.toFixed(
          3
        )}">`
      );

      for (const suiteCase of suiteCases) {
        const timestamp1 = suiteCase.startAtMs ?? suiteCase.endAtMs;
        const timestamp2 = suiteCase.endAtMs ?? suiteCase.startAtMs;
        
        const timeSec = timestamp1 && timestamp2 ? Math.max(0, timestamp2 - timestamp1) / 1000 : 0;
        const classname = `${run.displayName}::${suiteName}`;
        suites.push(`    <testcase classname="${escapeXmlAttr(classname)}" name="${escapeXmlAttr(suiteCase.name)}" time="${timeSec.toFixed(3)}">`);

        if (suiteCase.status === 'skipped') {
          suites.push(`      <skipped/>`);
        } else if (suiteCase.status === 'failed') {
          const msg = escapeXmlAttr(suiteCase.failureMessage ?? 'Test failed');
          const stack = suiteCase.failureStack ? `<![CDATA[${escapeCdata(suiteCase.failureStack)}]]>` : '';
          suites.push(`      <failure message="${msg}">${stack}</failure>`);
        }

        if (suiteCase.output.length > 0) {
          const out = suiteCase.output.join('\n');
          suites.push(`      <system-out><![CDATA[${escapeCdata(out)}]]></system-out>`);
        }

        suites.push(`    </testcase>`);
      }

      suites.push('  </testsuite>');
    }
  }

  suites.push('</testsuites>');
  return suites.join('\n');
}
