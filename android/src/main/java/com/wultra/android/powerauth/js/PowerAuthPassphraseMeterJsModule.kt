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
package com.wultra.android.powerauth.js

import com.wultra.android.powerauth.bridge.JsApiMethod
import com.wultra.android.powerauth.bridge.Arguments
import com.wultra.android.powerauth.bridge.Dynamic
import com.wultra.android.powerauth.bridge.Promise

public class PowerAuthPassphraseMeterJsModule(private val passwordJsModule: PowerAuthPasswordJsModule) :
    BaseJavaJsModule {
    override fun getName(): String {
        return "PowerAuthPassphraseMeter"
    }

    @JsApiMethod
    fun testPin(password: Dynamic?, promise: Promise) {
        try {
            // Resolve password object into core password object.
            val corePassword = passwordJsModule.touchPassword(password)
            val resultAndLength =
                corePassword.validatePasswordComplexity { passwordBytes: ByteArray ->
                    val result = PinTester().testPin(passwordBytes)
                    result or ((passwordBytes.size and 0xFFF) shl 16)
                }
            // Process result
            val result = resultAndLength and 0xFFFF
            val pinLength = resultAndLength shr 16
            // Throw exceptions if input is wrong.
            if (result == PinTester.RES_WRONG_INPUT) {
                throw WrapperException(Errors.EC_WRONG_PARAMETER, "Not a PIN")
            } else if (result == PinTester.RES_TOO_SHORT) {
                throw WrapperException(Errors.EC_WRONG_PARAMETER, "PIN is too short")
            } else {
                // It looks like input is OK, so process the result.
                val issues = Arguments.createArray()
                val isWeak: Boolean
                if (result != PinTester.RES_OK) {
                    // Some issues found, so prepare array with issues
                    if ((result and PinTester.RES_NOT_UNIQUE) != 0) {
                        issues.pushString("NOT_UNIQUE")
                    }
                    if ((result and PinTester.RES_REPEATING_CHARS) != 0) {
                        issues.pushString("REPEATING_CHARS")
                    }
                    if ((result and PinTester.RES_HAS_PATTERN) != 0) {
                        issues.pushString("PATTERN_FOUND")
                    }
                    if ((result and PinTester.RES_POSSIBLY_DATE) != 0) {
                        issues.pushString("POSSIBLY_DATE")
                    }
                    if ((result and PinTester.RES_FREQUENTLY_USED) != 0) {
                        issues.pushString("FREQUENTLY_USED")
                    }
                    // Prepare weak flag
                    isWeak = if (pinLength <= 4) {
                        result and (PinTester.RES_FREQUENTLY_USED or PinTester.RES_NOT_UNIQUE) != 0
                    } else if (pinLength <= 6) {
                        result and (PinTester.RES_FREQUENTLY_USED or PinTester.RES_NOT_UNIQUE or PinTester.RES_REPEATING_CHARS) != 0
                    } else {
                        result and (PinTester.RES_FREQUENTLY_USED or PinTester.RES_NOT_UNIQUE or PinTester.RES_REPEATING_CHARS or PinTester.RES_HAS_PATTERN) != 0
                    }
                } else {
                    isWeak = false
                }
                val map = Arguments.createMap()
                map.putBoolean("shouldWarnUserAboutWeakPin", isWeak)
                map.putArray("issues", issues)
                promise.resolve(map)
            }
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        }
    }
}
