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

import type { RunCounters, RunCompleteRequest, RunEvent, RunEventBatchRequest, RunStartRequest, RunStartResponse } from '../protocol';

import type { TestEvent, TestMonitor } from 'mobile-testbed';

import type { HttpTestReporterOptions, LoggerLike } from '../types';
import { mapTestEventToRunEvent } from '../mapping/testEventMapper';
import { adjustCollectorUrlForPlatform, normalizeUrl } from './url';

/**
 * HTTP reporter that streams {@link TestEvent} data to a collector.
 */
export class HttpTestReporter implements TestMonitor {
  private readonly batchSize: number;
  private readonly logger: LoggerLike;

  private readonly collectorUrl: string;
  private readonly runName: string;
  private readonly client: HttpTestReporterOptions['client'];
  private readonly interactive: boolean;

  private runId?: string;
  private seq = 0;

  // This queue is used to cache events and flush them in batches. It helped with flakiness when running tests locally.
  private queue: RunEvent[] = [];
  private flushing = false;

  constructor(options: HttpTestReporterOptions) {
    this.batchSize = options.batchSize ?? 25;
    this.logger = options.logger ?? console;

    const primary = adjustCollectorUrlForPlatform(options.collectorUrl, options.client.platformOS);
    this.collectorUrl = primary;
    this.runName = options.runName;
    this.client = options.client;
    this.interactive = options.interactive ?? false;
  }

  /**
   * True when the reporter has successfully created a run in the collector.
   */
  get isStarted(): boolean {
    return this.runId !== undefined;
  }

  /**
   * Current collector run identifier.
   */
  get currentRunId(): string | undefined {
    return this.runId;
  }

  /**
   * Creates a run in the collector.
   */
  async startRun(): Promise<string> {
    if (this.runId) {
      return this.runId;
    }

    this.logger.info(`[HttpTestReporter] connecting collector=${this.collectorUrl}`);
    this.logger.info(`[HttpTestReporter] client platform=${this.client.platformOS} runtime=${this.client.runtime} runName="${this.runName}"`);

    const body: RunStartRequest = {
      runName: this.runName,
      startedAt: new Date().toISOString(),
      client: this.client,
      interactive: this.interactive,
    };

    const resp = await globalThis.fetch(normalizeUrl(this.collectorUrl, '/runs'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Collector rejected /runs (${resp.status}): ${text}`);
    }

    const json = (await resp.json()) as RunStartResponse;
    if (!json?.runId) {
      throw new Error(`Collector returned invalid /runs response: ${JSON.stringify(json)}`);
    }

    this.runId = json.runId;
    this.logger.info(`[HttpTestReporter] started runId=${this.runId} collector=${this.collectorUrl}`);

    return this.runId;
  }

  /**
   * Flushes remaining events and completes the run in the collector.
   */
  async completeRun(success: boolean, counters?: Partial<RunCounters>): Promise<void> {
    if (!this.runId) {
      return;
    }

    await this.flush();

    const body: RunCompleteRequest = {
      runId: this.runId,
      completedAt: new Date().toISOString(),
      success,
      counters,
    };
    const resp = await globalThis.fetch(normalizeUrl(this.collectorUrl, `/runs/${this.runId}/complete`), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Collector rejected /complete (${resp.status}): ${text}`);
    }
  }

  /**
   * Receives a test event and flushes when the batch size threshold is reached.
   */
  reportEvent(event: TestEvent): void {
    this.seq += 1;
    this.queue.push(mapTestEventToRunEvent(event, this.seq));

    if (this.queue.length >= this.batchSize) {
      void this.flush();
    }
  }

  reportTestSuitesProgress(_progress: any): void {
    // Progress events can be mapped into protocol events if needed later.
  }

  reportAllTestsProgress(_progress: any): void {
    // Progress events can be mapped into protocol events if needed later.
  }

  /**
   * Sends buffered events to the collector. Safe to call multiple times.
   */
  async flush(): Promise<void> {
    if (!this.runId) {
      return;
    }

    if (this.flushing) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    this.flushing = true;
    try {
      while (this.queue.length > 0) {
        const chunk = this.queue.splice(0, this.batchSize);
        const body: RunEventBatchRequest = {
          runId: this.runId,
          events: chunk,
        };
        const resp = await globalThis.fetch(normalizeUrl(this.collectorUrl, `/runs/${this.runId}/events`), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(`Collector rejected /events (${resp.status}): ${text}`);
        }
      }
    } finally {
      this.flushing = false;
    }
  }
}
