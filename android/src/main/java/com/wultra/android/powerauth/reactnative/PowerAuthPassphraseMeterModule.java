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

import androidx.annotation.NonNull;

import com.facebook.react.bridge.BaseJavaModule;
import com.facebook.react.bridge.Dynamic;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.wultra.android.powerauth.js.PowerAuthPassphraseMeterJsModule;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuthPassphraseMeter")
public class PowerAuthPassphraseMeterModule extends BaseJavaModule {

    private final PowerAuthPasswordModule passwordModule;
    private final PowerAuthPassphraseMeterJsModule powerAuthPassphraseMeterJsModule;

    public PowerAuthPassphraseMeterModule(@NonNull PowerAuthPasswordModule passwordModule) {
        this.passwordModule = passwordModule;
        this.powerAuthPassphraseMeterJsModule = new PowerAuthPassphraseMeterJsModule(passwordModule.getPowerAuthPasswordJsModule());
    }

    public PowerAuthPassphraseMeterJsModule getPowerAuthPassphraseMeterJsModule() {
        return powerAuthPassphraseMeterJsModule;
    }

    @NonNull
    @Override
    public String getName() {
        return powerAuthPassphraseMeterJsModule.getName();
    }

    @ReactMethod
    void testPin(Dynamic password, Promise promise) {
        powerAuthPassphraseMeterJsModule.testPin(password, promise);
    }
}
