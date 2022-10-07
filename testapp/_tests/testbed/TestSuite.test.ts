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

import { TestRunner, TestSuite, expect, TestEventType } from "../../src/testbed";
import { ConfigurableTest } from "./ConfigurableTest";
import { CustomInteraction } from "./CustomInteraction";
import { CustomMonitor } from "./CustomMonitor";

export class TestSuiteTests extends TestSuite {
    async testRunOnlyOneTest() {
        const monitor = new CustomMonitor()
        const runner = new TestRunner('testRunOnlyOneTest', this.config, monitor, undefined)
        const t = new ConfigurableTest()
        t.runOnlyOneTest = 'test2'
        const result = await runner.runTests([ t ])
        expect(result).toBeTruthy()
        expect(t._beforeAllCalled).toBe(1)
        expect(t._afterAllCalled).toBe(1)
        expect(t._beforeEachCalled).toBe(6)
        expect(t._afterEachCalled).toBe(6)
        expect(t._test1Called).toBe(0)
        expect(t._test2Called).toBe(1)
        expect(t._testSkippedCalled).toBe(0)
        expect(t._testSkippedFromTestCalled).toBe(0)
        expect(t._testFailedCalled).toBe(0)
        expect(t._androidTestCalled).toBe(0)
        expect(t._iosTestCalled).toBe(0)
    }

    async testInfoMessages() {
        const monitor = new CustomMonitor()
        const interaction = new CustomInteraction()
        const runner = new TestRunner('testInfoMessages', this.config, monitor, interaction)
        const t = new ConfigurableTest()
        t.printDebugMessages = true
        const result = await runner.runTests([ t ])
        expect(result).toBeTruthy()
        const el = monitor.eventList
        expect(el[0].eventType).toBe(TestEventType.BATCH_INFO)
        expect(el[0].message).toBe("Starting 1 test suites with 6 tests inside.")
    }

    async testSkipMessages() {
        const monitor = new CustomMonitor()
        const interaction = new CustomInteraction()
        const runner = new TestRunner('testSkipMessages', this.config, monitor, interaction)
        const t = new ConfigurableTest()
        t.printDebugMessages = true
        t.confAllowSkipFromFunc = true
        const result = await runner.runTests([ t ])
        expect(result).toBeTruthy()
    }
}