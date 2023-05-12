//
// Copyright 2022 Wultra s.r.o.
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
//

import { Platform } from "react-native";
import { TestConfig } from "../Config";
import { describeError } from "./private/ErrorHelper";
import { getAllObjectMethods } from "./private/ObjectHelper";
import { TestInteraction, UserInteraction, UserPromptDuration } from "./TestInteraction";
import { TestEvent, TestMonitor } from "./TestMonitor";
import { TestCounter } from "./TestProgress";
import { TestContext, TestSuite } from "./TestSuite";

export class TestRunner {
    readonly batchName: string
    readonly config: TestConfig
    readonly monitor: TestMonitor
    readonly interaction?: UserInteraction

    readonly allSuitesCounter: TestCounter
    readonly allTestsCounter: TestCounter

    constructor(
        batchName: string,
        config: TestConfig,
        monitor: TestMonitor,
        interaction: UserInteraction | undefined
    ) {
        this.batchName = batchName
        this.config = config
        this.monitor = monitor
        this.interaction = interaction
        this.allSuitesCounter = new TestCounter("Test suites")
        this.allTestsCounter = new TestCounter("All tests")
        this.allSuitesCounter.addObserver(() => monitor.reportTestSuitesProgress)
        this.allTestsCounter.addObserver(() => monitor.reportAllTestsProgress)
    }

    get isInteractive(): boolean {
        return this.interaction !== undefined
    }

    async runTests(tests: TestSuite[]): Promise<boolean> {
        if (this.testsInProgress) {
            console.error(`Tests are still running...`)
            return false
        }
        try {
            if (this.config.debug?.singleTestSuite) {
                const suiteIndex = tests.findIndex(suite => suite.suiteName === this.config.debug?.singleTestSuite)
                const suite = tests[suiteIndex]
                tests = [suite]
                if (this.config.debug?.singleTestName) {
                    suite.runOnlyOneTest = this.config.debug?.singleTestName
                }
            }    
            this.testsInProgress = true
            this.requestCancel = false
            if (!this.beforeBatch(tests)) {
                return false
            }
            for (const i in tests) {
                await this.runTestSuite(tests[i])
                if (this.requestCancel) {
                    break
                }
            }
            this.afterBatch()
            return this.allSuitesCounter.failed == 0    
        } catch (e) {
            this.monitor.reportEvent(TestEvent.batchFail(this.batchName, 'Unhandled error while executing tests.', e))
            if (e instanceof Error) {
                console.error(`${describeError(e, true)}`)
            }
            return false
        } finally {
            this.testsInProgress = false
            this.requestCancel = false
            this.cancelCompletion?.forEach(callback => callback())
            this.cancelCompletion = undefined
        }
    }

    private testsInProgress = false
    private requestCancel = false
    private cancelCompletion?: Array<()=>void>

    get isRunning(): boolean {
        return this.testsInProgress
    }

    cancelRunningTests(callback: (() => void) | undefined = undefined) {
        this.requestCancel = true
        if (callback) {
            if (!this.cancelCompletion) {
                this.cancelCompletion = new Array<() => void>(callback)
            } else {
                this.cancelCompletion.push(callback)
            }    
        }
    }

    private beforeBatch(tests: TestSuite[]): boolean {
        if (tests.length == 0) {
            this.monitor.reportEvent(TestEvent.batchFail(this.batchName, "No test suites to run."))
            return false
        }
        // Populate all test methods
        const allTestsCount = tests.reduce((prev, testSuite) => prev + this.populateTestMethods(testSuite).length, 0)
        // If no test method found, then report an error
        if (allTestsCount == 0) {
            this.monitor.reportEvent(TestEvent.batchFail(this.batchName, "No test methods to execute."))
            return false
        }
        // Reset counters
        this.monitor.reportEvent(TestEvent.batchInfo(this.batchName, `Starting ${tests.length} test suites with ${allTestsCount} tests inside.`))
        this.allSuitesCounter.restart(tests.length)
        this.allTestsCounter.restart(allTestsCount)
        return true
    }

