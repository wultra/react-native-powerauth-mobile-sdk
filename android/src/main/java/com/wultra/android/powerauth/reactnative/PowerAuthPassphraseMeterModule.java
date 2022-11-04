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

package com.wultra.android.powerauth.reactnative;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseJavaModule;
import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;

import androidx.annotation.NonNull;
import io.getlime.security.powerauth.core.Password;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuthPassphraseMeter")
public class PowerAuthPassphraseMeterModule extends BaseJavaModule {

    private final PowerAuthPasswordModule passwordModule;

    public PowerAuthPassphraseMeterModule(@NonNull PowerAuthPasswordModule passwordModule) {
        this.passwordModule = passwordModule;
    }

    @NonNull
    @Override
    public String getName() {
        return "PowerAuthPassphraseMeter";
    }

    @ReactMethod
    void testPin(Dynamic password, Promise promise) {
        try {
            // Resolve password object into core password object.
            final Password corePassword = passwordModule.touchPassword(password);
            final int resultAndLength = corePassword.validatePasswordComplexity(passwordBytes -> {
                final int result = new PinTester().testPin(passwordBytes);
                return result | ((passwordBytes.length & 0xFFF) << 16);
            });
            // Process result
            final int result = resultAndLength & 0xFFFF;
            final int pinLength = resultAndLength >> 16;
            // Throw exceptions if input is wrong.
            if (result == PinTester.RES_WRONG_INPUT) {
                throw new WrapperException(Errors.EC_WRONG_PARAMETER, "Not a PIN");
            } else if (result == PinTester.RES_TOO_SHORT) {
                throw new WrapperException(Errors.EC_WRONG_PARAMETER, "PIN is too short");
            } else {
                // It looks like input is OK, so process the result.
                final WritableArray issues = Arguments.createArray();
                final boolean isWeak;
                if (result != PinTester.RES_OK) {
                    // Some issues found, so prepare array with issues
                    if ((result & PinTester.RES_NOT_UNIQUE) != 0) {
                        issues.pushString("NOT_UNIQUE");
                    }
                    if ((result & PinTester.RES_REPEATING_CHARS) != 0) {
                        issues.pushString("REPEATING_CHARS");
                    }
                    if ((result & PinTester.RES_HAS_PATTERN) != 0) {
                        issues.pushString("PATTERN_FOUND");
                    }
                    if ((result & PinTester.RES_POSSIBLY_DATE) != 0) {
                        issues.pushString("POSSIBLY_DATE");
                    }
                    if ((result & PinTester.RES_FREQUENTLY_USED) != 0) {
                        issues.pushString("FREQUENTLY_USED");
                    }
                    // Prepare weak flag
                    if (pinLength <= 4) {
                        isWeak = (result & (PinTester.RES_FREQUENTLY_USED | PinTester.RES_NOT_UNIQUE)) != 0;
                    } else if (pinLength <= 6) {
                        isWeak = (result & (PinTester.RES_FREQUENTLY_USED | PinTester.RES_NOT_UNIQUE | PinTester.RES_REPEATING_CHARS)) != 0;
                    } else {
                        isWeak = (result & (PinTester.RES_FREQUENTLY_USED | PinTester.RES_NOT_UNIQUE | PinTester.RES_REPEATING_CHARS | PinTester.RES_HAS_PATTERN)) != 0;
                    }
                } else {
                    isWeak = false;
                }
                final WritableMap map = Arguments.createMap();
                map.putBoolean("shouldWarnUserAboutWeakPin", isWeak);
                map.putArray("issues", issues);
                promise.resolve(map);
            }
        } catch (Throwable t) {
            Errors.rejectPromise(promise, t);
        }
    }
}
