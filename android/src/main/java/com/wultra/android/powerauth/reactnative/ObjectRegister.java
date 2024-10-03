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
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.wultra.android.powerauth.js.ObjectRegisterJs;

/**
 * Object register that allows us to expose native objects into JavaScript world.
 * The object is identified by an unique identifier created at the time of registration
 * or by application provided identifier.
 */
@SuppressWarnings("unused")
@ReactModule(name = "PowerAuthObjectRegister")
public class ObjectRegister extends BaseJavaModule {

    private final ObjectRegisterJs objectRegisterJs;

    public ObjectRegister(ReactApplicationContext context) {
        this.objectRegisterJs = new ObjectRegisterJs(context.getApplicationContext());
    }

    public ObjectRegisterJs getObjectRegisterJs() {
        return objectRegisterJs;
    }

    // ---------------------------------------------------------------------------------------------
    // RN integration

    @NonNull
    @Override
    public String getName() {
        return objectRegisterJs.getName();
    }

    @Override
    public void invalidate() {
        super.invalidate();
        objectRegisterJs.invalidate();
    }

    // ---------------------------------------------------------------------------------------------
    // JavaScript interface

    @ReactMethod
    void isValidNativeObject(String objectId, Promise promise) {
        objectRegisterJs.isValidNativeObject(objectId, promise);
    }

    @ReactMethod
    void debugDump(String instanceId, Promise promise) {
        objectRegisterJs.debugDump(instanceId, promise);
    }

    @ReactMethod
    void debugCommand(String command, ReadableMap options, Promise promise) {
        objectRegisterJs.debugCommand(command, options, promise);
    }
}
