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

/**
 * Configuration for running a collector instance.
 */
export interface CollectorOptions {
  /** Host to bind to, e.g. `127.0.0.1`. */
  host: string;

  /** TCP port to bind to, e.g. `8137`. */
  port: number;

  /** Output directory for artifacts (JUnit, JSON events). */
  outDir: string;

  /**
   * Number of completed runs expected before the collector exits (e.g. iOS + Android).
   *
   * Set to `0` to keep the collector running until interrupted (watch mode for local dev).
   */
  expectedRuns: number;

  /**
   * Maximum time to wait for all expected runs before failing.
   *
   * Set to `0` to disable the timeout.
   */
  timeoutMs: number;
}

export interface CollectorRunSummary {
  runId: string;
  displayName: string;
  success: boolean;
  eventsCount: number;
}

export interface CollectorResult {
  success: boolean;
  outDir: string;
  junitPath: string;
  runs: CollectorRunSummary[];
}
