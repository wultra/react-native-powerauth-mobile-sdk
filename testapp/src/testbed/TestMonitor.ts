/*
 * Copyright 2022 Wultra s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { TestProgress } from "./TestProgress";
import { TestContext } from "./TestSuite";

export enum TestEventType {
    /**
     * Test suite started
     */
    SUITE_START = 'SUITE_START',
    /**
     * Test suite succeeded
     */
    SUITE_SUCCESS = 'SUITE_SUCCESS',
    /**
     * Test suite failed.
     */
    SUITE_FAIL = 'SUITE_FAIL',
    /**
     * Test suite skipped. Message contains a reason.
     */
    SUITE_SKIP = 'SUITE_SKIP',
    /**
     * Information reported from the test's beforeAll() or afterAll() methods.
     */
    SUITE_INFO = 'SUITE_INFO',

    /**
     * Test started.
     */
    TEST_START = 'TEST_START',
    /**
     * Test succeeded.
     */
    TEST_SUCCESS= 'TEST_SUCCESS',
    /**
     * Test failed.
     */
    TEST_FAIL = 'TEST_FAIL',
    /**
     * Test skipped. Message contains a reason.
     */
    TEST_SKIPPED = 'TEST_SKIPPED',
    /**
     * Information reported from the test. Message contains information string.
     */
    TEST_INFO = 'TEST_INFO',

    /**
     * Information reported from the top level of test hierarchy.
     */
    BATCH_INFO = 'BATCH_INFO',
    /**
     * Whole batch failed. Message contains a reason. Suite contains a batch name.
     */
    BATCH_FAIL = 'BATCH_FAIL',
}

export class TestEvent {
    readonly timestamp: Date
    readonly eventType: TestEventType
    readonly suite: string
    readonly testName: string | undefined
    readonly message: string | undefined

    readonly failReason: any
    readonly failCallstack: string | undefined

    get eventDescription(): string {
        if (this.testName !== undefined) {
            return `${this.suite} :: ${this.testName}`
        }
        return this.suite
    }

    get failureDescription(): string {
        if (this.failReason instanceof Error) {
            return `${this.failReason.name}: ${this.failReason.message}`
        }
        return this.message ?? ""
    }

    private constructor(
        eventType: TestEventType,
        suite: string,
        testName: string | undefined = undefined,
        message: string | undefined = undefined,
        failReason: any = undefined,
        callstack: string | undefined = undefined) {
        this.timestamp = new Date()
        this.eventType = eventType
        this.suite = suite
        this.testName = testName
        this.message = message
        this.failReason = failReason
        this.failCallstack = callstack
    }

    static batchFail(batchName: string, reason: string, failure: any = undefined): TestEvent {
        return this.errorEvent(TestEventType.BATCH_FAIL, batchName, undefined, failure, reason)        
    }

    static batchInfo(batchName: string, message: string): TestEvent {
        return new TestEvent(TestEventType.BATCH_INFO, batchName, undefined, message)
    }

    static suiteSkip(ctx: TestContext, reason: string): TestEvent {
        return new TestEvent(TestEventType.SUITE_SKIP, ctx.testSuiteName, ctx.testName, reason)
    }
    static suiteStart(ctx: TestContext): TestEvent {
        return new TestEvent(TestEventType.SUITE_START, ctx.testSuiteName, ctx.testName)
    }
    static suiteFail(ctx: TestContext, failure: any = undefined, message: string | undefined = undefined): TestEvent {
        return this.errorEvent(TestEventType.SUITE_FAIL, ctx.testSuiteName, ctx.testName, failure, message)
    }
    static suiteSuccess(ctx: TestContext): TestEvent {
        return new TestEvent(TestEventType.SUITE_SUCCESS, ctx.testSuiteName, ctx.testName)
    }

    static suiteInfo(ctx: TestContext, message: string) {
        return new TestEvent(TestEventType.SUITE_INFO, ctx.testSuiteName, ctx.testName, message)
    }

    static testSkip(ctx: TestContext, reason: string): TestEvent {
        return new TestEvent(TestEventType.TEST_SKIPPED, ctx.testSuiteName, ctx.testName, reason)
    }
    static testStart(ctx: TestContext): TestEvent {
        return new TestEvent(TestEventType.TEST_START, ctx.testSuiteName, ctx.testName)
    }
    static testFail(ctx: TestContext, failure: any = undefined): TestEvent {
        return this.errorEvent(TestEventType.TEST_FAIL, ctx.testSuiteName, ctx.testName, failure)
    }
    static testSuccess(ctx: TestContext): TestEvent {
        return new TestEvent(TestEventType.TEST_SUCCESS, ctx.testSuiteName, ctx.testName)
    }

    static testInfo(ctx: TestContext, message: string) {
        return new TestEvent(TestEventType.TEST_INFO, ctx.testSuiteName, ctx.testName, message)
    }

    private static errorEvent(type: TestEventType, suite: string, testName: string|undefined, failure: any, message: string | undefined = undefined): TestEvent {
        let failureStack: string | undefined
        if (failure instanceof Error) {
            failureStack = failure.stack
            const failureMessage = `${failure.name}: ${failure.message}`
            if (message !== undefined) {
                const separator = message.endsWith('.') ? ' ' : '. '
                message = `${message}${separator}${failureMessage}`
            } else {
                message = failureMessage
            }
        } else if (typeof failure == 'string' && message === undefined) {
            message = failure
        }
        return new TestEvent(type, suite, testName, message, failure, failureStack)
    }
}

export interface TestMonitor {
    reportEvent(event: TestEvent): void
    reportTestSuitesProgress(progress :TestProgress): void
    reportAllTestsProgress(progress :TestProgress): void
}

export class TestMonitorGroup implements TestMonitor {

    private readonly monitors: TestMonitor[]

    constructor(monitors: TestMonitor[]) {
        this.monitors = monitors
    }

    addMonitor(monitor: TestMonitor) {
        this.monitors.push(monitor)
    }

    removeMonitor(monitor: TestMonitor) {
        const index = this.monitors.indexOf(monitor)
        if (index > -1) {
            this.monitors.splice(index, 1)
        }
    }

    // TestMonitor interface

    reportEvent(event: TestEvent): void {
        this.monitors.forEach((m) => m.reportEvent(event))
    }

    reportTestSuitesProgress(progress: TestProgress): void {
        this.monitors.forEach((m) => m.reportTestSuitesProgress(progress))
    }

    reportAllTestsProgress(progress: TestProgress): void {
        this.monitors.forEach((m) => m.reportAllTestsProgress(progress))
    }
}