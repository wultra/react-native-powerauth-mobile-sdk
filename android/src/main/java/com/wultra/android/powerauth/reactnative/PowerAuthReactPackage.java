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
import androidx.annotation.Nullable;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class PowerAuthReactPackage extends BaseReactPackage {

    private static final String OBJECT_REGISTER_NAME = "PowerAuthObjectRegister";
    private static final String PASSWORD_MODULE_NAME = "PowerAuthPassword";
    private static final String ENCRYPTOR_MODULE_NAME = "PowerAuthEncryptor";
    private static final String MAIN_MODULE_NAME = "PowerAuth";
    private static final String PASSPHRASE_METER_NAME = "PowerAuthPassphraseMeter";

    private ObjectRegister objectRegister;
    private PowerAuthPasswordModule passwordModule;
    private PowerAuthEncryptorModule encryptorModule;
    private PowerAuthModule powerAuthModule;
    private PowerAuthPassphraseMeterModule passphraseMeterModule;

    @Nullable
    @Override
    public NativeModule getModule(String name, @NonNull ReactApplicationContext reactContext) {
        System.out.println("getModule " + name);

        return switch (name) {
            case MAIN_MODULE_NAME -> {
                if (powerAuthModule == null) {
                    if (objectRegister == null) {
                        objectRegister = new ObjectRegister(reactContext);
                    }
                    if (passwordModule == null) {
                        passwordModule = new PowerAuthPasswordModule(objectRegister);
                    }
                    powerAuthModule = new PowerAuthModule(reactContext, objectRegister, passwordModule);
                }
                yield powerAuthModule;
            }
            case OBJECT_REGISTER_NAME -> {
                if (objectRegister == null) {
                    objectRegister = new ObjectRegister(reactContext);
                }
                yield objectRegister;
            }
            case PASSWORD_MODULE_NAME -> {
                if (passwordModule == null) {
                    if (objectRegister == null) {
                        objectRegister = new ObjectRegister(reactContext);
                    }
                    passwordModule = new PowerAuthPasswordModule(objectRegister);
                }
                yield passwordModule;
            }
            case ENCRYPTOR_MODULE_NAME -> {
                if (encryptorModule == null) {
                    if (objectRegister == null) {
                        objectRegister = new ObjectRegister(reactContext);
                    }
                    encryptorModule = new PowerAuthEncryptorModule(reactContext, objectRegister);
                }
                yield encryptorModule;
            }
            case PASSPHRASE_METER_NAME -> {
                if (passphraseMeterModule == null) {
                    if (objectRegister == null) {
                        objectRegister = new ObjectRegister(reactContext);
                    }
                    if (passwordModule == null) {
                        passwordModule = new PowerAuthPasswordModule(objectRegister);
                    }
                    passphraseMeterModule = new PowerAuthPassphraseMeterModule(passwordModule);
                }
                yield passphraseMeterModule;
            }
            default -> null;
        };
    }

    @NonNull
    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            final Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();

            // Globally defined common module properties, with an eager init enforcement for Bridgeless support
            boolean needsEagerInit = true;
            boolean hasConstants = false; 
            boolean isCxxModule = false;
            boolean isTurboModule = false;

            moduleInfos.put(
                    OBJECT_REGISTER_NAME,
                    new ReactModuleInfo(
                            OBJECT_REGISTER_NAME,
                            "ObjectRegister",
                            needsEagerInit,
                            hasConstants,
                            isCxxModule,
                            isTurboModule));

            moduleInfos.put(
                    PASSWORD_MODULE_NAME,
                    new ReactModuleInfo(
                            PASSWORD_MODULE_NAME,
                            "PowerAuthPasswordModule",
                            needsEagerInit,
                            hasConstants,
                            isCxxModule,
                            isTurboModule));

            moduleInfos.put(
                    ENCRYPTOR_MODULE_NAME,
                    new ReactModuleInfo(
                            ENCRYPTOR_MODULE_NAME,
                            "PowerAuthEncryptorModule",
                            needsEagerInit,
                            hasConstants,
                            isCxxModule,
                            isTurboModule));

            moduleInfos.put(
                    MAIN_MODULE_NAME,
                    new ReactModuleInfo(
                            MAIN_MODULE_NAME,
                            "PowerAuthModule",
                            needsEagerInit,
                            hasConstants,
                            isCxxModule,
                            isTurboModule));

            moduleInfos.put(
                    PASSPHRASE_METER_NAME,
                    new ReactModuleInfo(
                            PASSPHRASE_METER_NAME,
                            "PowerAuthPassphraseMeterModule",
                            needsEagerInit,
                            hasConstants,
                            isCxxModule,
                            isTurboModule));

            return moduleInfos;
        };
    }
}