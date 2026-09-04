/*
 * Copyright 2023 Wultra s.r.o.
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
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;
import com.wultra.android.powerauth.js.PowerAuthEncryptorJsModule;

@SuppressWarnings("unused")
@ReactModule(name = "PowerAuthEncryptor")
public class PowerAuthEncryptorModule extends BaseJavaModule {

    private final ReactApplicationContext context;
    private final ObjectRegister objectRegister;
    private final PowerAuthEncryptorJsModule powerAuthEncryptorJsModule;

    public PowerAuthEncryptorModule(@NonNull ReactApplicationContext context, @NonNull ObjectRegister objectRegister) {
        super();
        this.context = context;
        this.objectRegister = objectRegister;
        this.powerAuthEncryptorJsModule = new PowerAuthEncryptorJsModule(context, objectRegister.getObjectRegisterJs());
    }

    public PowerAuthEncryptorJsModule getPowerAuthEncryptorJsModule() {
        return powerAuthEncryptorJsModule;
    }

    @NonNull
    @Override
    public String getName() {
        return powerAuthEncryptorJsModule.getName();
    }

    public static final String NAME = "PowerAuthEncryptor";

    // JavaScript methods

    @ReactMethod
    void initialize(@NonNull String scope, @NonNull String ownerId, Promise promise) {
        powerAuthEncryptorJsModule.initialize(scope, ownerId, promise);
    }

    // Encryption

    @ReactMethod
    void canEncryptRequest(@NonNull String encryptorId, Promise promise) {
        powerAuthEncryptorJsModule.canEncryptRequest(encryptorId, promise);
    }

    @ReactMethod
    void encryptRequest(@NonNull String encryptorId, @Nullable String requestBodyBase64, Promise promise) {
        powerAuthEncryptorJsModule.encryptRequest(encryptorId, requestBodyBase64, promise);
    }

    // Decryption

    @ReactMethod
    void canDecryptResponse(String encryptorId, Promise promise) {
        powerAuthEncryptorJsModule.canDecryptResponse(encryptorId, promise);
    }

    @ReactMethod
    void decryptResponse(@NonNull String encryptorId, @NonNull String responseBody, Promise promise) {
        powerAuthEncryptorJsModule.decryptResponse(encryptorId, responseBody, promise);
    }
}
