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

import { PasswordType, PowerAuthPassword } from "./index";
import { NativePassphraseMeter } from './internal/NativePassphraseMeter'
import { NativeWrapper } from "./internal/NativeWrapper";

export enum PinTestIssue {
    /**
     * Not enough unique digits found.
     */
    NOT_UNIQUE = "NOT_UNIQUE",
    /**
     * Too much repeating characters.
     */
    REPEATING_CHARS = "REPEATING_CHARS",
    /**
     * There is a pattern in this pin (for example 1357)
     */
    PATTERN_FOUND = "PATTERN_FOUND",
    /**
     * Tested pin could be date (for example 2512 as birthday - 25th of december)
     */
    POSSIBLY_DATE = "POSSIBLY_DATE",
    /**
     * Tested pin is in TOP used pins (like 1234 as number 1 used pin).
     */
    FREQUENTLY_USED = "FREQUENTLY_USED"
}

/**
 * Object representing a PIN test result.
 */
export interface PinTestResult {
    /**
     * If `true` then you should warn user about weak PIN.
     */
    shouldWarnUserAboutWeakPin: boolean
    /**
     * List of all issues found during the test.
     */
    issues: PinTestIssue[]
}

/**
 * Object providing interface to test strength of PIN or password. Right now, only
 * the function for PIN testing is provided.
 */
export class PowerAuthPassphraseMeter {
    /**
     * Test strength of PIN.
     * @param pin PIN to test. You can provide string or `PowerAuthPassword` object containing numbers only. 
     * @returns `PinTestResult` object.
     * @throws `PowerAuthErrorCode.WRONG_PARAM` if PIN contains other characters than digits or its length is less than 4.
     */
    static async testPin(pin: PasswordType): Promise<PinTestResult> {
        try {
            return await NativePassphraseMeter.testPin(typeof pin == 'string' ? pin : pin.toRawPassword())
        } catch (error) {
            throw NativeWrapper.processException(error)
        }
    }
}