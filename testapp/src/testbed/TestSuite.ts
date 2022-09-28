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

import { TestConfig } from "../Config"
import { TestInteraction } from "./TestInteraction"

/**
 * Defines context for running test.
 */
export interface TestContext {
    /**
     * Current test configuration.
     */
    readonly config: TestConfig
    /**
     * Current test suite name.
     */
    readonly testSuiteName: string
    /**
     * Current test name. The value is not defined in `beforeAll()` and `afterAll()` method.
     */
    readonly testName?: string
    /**
     * Current instance of test interaction.
     */
    readonly interaction: TestInteraction
    /**
     * Contains true if interaction with user is allowed.
     */
    readonly interactionIsAllowed: boolean
}

/**
 * Type of test method.
 */
export type TestMethod = () => Promise<void>

/**
 * The `TestSuite` class defines base class for all tests running on device.
 */
export class TestSuite {

    /**
     * Contains current context for running test.
     */
    private currentContext?: TestContext

    /**
     * Test suite's name. If not specified in constructor, then the class name is used.
     */
    readonly suiteName: string

    /**
     * If true, then test require interaction with the user.
     */
    readonly isInteractive: boolean

    // Tests debugging

    /**
     * If set to true, then prints info messages from beforeAll, afterAll, beforeEach, afterEach methods. 
     */
    printInfoMessages: boolean = false

    /**
     * If set to test function name, then it will skip all test functions except this one.
     */
    runOnlyOneTest?: string = undefined

    /**
     * Construct base TestSuite
     * @param suiteName Optional suite name. If undefined, then the class name is used.
     * @param isInteractive Optional test's interactivity. If not provided, then false is used.
     */
    constructor(suiteName: string | undefined = undefined, isInteractive: boolean = false) {
        this.suiteName = suiteName ?? this.constructor.name
        this.isInteractive = isInteractive
    }

    /**
     * Contains current `TestContext`. If no such context is available then throws an error.
     */
    get context(): TestContext {
        if (this.currentContext === undefined) {
            throw new Error('TestContext is not set.')
        }
        return this.currentContext
    }

    /**
     * Contains current `TestConfig`. If no such config is available then throws an error.
     */
    get config(): TestConfig {
        return this.context.config
    }

    /**
     * Contains `TestInteraction` implementation.
     */
    get interaction(): TestInteraction {
        return this.context.interaction
    }

    /**
     * Contains the current name of test, or `undefined` if called from `beforeAll()` or `afterAll()` method.
     */
    get currentTestName(): string | undefined {
        return this.context.testName
    }

    /**
     * Method executed before all tests in this test suite. You can override this method in subclass,
     * but you have to call parent's method in the implementation.
     * @param context Test context.
     */
    async beforeAll() {
        if (this.printInfoMessages) this.reportInfo('beforeAll()')
    }

    /**
     * Method executed after all tests in this test suite. You can override this method in subclass,
     * but you have to call parent's method in the implementation.
     * @param context Test context.
     */
    async afterAll() {
        if (this.printInfoMessages) this.reportInfo('afterAll()')
    }

    /**
     * Method executed before each test in this test suite. You can override this method in subclass,
     * but you have to call parent's method in the implementation.
     * @param context Test context.
     */
    async beforeEach() {
        if (this.printInfoMessages) this.reportInfo('beforeEach()')
        if (this.runOnlyOneTest !== undefined && this.currentTestName !== this.runOnlyOneTest) {
            this.interaction.reportSkip(`Skipped, bevause only ${this.runOnlyOneTest} is allowed to run`)
        }
    }

    /**
     * Method executed after each test in this test suite. You can override this method in subclass,
     * but you have to call parent's method in the implementation.
     * @param context Test context.
     */
    async afterEach() {
        if (this.printInfoMessages) this.reportInfo('afterEach()')
    }

    /**
     * Report information from the test.
     * @param message Information to report.
     */
    reportInfo(message: string) {
        this.interaction.reportInfo(message)
    }

    /**
     * Assing context to the TestSuite. This method is internally called from the TestRunner to assing
     * current context to the test.
     * @param context Context to set.
     */
    _assignContext(context: TestContext) {
        this.currentContext = context
    }
}
