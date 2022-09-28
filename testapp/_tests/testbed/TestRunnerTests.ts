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
import { expect, TestLog, TestMonitor, TestMonitorGroup, TestRunner, TestSuite } from "../../src/testbed";
import { ConfigurableTest } from "./ConfigurableTest";
import { CustomInteraction } from "./CustomInteraction";
import { CustomMonitor } from "./CustomMonitor";
import { EmptyTestSuite } from "./EmptyTestSuite";

export class TestRunnerTests extends TestSuite {

    expectOnAndroid = Platform.OS === 'android' ? 1 : 0
    expectOnIos = Platform.OS === 'ios' ? 1 : 0

    monitorRef = new CustomMonitor()
    loggerRef = new TestLog()
    interactionRef = new CustomInteraction()

    // Tests debugging
    /// Set to test function name to run only this
    runOnlyThisTest?: string
    runWithLogger = false

    createRunner(): TestRunner {
        let m: TestMonitor
        const monit = new CustomMonitor()
        const logger = new TestLog()
        const interact = new CustomInteraction()
        if (this.runWithLogger) {
            m = new TestMonitorGroup([ monit, logger ])
        } else {
            m = monit
        }
        this.monitorRef = monit
        this.loggerRef = logger
        this.interactionRef = interact
        return new TestRunner('TestRunnerTests', this.config, m, interact)
    }

    get testMonitor(): CustomMonitor {
        if (this.monitorRef !== undefined) {
            return this.monitorRef
        }
        throw new Error('CustomMonitor not set')
    }

    get testInteraction(): CustomInteraction {
        if (this.interactionRef !== undefined) {
            return this.interactionRef
        }
        throw new Error('CustomInteraction not set')
    }

    async beforeEach() {
        super.beforeEach()
        if (this.runOnlyThisTest !== undefined) {
            if (this.currentTestName !== this.runOnlyThisTest) {
                this.interaction.reportSkip(`Skipping`)
            }
        }
    }

