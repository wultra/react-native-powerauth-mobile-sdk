/*
 * Copyright 2025 Wultra s.r.o.
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

import androidx.annotation.NonNull;

import com.facebook.react.bridge.BaseJavaModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.wultra.android.powerauth.js.PowerAuthCryptoUtilsJsModule;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuthCryptoUtils")
public class PowerAuthCryptoUtilsModule extends BaseJavaModule {

    private final PowerAuthCryptoUtilsJsModule powerAuthCryptoUtilsJsModule;

    public PowerAuthCryptoUtilsModule() {
        super();
        this.powerAuthCryptoUtilsJsModule = new PowerAuthCryptoUtilsJsModule();
    }

    public PowerAuthCryptoUtilsJsModule getPowerAuthCryptoUtilsJsModule() {
        return powerAuthCryptoUtilsJsModule;
    }

    @NonNull
    @Override
    public String getName() {
        return powerAuthCryptoUtilsJsModule.getName();
    }

    @ReactMethod
    void hashSha256(String input, Promise promise) {
        powerAuthCryptoUtilsJsModule.hashSha256(input, promise);
    }

    @ReactMethod
    void randomBytes(int length, Promise promise) {
        powerAuthCryptoUtilsJsModule.randomBytes(length, promise);
    }
}
