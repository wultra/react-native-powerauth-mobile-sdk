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

export type PlatformOS = 'android' | 'ios';

export type Runtime = 'react-native' | 'cordova';

// Note that most of the timestamp types are ISO-8601 strings for JUnit compatibility - we can change later.

/**
 * Identifies the test client (app + runtime + platform).
 */
export interface ClientInfo {
  /** Platform identifier, e.g. `android`, `ios`. */
  platformOS: PlatformOS;
  /** App runtime, e.g. `react-native`, `cordova`. */
  runtime: Runtime;

  /** Optional SDK/application identifiers for easier triage. */
  appName?: string;
}

/**
 * Request body used to start a new run.
 */
export interface RunStartRequest {
  /** Human-readable run label. */
  runName: string;
  /** ISO-8601 timestamp */
  startedAt: string;

  client: ClientInfo;
  /** True when the run requires user interaction. */
  interactive?: boolean;
}

/**
 * Response returned by a collector after creating a new run.
 */
export interface RunStartResponse {
  runId: string;
}

/**
 * Event types emitted by the test framework.
 */
export type EventType =
  | 'BATCH_INFO'
  | 'BATCH_FAIL'
  | 'SUITE_START'
  | 'SUITE_SUCCESS'
  | 'SUITE_FAIL'
  | 'SUITE_SKIP'
  | 'SUITE_INFO'
  | 'SUITE_WARN'
  | 'TEST_START'
  | 'TEST_SUCCESS'
  | 'TEST_FAIL'
  | 'TEST_SKIPPED'
  | 'TEST_INFO'
  | 'TEST_WARN';

export interface RunFailure {
  name?: string;
  message?: string;
  stack?: string;
}

/**
 * A single event emitted by a test run.
 */
export interface RunEvent {
  // TODO we can move from this simple sequence to a more robust identifiers
  seq?: number;
  at: string;
  type: EventType;
  suite: string;
  test?: string;
  message?: string;
  failure?: RunFailure;
}

export interface RunEventBatchRequest {
  runId: string;
  events: RunEvent[];
}

/**
 * Summary counters for a run.
 */
export interface RunCounters {
  suitesTotal: number;
  suitesSucceeded: number;
  suitesFailed: number;
  suitesSkipped: number;

  testsTotal: number;
  testsSucceeded: number;
  testsFailed: number;
  testsSkipped: number;
}

/**
 * Request body used to complete a run.
 */
export interface RunCompleteRequest {
  runId: string;
  completedAt: string;
  success: boolean;
  counters?: Partial<RunCounters>;
}
