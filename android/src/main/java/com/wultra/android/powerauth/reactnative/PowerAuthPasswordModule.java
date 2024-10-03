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
import androidx.annotation.Nullable;

import com.facebook.react.bridge.BaseJavaModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.wultra.android.powerauth.js.PowerAuthPasswordJsModule;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuthPassword")
public class PowerAuthPasswordModule extends BaseJavaModule {

    private final ObjectRegister objectRegister;
    private final PowerAuthPasswordJsModule powerAuthPasswordJsModule;

    public PowerAuthPasswordModule(@NonNull ObjectRegister objectRegister) {
        super();
        this.objectRegister = objectRegister;
        this.powerAuthPasswordJsModule = new PowerAuthPasswordJsModule(objectRegister.getObjectRegisterJs());
    }

    public PowerAuthPasswordJsModule getPowerAuthPasswordJsModule() {
        return powerAuthPasswordJsModule;
    }

    @NonNull
    @Override
    public String getName() {
        return powerAuthPasswordJsModule.getName();
    }

    // JavaScript methods

    @ReactMethod
    public void initialize(boolean destroyOnUse, @Nullable String ownerId, int autoreleaseTime, Promise promise) {
        powerAuthPasswordJsModule.initialize(destroyOnUse, ownerId, autoreleaseTime, promise);
    }

    @ReactMethod
    public void release(String objectId, Promise promise) {
        powerAuthPasswordJsModule.release(objectId, promise);
    }

    @ReactMethod
    public void clear(String objectId, Promise promise) {
        powerAuthPasswordJsModule.clear(objectId, promise);
    }

    @ReactMethod
    public void length(String objectId, Promise promise) {
        powerAuthPasswordJsModule.length(objectId, promise);
    }

    @ReactMethod
    public void isEqual(String id1, String id2, Promise promise) {
        powerAuthPasswordJsModule.isEqual(id1, id2, promise);
    }

    @ReactMethod
    public void addCharacter(String objectId, int character, Promise promise) {
        powerAuthPasswordJsModule.addCharacter(objectId, character, promise);
    }

    @ReactMethod
    public void insertCharacter(String objectId, int character, int position, Promise promise) {
        powerAuthPasswordJsModule.insertCharacter(objectId, character, position, promise);
    }

    @ReactMethod
    public void removeCharacter(String objectId, int position, Promise promise) {
        powerAuthPasswordJsModule.removeCharacter(objectId, position, promise);
    }

    @ReactMethod
    public void removeLastCharacter(String objectId, Promise promise) {
        powerAuthPasswordJsModule.removeLastCharacter(objectId, promise);
    }
}