    private afterBatch() {
        if (this.requestCancel) {
            this.monitor.reportEvent(TestEvent.batchInfo(this.batchName, "⛔️ Cancelled."))
        } else if (this.allTestsCounter.skipped == this.allTestsCounter.total) {
            this.monitor.reportEvent(TestEvent.batchFail(this.batchName, "💥 All tests were skipped."))
        } else {
            if (this.allSuitesCounter.failed == 0 && this.allTestsCounter.failed == 0) {
                this.monitor.reportEvent(TestEvent.batchInfo(this.batchName, "✅ All tests succeeded."))
            } else {
                this.monitor.reportEvent(TestEvent.batchFail(this.batchName, `💥 Failed ${this.allSuitesCounter.failed} from ${this.allSuitesCounter.total} test suites.`))
            }
        }
    }

    private async runTestSuite(testSuite: TestSuite) {
        // Create context for this test suite
        const ctx = new RunnerContext(this.config, this.monitor, this.interaction, this.allSuitesCounter, this.allTestsCounter)
        const testMethods = this.populateTestMethods(testSuite)

        // Call "beforeAll()"
        await ctx.beforeAll(testSuite.suiteName, testMethods.length, async (context) => {
            testSuite._assignContext(context)
            if (testSuite.isInteractive && !this.isInteractive) {
                throw new TestSkipException("Test suite is interactive, but the current test runner doesn't support interaction with the user.")
            }
            await testSuite.beforeAll()
        })

        // Iterate over all test methods
        for (const i in testMethods) {
            if (this.requestCancel) {
                break
            }
            const methodName = testMethods[i]
            // Call "beforeEach()"
            await ctx.beforeEach(methodName, async (context) => { 
                testSuite._assignContext(context)
                await testSuite.beforeEach() 
            })
            // Call test method
            await ctx.each(async (context) => { 
                testSuite._assignContext(context)
                const suiteObj = testSuite as any
                const result = suiteObj[methodName].call(testSuite)
                if (result instanceof Promise) {
                    await result
                }
            })
            // Call "afterEach()"
            await ctx.afterEach(async (context) => { 
                testSuite._assignContext(context)
                await testSuite.afterEach()
            })
        }

        // Call "afterAll()"
        await ctx.afterAll(async (context) => {
            testSuite._assignContext(context)
            await testSuite.afterAll()
        })
    }

    private populateTestMethods(testSuite: TestSuite): string[] {
        const allMethods = getAllObjectMethods(testSuite)
        let testMethods = allMethods.filter(method => method.startsWith("test"))
        if (Platform.OS === 'android') {
            // On Android, find and add all 'androidTest*' methods
            testMethods = testMethods.concat(allMethods.filter(method => method.startsWith("androidTest")))
        } else if (Platform.OS === 'ios') {
            // on iOS, find and add all 'iosTest*' methods
            testMethods = testMethods.concat(allMethods.filter(method => method.startsWith("iosTest")))
        }
        return testMethods
    }
}

interface PrivateTestContext extends TestContext {
    contextState: RunnerState
}

type TestContextInfo = Pick<PrivateTestContext, 'contextState' | 'testName' | 'testSuiteName'>

enum RunnerState {
    BEFORE_ALL = 'BEFORE_ALL',
    BEFORE_EACH = 'BEFORE_EACH',
    IN_TEST = 'IN_TEST',
    AFTER_EACH = 'AFTER_EACH',
    AFTER_ALL = 'AFTER_ALL'
}

class RunnerContext implements TestInteraction {

    readonly config: TestConfig
    readonly interaction?: UserInteraction

    private currentSuiteName?: string
    get testSuiteName(): string {
        return this.currentSuiteName ?? '<< empty testSuiteName >>'
    }

