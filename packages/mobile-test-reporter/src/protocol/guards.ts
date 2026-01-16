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

import type { RunCompleteRequest, RunEventBatchRequest, RunStartRequest } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Runtime type guard for {@link RunStartRequest}.
 */
export function isRunStartRequest(value: unknown): value is RunStartRequest {
  if (!isRecord(value)) return false;

  const client = (value as any).client;

  return (
    typeof (value as any).runName === 'string' &&
    typeof (value as any).startedAt === 'string' &&
    isRecord(client) &&
    typeof (client as any).platformOS === 'string' &&
    typeof (client as any).runtime === 'string'
  );
}

/**
 * Runtime type guard for {@link RunEventBatchRequest}.
 */
export function isRunEventBatchRequest(value: unknown): value is RunEventBatchRequest {
  if (!isRecord(value)) return false;

  return (
    typeof (value as any).runId === 'string' &&
    Array.isArray((value as any).events)
  );
}

/**
 * Runtime type guard for {@link RunCompleteRequest}.
 */
export function isRunCompleteRequest(value: unknown): value is RunCompleteRequest {
  if (!isRecord(value)) return false;

  return (
    typeof (value as any).runId === 'string' &&
    typeof (value as any).completedAt === 'string' &&
    typeof (value as any).success === 'boolean'
  );
}
