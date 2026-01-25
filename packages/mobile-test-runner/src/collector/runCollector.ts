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

import { createServer } from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

import {
  isRunCompleteRequest,
  isRunEventBatchRequest,
  isRunStartRequest,
  type RunCompleteRequest,
  type RunEvent,
  type RunEventBatchRequest,
  type RunStartRequest,
} from 'mobile-test-reporter';

import { generateJUnitXml, type FinalizedRun } from '../junit';
import type { CollectorOptions, CollectorResult, CollectorRunSummary } from './types';
import { readJson, sendJson, sendText } from './http';
import { displayNameFor } from './helpers';

interface RunState {
  runId: string;
  start: RunStartRequest;
  events: RunEvent[];
  completed?: RunCompleteRequest;
  nextEventLogThreshold: number;
  testsStarted: number;
  testsSucceeded: number;
  testsFailed: number;
  testsSkipped: number;
}

/**
 * Runs HTTP collector that accepts run starts, batched events, and run completion.
 *
 * The collector exits when either:
 * - it receives `expectedRuns` completions, or
 * - the timeout is reached.
 */
export async function runCollector(options: CollectorOptions): Promise<CollectorResult> {
  mkdirSync(options.outDir, { recursive: true });

  const runs = new Map<string, RunState>();
  let completedCount = 0;
  const autoFinish = options.expectedRuns > 0;

  // This is a "hacky" way to keep collector running until awaited and/or the resolved/rejected action
  let resolveDone: (() => void) | undefined;
  let rejectDone: ((e: any) => void) | undefined;
  const donePromise = new Promise<void>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  const writeArtifactsSnapshot = (timedOutForSnapshot: boolean): { runsSummary: CollectorRunSummary[]; junitPath: string; overallSuccess: boolean } => {
    const allEventsJsonl: string[] = [];
    const completedFinalized: FinalizedRun[] = [];

    for (const state of runs.values()) {
      state.events.forEach((e) => allEventsJsonl.push(JSON.stringify({ runId: state.runId, event: e })));

      if (!state.completed) {
        continue;
      }

      const runDir = join(options.outDir, 'runs', state.runId);
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'run.json'), JSON.stringify(state.start, null, 2), 'utf8');
      writeFileSync(join(runDir, 'events.json'), JSON.stringify(state.events, null, 2), 'utf8');
      writeFileSync(join(runDir, 'events.jsonl'), `${state.events.map((e) => JSON.stringify(e)).join('\n')}\n`, 'utf8');
      writeFileSync(join(runDir, 'complete.json'), JSON.stringify(state.completed, null, 2), 'utf8');

      const displayName = displayNameFor(state.start);
      completedFinalized.push({
        runId: state.runId,
        runName: state.start.runName,
        displayName,
        success: state.completed.success,
        events: state.events,
      });
    }

    writeFileSync(join(options.outDir, 'events.jsonl'), `${allEventsJsonl.join('\n')}\n`, 'utf8');

    const junitXml = generateJUnitXml(completedFinalized);
    const junitPath = join(options.outDir, 'junit.xml');
    writeFileSync(junitPath, junitXml, 'utf8');

    const runsSummary: CollectorRunSummary[] = completedFinalized.map((r) => ({
      runId: r.runId,
      displayName: r.displayName,
      success: r.success,
      eventsCount: r.events.length,
    }));

    const expectedSatisfied = !autoFinish || runsSummary.length >= options.expectedRuns;
    const overallSuccess = !timedOutForSnapshot && expectedSatisfied && runsSummary.every((r) => r.success);

    writeFileSync(
      join(options.outDir, 'summary.json'),
      JSON.stringify(
        {
          success: overallSuccess,
          expectedRuns: options.expectedRuns,
          receivedRuns: runsSummary.length,
          runs: runsSummary,
        },
        null,
        2
      ),
      'utf8'
    );

    return { runsSummary, junitPath, overallSuccess };
  };

  // Matches run creation: /runs or /runs/
  const runStartPattern = /^\/runs\/?$/;

  // Matches run events: /runs/<runId>/events
  const runEventsPattern = /^\/runs\/([^/]+)\/events\/?$/;

  // Matches run completion: /runs/<runId>/complete
  const runCompletePattern = /^\/runs\/([^/]+)\/complete\/?$/;

  const handleRunStart = async (req: IncomingMessage, res: ServerResponse, method: string, url: string) => {
    if (method !== 'POST') return false;

    const match = runStartPattern.exec(url);
    if (!match) return false;

    const body = await readJson(req);
    if (!isRunStartRequest(body)) {
      sendJson(res, 400, { error: 'Invalid RunStartRequest' });
      return true;
    }

    const start = body as RunStartRequest;
    const runId = randomUUID();

    const state: RunState = {
      runId,
      start,
      events: [],
      nextEventLogThreshold: 50,
      testsStarted: 0,
      testsSucceeded: 0,
      testsFailed: 0,
      testsSkipped: 0,
    };
    runs.set(runId, state);

    const displayName = displayNameFor(start);
    // eslint-disable-next-line no-console
    console.log(
      `[mobile-test-runner] run started: runId=${runId} name="${start.runName}" client=${displayName} interactive=${Boolean(start.interactive)}`
    );

    sendJson(res, 200, { runId });

    return true;
  };

  const handleRunEvents = async (req: IncomingMessage, res: ServerResponse, method: string, url: string) => {
    if (method !== 'POST') return false;

    const match = runEventsPattern.exec(url);
    if (!match) return false;

    const runId = match[1];
    const state = runs.get(runId);

    if (!state) {
      sendJson(res, 404, { error: `Unknown runId ${runId}` });

      return true;
    }

    const body = await readJson(req);
    if (!isRunEventBatchRequest(body)) {
      sendJson(res, 400, { error: 'Invalid RunEventBatchRequest' });

      return true;
    }

    const batch = body as RunEventBatchRequest;
    if (batch.runId !== runId) {
      sendJson(res, 400, { error: `runId mismatch (${batch.runId} != ${runId})` });

      return true;
    }

    state.events.push(...batch.events);
    for (const e of batch.events) {
      switch (e.type) {
        case 'TEST_START':
          state.testsStarted += 1;
          break;
        case 'TEST_SUCCESS':
          state.testsSucceeded += 1;
          break;
        case 'TEST_FAIL':
          state.testsFailed += 1;
          break;
        case 'TEST_SKIPPED':
          state.testsSkipped += 1;
          break;
        default:
          break;
      }
    }

    // TODO a naive processing for batches for now
    if (state.events.length >= state.nextEventLogThreshold) {
      const displayName = displayNameFor(state.start);
      // eslint-disable-next-line no-console
      console.log(
        `[mobile-test-runner] run progress: runId=${runId} client=${displayName} events=${state.events.length} testsStarted=${state.testsStarted} testsPassed=${state.testsSucceeded} testsFailed=${state.testsFailed} testsSkipped=${state.testsSkipped}`
      );
      state.nextEventLogThreshold += 50;
    }

    sendJson(res, 200, { ok: true });
    return true;
  };

  const handleRunComplete = async (req: IncomingMessage, res: ServerResponse, method: string, url: string) => {
    if (method !== 'POST') return false;

    const match = runCompletePattern.exec(url);
    if (!match) return false;

    const runId = match[1];
    const state = runs.get(runId);

    if (!state) {
      sendJson(res, 404, { error: `Unknown runId ${runId}` });

      return true;
    }

    const body = await readJson(req);
    if (!isRunCompleteRequest(body)) {
      sendJson(res, 400, { error: 'Invalid RunCompleteRequest' });

      return true;
    }

    const complete = body as RunCompleteRequest;
    if (complete.runId !== runId) {
      sendJson(res, 400, { error: `runId mismatch (${complete.runId} != ${runId})` });

      return true;
    }

    if (!state.completed) {
      state.completed = complete;
      completedCount += 1;

      const displayName = displayNameFor(state.start);
      const counters = complete.counters ? JSON.stringify(complete.counters) : '{}';
      // eslint-disable-next-line no-console
      console.log(
        `[mobile-test-runner] run completed: runId=${runId} client=${displayName} success=${complete.success} events=${state.events.length} testsPassed=${state.testsSucceeded} testsFailed=${state.testsFailed} testsSkipped=${state.testsSkipped} counters=${counters}`
      );

      // Persist artifacts after every completed run so the collector can be used as a long-running dev service.
      writeArtifactsSnapshot(false);
    }

    sendJson(res, 200, { ok: true });

    if (autoFinish && completedCount >= options.expectedRuns) {
      resolveDone?.();
    }

    return true;
  };

  const server = createServer(async (req, res) => {
    try {
      const method = req.method ?? 'GET';
      const url = req.url ?? '/';

      if (method === 'OPTIONS') {
        return sendText(res, 204, '');
      }

      if (await handleRunStart(req, res, method, url)) {
        return;
      }

      if (await handleRunEvents(req, res, method, url)) {
        return;
      }

      if (await handleRunComplete(req, res, method, url)) {
        return;
      }

      if (method === 'GET' && url === '/health') {
        return sendJson(res, 200, { ok: true, runs: runs.size, completed: completedCount });
      }

      return sendText(res, 404, 'Not Found');
    } catch (e: any) {
      return sendJson(res, 500, { error: e?.message ?? String(e) });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(options.port, options.host, () => resolve());
    server.on('error', reject);
  });

  // eslint-disable-next-line no-console
  console.log(`[mobile-test-runner] collector listening on http://${options.host}:${options.port}`);
  if (autoFinish) {
    // eslint-disable-next-line no-console
    console.log(`[mobile-test-runner] expecting ${options.expectedRuns} completed run(s)`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[mobile-test-runner] watch mode enabled`);
  }

  let timeout: NodeJS.Timeout | undefined;
  if (options.timeoutMs > 0) {
    timeout = setTimeout(() => {
      rejectDone?.(new Error(`Timeout waiting for runs (${completedCount}/${options.expectedRuns}).`));
    }, options.timeoutMs);
  }

  let timedOut = false;
  try {
    await donePromise;
  } catch (e) {
    timedOut = true;
    // eslint-disable-next-line no-console
    console.error(`[mobile-test-runner] ${String(e)}`);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  const { runsSummary, junitPath, overallSuccess } = writeArtifactsSnapshot(timedOut);

  // eslint-disable-next-line no-console
  console.log(
    `[mobile-test-runner] finished: success=${overallSuccess} receivedRuns=${runsSummary.length} expectedRuns=${options.expectedRuns} outDir=${options.outDir}`
  );

  // GitHub Step Summary
  const ghaSummary = process.env.GITHUB_STEP_SUMMARY;
  if (ghaSummary) {
    const lines: string[] = [];
    lines.push(`### Mobile E2E summary`);
    lines.push('');
    lines.push(`- expected runs: ${options.expectedRuns}`);
    lines.push(`- received runs: ${runsSummary.length}`);
    lines.push(`- result: ${overallSuccess ? 'SUCCESS' : 'FAILURE'}`);
    lines.push('');

    for (const r of runsSummary) {
      lines.push(`- ${r.displayName}: ${r.success ? 'PASS' : 'FAIL'} (${r.eventsCount} events)`);
    }

    try {
      writeFileSync(ghaSummary, `${lines.join('\n')}\n`, { encoding: 'utf8', flag: 'a' });
    } catch {
      // ignore
    }
  }

  return { success: overallSuccess, outDir: options.outDir, junitPath, runs: runsSummary };
}