    private currentTestName?: string
    get testName(): string | undefined {
        return this.currentTestName
    }
    
    private state = RunnerState.BEFORE_ALL
    private readonly monitor: TestMonitor
    private readonly suitesCounter: TestCounter
    private readonly testsCounter: TestCounter
    private testMethodsCount: number
    
    constructor(
        config: TestConfig,
        monitor: TestMonitor,
        interaction: UserInteraction | undefined,
        suitesCounter: TestCounter,
        testsCounter: TestCounter) {
        this.config = config
        this.monitor = monitor
        this.interaction = interaction
        this.suitesCounter = suitesCounter
        this.testsCounter = testsCounter
        this.testMethodsCount = 0
    }

    private isSkipped = false
    private isTestSkipped = false
    private isFailed = false
    private isTestFailed = false
    private isSomeTestFailed = false

    async beforeAll(suiteName: string, testMethodsCount: number, action: (context: TestContext) => Promise<void>) {

        this.testMethodsCount = testMethodsCount
        this.currentSuiteName = suiteName
        this.state = RunnerState.BEFORE_ALL
        this.isSkipped = false
        this.isTestSkipped = false
        this.isFailed = false
        this.isTestFailed = false
        this.isSomeTestFailed = false

        this.monitor.reportEvent(TestEvent.suiteStart(this.contextForTest(false)))

        const ctx = this.contextForTest()
        try {
            if (testMethodsCount > 0) {
                await action(ctx)
            } else {
                throw new Error('Test suite is empty. Please implement at least one method starting with \'test\', \'iosTest\' or \'androidTest\'')
            }
        } catch (e) {
            this.reportResult(ctx, e)
        }
    }

    async afterAll(action: (context: TestContext) => Promise<void>) {
        this.state = RunnerState.AFTER_ALL
        this.currentTestName = undefined
        const ctx = this.contextForTest()
        try {
            if (!this.isSkipped && !this.isFailed) {
                await action(ctx)
            }
            this.reportResult(ctx)
        } catch (e) {
            this.reportResult(ctx, e)
        }
        this.currentSuiteName = undefined
    }

    async beforeEach(testName: string, action: (context: TestContext) => Promise<void>) {
        this.currentTestName = testName
        this.state = RunnerState.BEFORE_EACH
        this.isTestSkipped = this.isSkipped
        this.isTestFailed = this.isFailed

        if (!this.isSkipped) {
            this.monitor.reportEvent(TestEvent.testStart(this.contextForTest(false)))
        }
        const ctx = this.contextForTest()
        try {
            if (!this.isSkipped && !this.isFailed) {
                await action(ctx)
            }
        } catch (e) {
            this.reportResult(ctx, e)
        }
    }

    async each(action: (context: TestContext) => Promise<void>) {
        this.state = RunnerState.IN_TEST
        const ctx = this.contextForTest()
        try {
            // Ignore this test if beforeEach() failed
            if (!this.isTestSkipped && !this.isTestFailed) {
                await action(ctx)
            }
        } catch (e) {
            this.reportResult(ctx, e)
        }
    }

    async afterEach(action: (context: TestContext) => Promise<void>) {
        this.state = RunnerState.AFTER_EACH
        const ctx = this.contextForTest()
        try {
            // Ignore afterEach() only if everything is skipped or fails.
            if (!this.isSkipped && !this.isFailed) {
                await action(ctx)
            }
            this.reportResult(ctx)
        } catch (e) {
            this.reportResult(ctx, e)
        }
        this.currentTestName = undefined
    }

