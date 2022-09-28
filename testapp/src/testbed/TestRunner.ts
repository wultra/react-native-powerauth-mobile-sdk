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

import { Platform } from "react-native";
import { TestConfig } from "../Config";
import { getAllObjectMethods } from "./private/ObjectHelper";
import { TestInteraction, TestPromptDuration } from "./TestInteraction";
import { TestEvent, TestEventType, TestMonitor } from "./TestMonitor";
import { TestCounter } from "./TestProgress";
import { TestContext, TestMethod, TestSuite } from "./TestSuite";

export class TestRunner {
    readonly batchName: string
    readonly config: TestConfig
    readonly monitor: TestMonitor
    readonly interaction?: TestInteraction

    readonly allSuitesCounter: TestCounter
    readonly allTestsCounter: TestCounter

    constructor(
        batchName: string,
        config: TestConfig,
        monitor: TestMonitor,
        interaction: TestInteraction | undefined
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
        try {
            if (!this.beforeBatch(tests)) {
                return false
            }
            for (const i in tests) {
                await this.runTestSuite(tests[i])
            }
            this.afterBatch()
            return this.allSuitesCounter.failed == 0    
        } catch (e) {
            this.monitor.reportEvent(TestEvent.batchFail(this.batchName, 'Unhandled error while executing tests.', e))
            if (e instanceof Error) {
                console.error(`${e.name}: ${e.message}`)
            }
            return false
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
        if (this.allTestsCounter.skipped == this.allTestsCounter.total) {
            this.monitor.reportEvent(TestEvent.batchFail(this.batchName, "All tests were skipped."))
        } else {
            if (this.allSuitesCounter.failed == 0 && this.allTestsCounter.failed == 0) {
                this.monitor.reportEvent(TestEvent.batchInfo(this.batchName, "All tests succeeded."))
            } else {
                this.monitor.reportEvent(TestEvent.batchFail(this.batchName, `Failed ${this.allSuitesCounter.failed} from ${this.allSuitesCounter.total} test suites.`))
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
                context.interaction.reportSkip("Test suite is interactive, but the current test runner doesn't support interaction with the user.")
            }
            await testSuite.beforeAll()
        })

        // Iterate over all test methods
        for (const i in testMethods) {
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
                await (suiteObj[methodName] as TestMethod)()
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

enum RunnerState {
    BEFORE_ALL,
    BEFORE_EACH,
    IN_TEST,
    AFTER_EACH,
    AFTER_ALL
}

class RunnerContext implements TestInteraction {

    readonly config: TestConfig
    readonly interaction?: TestInteraction

    private currentSuiteName?: string
    get testSuiteName(): string {
        if (!this.currentSuiteName) {
            throw new Error('Internal testbed error. Name of test suite is not known.')
        }
        return this.currentSuiteName
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
        interaction: TestInteraction | undefined,
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

        try {
            if (testMethodsCount > 0) {
                await action(this.contextForTest())
            } else {
                throw new Error('Test suite is empty. Please implement at least one method starting with \'test\', \'iosTest\' or \'androidTest\'')
            }
        } catch (e) {
            this.reportResult(e)
        }
    }

    async afterAll(action: (context: TestContext) => Promise<void>) {
        this.state = RunnerState.AFTER_ALL
        this.currentTestName = undefined
        try {
            if (!this.isSkipped && !this.isFailed) {
                await action(this.contextForTest())
            }
            this.reportResult()
        } catch (e) {
            this.reportResult(e)
        }
        this.currentSuiteName = undefined
    }

    async beforeEach(testName: string, action: (context: TestContext) => Promise<void>) {
        this.currentTestName = testName
        this.state = RunnerState.BEFORE_EACH
        this.isTestSkipped = this.isSkipped
        this.isTestFailed = this.isFailed

        this.monitor.reportEvent(TestEvent.testStart(this.contextForTest(false)))

        try {
            if (!this.isSkipped && !this.isFailed) {
                await action(this.contextForTest())
            }
        } catch (e) {
            this.reportResult(e)
        }
    }

    async each(action: (context: TestContext) => Promise<void>) {
        this.state = RunnerState.IN_TEST
        try {
            // Ignore this test if beforeEach() failed
            if (!this.isTestSkipped && !this.isTestFailed) {
                await action(this.contextForTest())
            }
        } catch (e) {
            this.reportResult(e)
        }
    }

    async afterEach(action: (context: TestContext) => Promise<void>) {
        this.state = RunnerState.AFTER_EACH
        try {
            // Ignore afterEach() only if everything is skipped or fails.
            if (!this.isSkipped && !this.isFailed) {
                await action(this.contextForTest())
            }
            this.reportResult()
        } catch (e) {
            this.reportResult(e)
        }
        this.currentTestName = undefined
    }

    private contextForTest(forEvent: boolean = false): TestContext {
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
        let ctx = {
            config: this.config,
            testSuiteName: this.testSuiteName,
            testName: testName,
            interaction: this,
            interactionIsAllowed: this.interaction !== undefined
        }
        return ctx
    }

    private reportResult(failure: any = undefined) {
        let event: TestEvent | undefined
        const ctx = this.contextForTest(false)
        switch (this.state) {
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

    async showPrompt(message: string, duration: TestPromptDuration): Promise<void> {
        if (!this.interaction) {
            throw new Error(`Interaction the user is not allowed for this test.`)
        }
        await this.interaction.showPrompt(message, duration)
    }
    
    reportInfo(message: string): void {
        let evt: TestEvent
        let ctx = this.contextForTest(true)
        switch (this.state) {
            case RunnerState.BEFORE_ALL:
            case RunnerState.AFTER_ALL:
                evt = TestEvent.suiteInfo(ctx, message)
                break
            case RunnerState.BEFORE_EACH:
            case RunnerState.IN_TEST:
            case RunnerState.AFTER_EACH:
                evt = TestEvent.testInfo(ctx, message)
                break
        }
        this.monitor.reportEvent(evt)
        this.interaction?.reportInfo(message)
    }

    reportSkip(reason: string): void {
        if (this.state == RunnerState.AFTER_EACH) {
            throw new Error(`You should not call reportSkip() from afterEach() function`)
        }
        if (this.state == RunnerState.AFTER_ALL) {
            throw new Error(`You should not call reportSkip() from afterAll() function`)
        }
        let evt: TestEvent | undefined
        let ctx = this.contextForTest(false)
        if (this.state == RunnerState.BEFORE_EACH || this.state == RunnerState.IN_TEST) {
            if (!this.isTestSkipped) {
                this.isTestSkipped = true
                this.testsCounter.addSkipped()
                evt = TestEvent.testSkip(ctx, reason)    
            }
        } else {
            if (!this.isSkipped) {
                this.isSkipped = true
                this.suitesCounter.addSkipped()
                this.testsCounter.addSkipped(this.testMethodsCount)
                evt = TestEvent.suiteSkip(ctx, reason)
            }
        }
        if (evt != undefined) {
            this.monitor.reportEvent(evt)
            this.interaction?.reportSkip(reason)    
        }
    }
}