    async testEverythingIsOk() {
        const runner = this.createRunner()

        const t = new ConfigurableTest()
        const result = await runner.runTests([ t, new ConfigurableTest() ])

        expect(result).toBeTruthy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(1)
        expect(t._beforeEachCalled).toBe(6)
        expect(t._afterEachCalled).toBe(6)
        expect(t._test1Called).toBe(1)
        expect(t._test2Called).toBe(1)
        expect(t._testSkippedCalled).toBe(1)
        expect(t._testSkippedFromTestCalled).toBe(1)
        expect(t._testFailedCalled).toBe(1)
        expect(t._androidTestCalled).toBe(this.expectOnAndroid)
        expect(t._iosTestCalled).toBe(this.expectOnIos)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(2)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(0)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(6 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(0)
        expect(runner.allTestsCounter.failed).toBe(0)
    }

    //
    // Next tests validate skip from various places during the test
    //

    async testSkipFromBeforeEach() {
        const runner = this.createRunner()
        
        const t = new ConfigurableTest()
        t.confAllowSkipFromBeforeEach = true
        t.confAllowDoubleSkip = true
        const result = await runner.runTests([ new ConfigurableTest(), t ])

        expect(result).toBeTruthy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(1)
        expect(t._beforeEachCalled).toBe(6)
        expect(t._afterEachCalled).toBe(6)
        expect(t._test1Called).toBe(1)
        expect(t._test2Called).toBe(1)
        expect(t._testSkippedCalled).toBe(0)
        expect(t._testSkippedFromTestCalled).toBe(1)
        expect(t._testFailedCalled).toBe(1)
        expect(t._androidTestCalled).toBe(this.expectOnAndroid)
        expect(t._iosTestCalled).toBe(this.expectOnIos)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(2)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(0)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(5 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(1)
        expect(runner.allTestsCounter.failed).toBe(0)
    }

    async testSkipFromAfterEach() {
        const runner = this.createRunner()
        
        const t = new ConfigurableTest()
        t.confAllowSkipFromAfterEach = true
        t.confAllowDoubleSkip = true
        const result = await runner.runTests([ t, new ConfigurableTest() ])

        expect(result).toBeFalsy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(1)
        expect(t._beforeEachCalled).toBe(6)
        expect(t._afterEachCalled).toBe(6)
        expect(t._test1Called).toBe(1)
        expect(t._test2Called).toBe(1)
        expect(t._testSkippedCalled).toBe(1)
        expect(t._testSkippedFromTestCalled).toBe(1)
        expect(t._testFailedCalled).toBe(1)
        expect(t._androidTestCalled).toBe(this.expectOnAndroid)
        expect(t._iosTestCalled).toBe(this.expectOnIos)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(1)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(1)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(5 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(0)
        expect(runner.allTestsCounter.failed).toBe(1)
    }
    
    async testSkipFromAfterAll() {
        const runner = this.createRunner()
        
        const t = new ConfigurableTest()
        t.confAllowSkipFromAfterAll = true
        t.confAllowDoubleSkip = true
        const result = await runner.runTests([ t, new ConfigurableTest() ])

        expect(result).toBeFalsy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(1)
        expect(t._beforeEachCalled).toBe(6)
        expect(t._afterEachCalled).toBe(6)
        expect(t._test1Called).toBe(1)
        expect(t._test2Called).toBe(1)
        expect(t._testSkippedCalled).toBe(1)
        expect(t._testSkippedFromTestCalled).toBe(1)
        expect(t._testFailedCalled).toBe(1)
        expect(t._androidTestCalled).toBe(this.expectOnAndroid)
        expect(t._iosTestCalled).toBe(this.expectOnIos)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(1)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(1)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(6 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(0)
        expect(runner.allTestsCounter.failed).toBe(0)
    }
    
    async testSkipFromFunc() {
        const runner = this.createRunner()
        
        const t = new ConfigurableTest()
        t.confAllowSkipFromBeforeEach = true
        t.confAllowSkipFromFunc = true
        t.confAllowDoubleSkip = true
        const result = await runner.runTests([ new ConfigurableTest(), t ])

        expect(result).toBeTruthy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(1)
        expect(t._beforeEachCalled).toBe(6)
        expect(t._afterEachCalled).toBe(6)
        expect(t._test1Called).toBe(1)
        expect(t._test2Called).toBe(1)
        expect(t._testSkippedCalled).toBe(0)
        expect(t._testSkippedFromTestCalled).toBe(1)
        expect(t._testFailedCalled).toBe(1)
        expect(t._androidTestCalled).toBe(this.expectOnAndroid)
        expect(t._iosTestCalled).toBe(this.expectOnIos)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(2)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(0)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(4 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(2)
        expect(runner.allTestsCounter.failed).toBe(0)
    }

    async testSkipFromBeforeAll() {
        const runner = this.createRunner()
        
        const t = new ConfigurableTest()
        t.confAllowSkipFromBeforeAll = true
        t.confAllowDoubleSkip = true
        const result = await runner.runTests([ t, new ConfigurableTest() ])

        expect(result).toBeTruthy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(0)
        expect(t._beforeEachCalled).toBe(0)
        expect(t._afterEachCalled).toBe(0)
        expect(t._test1Called).toBe(0)
        expect(t._test2Called).toBe(0)
        expect(t._testSkippedCalled).toBe(0)
        expect(t._testSkippedFromTestCalled).toBe(0)
        expect(t._testFailedCalled).toBe(0)
        expect(t._androidTestCalled).toBe(0)
        expect(t._iosTestCalled).toBe(0)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(1)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(1)
        expect(runner.allSuitesCounter.failed).toBe(0)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(0 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(6)
        expect(runner.allTestsCounter.failed).toBe(0)
    }
    
    //
    // Next tests validate failure from various places during the test
    //
    
    async testFailFromBeforeEach() {
        const runner = this.createRunner()
        
        const t = new ConfigurableTest()
        t.confAllowFailFromBeforeEach = true
        const result = await runner.runTests([ new ConfigurableTest(), t ])

        expect(result).toBeFalsy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(1)
        expect(t._beforeEachCalled).toBe(6)
        expect(t._afterEachCalled).toBe(6)
        expect(t._test1Called).toBe(1)
        expect(t._test2Called).toBe(1)
        expect(t._testSkippedCalled).toBe(1)
        expect(t._testSkippedFromTestCalled).toBe(1)
        expect(t._testFailedCalled).toBe(0)
        expect(t._androidTestCalled).toBe(this.expectOnAndroid)
        expect(t._iosTestCalled).toBe(this.expectOnIos)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(1)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(1)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(5 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(0)
        expect(runner.allTestsCounter.failed).toBe(1)
    }

    async testFailFromAfterEach() {
        const runner = this.createRunner()
        
        const t = new ConfigurableTest()
        t.confAllowFailFromAfterEach = true
        const result = await runner.runTests([ t, new ConfigurableTest() ])

        expect(result).toBeFalsy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(1)
        expect(t._beforeEachCalled).toBe(6)
        expect(t._afterEachCalled).toBe(6)
        expect(t._test1Called).toBe(1)
        expect(t._test2Called).toBe(1)
        expect(t._testSkippedCalled).toBe(1)
        expect(t._testSkippedFromTestCalled).toBe(1)
        expect(t._testFailedCalled).toBe(1)
        expect(t._androidTestCalled).toBe(this.expectOnAndroid)
        expect(t._iosTestCalled).toBe(this.expectOnIos)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(1)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(1)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(5 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(0)
        expect(runner.allTestsCounter.failed).toBe(1)
    }
    
    async testFailFromAfterAll() {
        const runner = this.createRunner()
        
        const t = new ConfigurableTest()
        t.confAllowFailFromAfterAll = true
        const result = await runner.runTests([ t, new ConfigurableTest() ])

        expect(result).toBeFalsy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(1)
        expect(t._beforeEachCalled).toBe(6)
        expect(t._afterEachCalled).toBe(6)
        expect(t._test1Called).toBe(1)
        expect(t._test2Called).toBe(1)
        expect(t._testSkippedCalled).toBe(1)
        expect(t._testSkippedFromTestCalled).toBe(1)
        expect(t._testFailedCalled).toBe(1)
        expect(t._androidTestCalled).toBe(this.expectOnAndroid)
        expect(t._iosTestCalled).toBe(this.expectOnIos)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(1)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(1)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(6 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(0)
        expect(runner.allTestsCounter.failed).toBe(0)
    }
    
    async testFailFromFunc() {
        const runner = this.createRunner()
        
        const t = new ConfigurableTest()
        t.confAllowFailFromFunc = true
        const result = await runner.runTests([ new ConfigurableTest(), t ])

        expect(result).toBeFalsy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(1)
        expect(t._beforeEachCalled).toBe(6)
        expect(t._afterEachCalled).toBe(6)
        expect(t._test1Called).toBe(1)
        expect(t._test2Called).toBe(1)
        expect(t._testSkippedCalled).toBe(1)
        expect(t._testSkippedFromTestCalled).toBe(1)
        expect(t._testFailedCalled).toBe(1)
        expect(t._androidTestCalled).toBe(this.expectOnAndroid)
        expect(t._iosTestCalled).toBe(this.expectOnIos)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(1)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(1)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(5 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(0)
        expect(runner.allTestsCounter.failed).toBe(1)
    }

    async testFailFromBeforeAll() {
        const runner = this.createRunner()
        
        const t = new ConfigurableTest()
        t.confAllowFailFromBeforeAll = true
        const result = await runner.runTests([ t, new ConfigurableTest() ])

        expect(result).toBeFalsy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(0)
        expect(t._beforeEachCalled).toBe(0)
        expect(t._afterEachCalled).toBe(0)
        expect(t._test1Called).toBe(0)
        expect(t._test2Called).toBe(0)
        expect(t._testSkippedCalled).toBe(0)
        expect(t._testSkippedFromTestCalled).toBe(0)
        expect(t._testFailedCalled).toBe(0)
        expect(t._androidTestCalled).toBe(0)
        expect(t._iosTestCalled).toBe(0)

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(1)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(1)

        expect(runner.allTestsCounter.total).toBe(6 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(0 + 6)
        expect(runner.allTestsCounter.progress).toBe(6 + 6)
        expect(runner.allTestsCounter.skipped).toBe(0)
        expect(runner.allTestsCounter.failed).toBe(6)
    }

    async testEmptyTestSuite() {
        const runner = this.createRunner()
        
        const result = await runner.runTests([ new EmptyTestSuite(), new ConfigurableTest() ])

        expect(result).toBeFalsy()

        // validate counters
        expect(runner.allSuitesCounter.total).toBe(2)
        expect(runner.allSuitesCounter.succeeded).toBe(1)
        expect(runner.allSuitesCounter.progress).toBe(2)
        expect(runner.allSuitesCounter.skipped).toBe(0)
        expect(runner.allSuitesCounter.failed).toBe(1)

        expect(runner.allTestsCounter.total).toBe(0 + 6)
        expect(runner.allTestsCounter.succeeded).toBe(0 + 6)
        expect(runner.allTestsCounter.progress).toBe(0 + 6)
        expect(runner.allTestsCounter.skipped).toBe(0)
        expect(runner.allTestsCounter.failed).toBe(0)
    }
}