    private contextForTest(forEvent: boolean = false): PrivateTestContext {
        let testName = this.testName
        if (forEvent) {
            if (this.state == RunnerState.BEFORE_ALL) {
                testName = 'beforeAll'
            } else if (this.state == RunnerState.AFTER_ALL) {
                testName = 'afterAll'
            } else if (testName !== undefined) {
                if (this.state == RunnerState.BEFORE_EACH) {
                    testName = `${testName} :: beforeEach`
                } else if (this.state == RunnerState.AFTER_EACH) {
                    testName = `${testName} :: afterEach`
                }
            }
        }
        return {
            config: this.config,
            testSuiteName: this.testSuiteName,
            testName: testName,
            interaction: this,
            interactionIsAllowed: this.interaction !== undefined,
            contextState: this.state
        }
    }

    private validateContext<T>(context: TestContext, error: any, success: () => T, failure: () => string): T {
        const pContext = context as PrivateTestContext
        if (pContext.contextState === undefined) {
            throw new Error('Invalid TestContext object passed from the TestSuite.')
        }
        const current = this.contextForTest(false)
        if (current.contextState !== current.contextState ||
            current.testSuiteName !== pContext.testSuiteName ||
            current.testName !== pContext.testName) {
            const locationMessage = failure()
            const p = Platform.OS === 'android' ? 'Android' : 'iOS'
            const contextInfo: TestContextInfo = { testSuiteName: pContext.testSuiteName, testName: pContext.testName, contextState: pContext.contextState }
            console.error(`${p}: It appears that test code did not wait for some promise. The context reported from the test is wrong, so the event is reported after the test did finish.`)
            console.error(`${p}:   location : ${locationMessage}`)
            console.error(`${p}:    context : ${JSON.stringify(contextInfo)}`)
            if (error !== undefined) {
                console.error(`${p}:      error : ${JSON.stringify(error)}`)
                // we're already in throw-catch block
            } else {
                // Not in try-catch block
                throw new Error(`It appears that test code did not wait for some promise.`)
            }   
        }
        return success()
    }

    private reportResult(context: TestContext, failure: any = undefined) {
        this.validateContext(context, failure !== undefined, () => {
            this.reportResultImpl(failure)
        }, () => {
            if (failure === undefined) {
                return 'reportResult() reporting success'
            } else if (failure instanceof TestSkipException) {
                return `reportResult() reporting skip`
            } else {
                return `reportResult() reporting issue`
            }
        })
    }

    private reportResultImpl(failure: any) {
        // Context is valid, so report the result.
        const state = this.state
        if (failure instanceof TestSkipException) {
            // Failure is skip, so report skip
            while (true) {
                if (this.state == RunnerState.AFTER_EACH) {
                    failure = new Error(`You should not call reportSkip() from afterEach() function`)
                    break
                }
                if (this.state == RunnerState.AFTER_ALL) {
                    failure = new Error(`You should not call reportSkip() from afterAll() function`)
                    break
                }
                const reason = failure.message
                let event: TestEvent | undefined
                let ctx = this.contextForTest(false)
                if (state == RunnerState.BEFORE_EACH || state == RunnerState.IN_TEST) {
                    if (!this.isTestSkipped) {
                        this.isTestSkipped = true
                        this.testsCounter.addSkipped()
                        event = TestEvent.testSkip(ctx, reason)    
                    }
                } else {
                    if (!this.isSkipped) {
                        this.isSkipped = true
                        this.suitesCounter.addSkipped()
                        this.testsCounter.addSkipped(this.testMethodsCount)
                        event = TestEvent.suiteSkip(ctx, reason)
                    }
                }
                if (event != undefined) {
                    this.monitor.reportEvent(event)
                }
                return
            }
        }
        // Success or failure
        let event: TestEvent | undefined
        const ctx = this.contextForTest(false)
        switch (state) {
            case RunnerState.BEFORE_ALL:
                if (failure !== undefined) {
                    // beforeAll failed
                    this.suitesCounter.addFailed()
                    this.testsCounter.addFailed(this.testMethodsCount)
                    event = TestEvent.suiteFail(ctx, failure)
                    this.isFailed = true
                }
                break
            case RunnerState.BEFORE_EACH:
                if (failure !== undefined) {
                    // beforeEach failed
                    this.testsCounter.addFailed()
                    event = TestEvent.testFail(ctx, failure)
                    this.isTestFailed = this.isSomeTestFailed = true
                }
                break
            case RunnerState.IN_TEST:
                this.testsCounter.addFailed()
                event = TestEvent.testFail(ctx, failure)
                this.isTestFailed = this.isSomeTestFailed = true
                break
            case RunnerState.AFTER_EACH:
                if (failure !== undefined) {
                    // afterEach failed
                    this.isTestFailed = this.isSomeTestFailed = true
                    this.testsCounter.addFailed()
                    event = TestEvent.testFail(ctx, failure)
                } else if (!this.isTestSkipped && !this.isTestFailed) {
                    // Did not skip, or fail
                    this.testsCounter.addSucceeded()
                    event = TestEvent.testSuccess(ctx)
                }
                break
            case RunnerState.AFTER_ALL:
                if (failure !== undefined) {
                    // afterAll failed
                    this.suitesCounter.addFailed()
                    event = TestEvent.testFail(ctx, failure)
                    this.isFailed = true
                } else if (this.isSomeTestFailed) {
                    // Some test failed, so final result for this suite will be a failure
                    this.suitesCounter.addFailed()
                    event = TestEvent.testFail(ctx)
                } else if (!this.isSkipped && !this.isFailed) {
                    // Did not skip or fail all
                    this.suitesCounter.addSucceeded()
                    event = TestEvent.suiteSuccess(ctx)
                }
                break
        }
        if (event !== undefined) {
            this.monitor.reportEvent(event)
        }
        
    }

