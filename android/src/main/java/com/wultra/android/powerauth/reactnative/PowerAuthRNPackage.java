/*
 * Copyright 2020 Wultra s.r.o.
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

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import io.getlime.security.powerauth.sdk.PowerAuthSDK;

public class PowerAuthRNPackage implements ReactPackage {

    private PowerAuthRNModule mPowerAuthModule;
    private PowerAuthSDK.Builder mConfig;

    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        mPowerAuthModule = new PowerAuthRNModule(reactContext);
        if (mConfig != null) {
            try {
                mPowerAuthModule.configure(mConfig);
            } catch (Exception e) {
                Log.e("PA-RN", "PowerAuth module failed to configure.", e);
            }
            mConfig = null;
        }
        modules.add(mPowerAuthModule);
        return modules;
    }

    /**
     * Prepares the PowerAuth instance.
     *
     * @param builder configuration for the PowerAuth instance
     * @throws IllegalStateException When the module was already configured.
     */
    public void configure(@NonNull PowerAuthSDK.Builder builder) throws IllegalStateException, IllegalArgumentException {

        if (mPowerAuthModule != null) {
            // Module was already created, configure it right away.
            mPowerAuthModule.configure(builder);
        } else {
            // Keep the config until the module is created
            mConfig = builder;
        }
    }
}