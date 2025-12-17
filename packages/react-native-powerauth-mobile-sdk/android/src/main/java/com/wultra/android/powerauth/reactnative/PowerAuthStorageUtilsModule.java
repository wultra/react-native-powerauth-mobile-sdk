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

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.wultra.android.powerauth.js.PowerAuthStorageUtilsJsModule;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuthStorageUtils")
public class PowerAuthStorageUtilsModule extends ReactContextBaseJavaModule {

    private final PowerAuthStorageUtilsJsModule powerAuthStorageUtilsJsModule;

    public PowerAuthStorageUtilsModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.powerAuthStorageUtilsJsModule = new PowerAuthStorageUtilsJsModule(reactContext.getApplicationContext());
    }

    public PowerAuthStorageUtilsJsModule getPowerAuthStorageUtilsJsModule() {
        return powerAuthStorageUtilsJsModule;
    }

    @NonNull
    @Override
    public String getName() {
        return powerAuthStorageUtilsJsModule.getName();
    }

    @ReactMethod
    void setString(String key, String value, String storageType, Promise promise) {
        powerAuthStorageUtilsJsModule.setString(key, value, storageType, promise);
    }

    @ReactMethod
    void getString(String key, String storageType, Promise promise) {
        powerAuthStorageUtilsJsModule.getString(key, storageType, promise);
    }

    @ReactMethod
    void exists(String key, String storageType, Promise promise) {
        powerAuthStorageUtilsJsModule.exists(key, storageType, promise);
    }

    @ReactMethod
    void remove(String key, String storageType, Promise promise) {
        powerAuthStorageUtilsJsModule.remove(key, storageType, promise);
    }
}
