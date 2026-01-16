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

import type { ClientInfo } from './protocol';

/**
 * Minimal logger inteface used by the reporter.
 */
export interface LoggerLike {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Configuration for {@link HttpTestReporter}.
 */
export interface HttpTestReporterOptions {
  /** Collector base URL, e.g. `http://127.0.0.1:8137`. */
  collectorUrl: string;
  /** Name of the test run. */
  runName: string;
  /** Identifies the running app / SDK / platform. */
  client: ClientInfo;

  /** True for locally ran tests that require user interaction. */
  interactive?: boolean;

  /** Maximum number of events sent in a single `/events` request. */
  batchSize?: number;

  /** Optional logger. Defaults to `console`. */
  logger?: LoggerLike;
}
