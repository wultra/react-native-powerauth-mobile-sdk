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

import { Platform } from "react-native"
import { TestSuite, expect } from "../../src/testbed"

/**
 * This test suite allows you to configure point of skip or failure during the testing.
 */
export class ConfigurableTest extends TestSuite {

    confAllowSkipFromBeforeEach = false
    confAllowSkipFromAfterEach = false
    confAllowSkipFromBeforeAll = false
    confAllowSkipFromAfterAll = false
    confAllowSkipFromFunc = false
    confAllowDoubleSkip = false
    
    confAllowFailFromFunc = false
    confAllowFailFromBeforeAll = false
    confAllowFailFromAfterAll = false
    confAllowFailFromBeforeEach = false
    confAllowFailFromAfterEach = false

    _beforeAllCalled = 0
    _beforeEachCalled = 0
    _afterEachCalled = 0
    _afterAllCalled = 0

    _test1Called = 0
    _test2Called = 0
    _testSkippedCalled = 0
    _testSkippedFromTestCalled = 0
    _testFailedCalled = 0
    _iosTestCalled = 0
    _androidTestCalled = 0

    async beforeAll() {
        this._beforeAllCalled++
        await super.beforeAll()
        if (this.confAllowSkipFromBeforeAll) {
            this.reportSkip('Skipped from beforeAll')
            if (this.confAllowDoubleSkip) {
                this.reportSkip('Skipped from beforeAll for 2nd time')
            }
        }
        if (this.confAllowFailFromBeforeAll) {
            throw new Error('Failed form beforeAll')
        }
    }
    
    async afterAll() {
        this._afterAllCalled++
        await super.afterAll()
        if (this.confAllowSkipFromAfterAll) {
            this.reportSkip('Skipped from afterAll')
            if (this.confAllowDoubleSkip) {
                this.reportSkip('Skipped from afterAll for 2nd time')
            }
        }
        if (this.confAllowFailFromAfterAll) {
            throw new Error('Failed form afterAll')
        }
    }

    async beforeEach() {
        this._beforeEachCalled++
        await super.beforeEach()
        if (this.confAllowSkipFromBeforeEach && this.currentTestName === 'testSkipped') {
            this.reportSkip('Skipped from beforeEach')
            if (this.confAllowDoubleSkip) {
                this.reportSkip('Skipped from beforeEach for 2nd time')
            }
        }
        if (this.confAllowFailFromBeforeEach && this.currentTestName === 'testFailed') {
            throw new Error('Failed form beforeEach')
        }
    }
    
    async afterEach() {
        this._afterEachCalled++
        await super.afterEach()
        if (this.confAllowSkipFromAfterEach && this.currentTestName == 'testSkipped') {
            this.reportSkip('Skipped from afterEach')
            if (this.confAllowDoubleSkip) {
                this.reportSkip('Skipped from afterEach for 2nd time')
            }
        }
        if (this.confAllowFailFromAfterEach && this.currentTestName === 'testFailed') {
            throw new Error('Failed form afterEach')
        }
    }

    async test1() {
        this._test1Called++
    }

    async test2() {
        this._test2Called++
    }

    async testSkipped() {
        this._testSkippedCalled++
    }

    async testSkippedFromTest() {
        this._testSkippedFromTestCalled++
        if (this.confAllowSkipFromFunc) {
            this.reportSkip('Skipped from test')
            if (this.confAllowDoubleSkip) {
                this.reportSkip('Skipped from afterEach for 2nd time')
            }
        }
    }

    async testFailed() {
        this._testFailedCalled++
        if (this.confAllowFailFromFunc) {
            throw new Error('Failed form test')
        }
    }

    async androidTest() {
        expect(Platform.OS).toBe('android')
        this._androidTestCalled++
    }

    async iosTest() {
        expect(Platform.OS).toBe('ios')
        this._iosTestCalled++
    }
}