    // TestInteraction impl.

    async showPrompt(context: TestContext, message: string, duration: UserPromptDuration): Promise<void> {
        await this.validateContext(context, undefined, async () => {
            if (!this.interaction) {
                throw new Error(`Interaction the user is not allowed for this test.`)
            }
            return this.interaction.showPrompt(context, message, duration)
        }, () => {
            return `showPrompt('${message}', ${duration})`
        })
    }

    async sleepWithProgress(context: TestContext, durationMs: number): Promise<void> {
        await this.validateContext(context, undefined, async () => {
            if (!this.interaction) {
                throw new Error(`Interaction the user is not allowed for this test.`)
            }
            return this.interaction.sleepWithProgress(context, durationMs)
        }, () => {
            return `sleepFor(${durationMs})`
        })
    }
    
    reportInfo(context: TestContext, message: string): void {
        this.validateContext(context, undefined, () => {
            this.reportMessage(message, false)
        }, () => {
            return `reportInfo('${message}')`
        })
    }

    reportWarning(context: TestContext, message: string): void {
        this.validateContext(context, undefined, () => {
            this.reportMessage(message, true)
        }, () => {
            return `reportWarning('${message}')`
        })
    }

    reportSkip(context: TestContext, reason: string): void {
        this.validateContext(context, undefined, () => {
            throw new TestSkipException(reason)
        }, () => {
            return `reportSkip('${reason}')`
        })
    }

    reportFailure(context: TestContext, reason: string) {
        this.validateContext(context, undefined, () => {
            throw reason
        }, () => {
            return `reportFailure('${reason}')`
        })
    }

    reportMessage(message: string, warning: boolean) {
        let evt: TestEvent
        const ctx = this.contextForTest(true)
        switch (this.state) {
            case RunnerState.BEFORE_ALL:
            case RunnerState.AFTER_ALL:
                evt = TestEvent.suiteMessage(ctx, message, warning)
                break
            case RunnerState.BEFORE_EACH:
            case RunnerState.IN_TEST:
            case RunnerState.AFTER_EACH:
                evt = TestEvent.testMessage(ctx, message, warning)
                break
        }
        this.monitor.reportEvent(evt)
    }
}

/**
 * Exception reported when test is skipped.
 */
 class TestSkipException extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'TestSkipException'
    }
}
