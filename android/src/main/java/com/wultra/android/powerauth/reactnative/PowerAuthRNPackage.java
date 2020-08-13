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

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class PowerAuthRNPackage implements ReactPackage {

    private PowerAuthRNModule mPowerAuthModule;
    private PowerAuthRNConfiguration mConfig;

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
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
     * @param instanceId Identifier of the PowerAuthSDK instance. The package name is recommended.
     * @param appKey APPLICATION_KEY as defined in PowerAuth specification - a key identifying an application version.
     * @param appSecret APPLICATION_SECRET as defined in PowerAuth specification - a secret associated with an application version.
     * @param masterServerPublicKey KEY_SERVER_MASTER_PUBLIC as defined in PowerAuth specification - a master server public key.
     * @param baseEndpointUrl Base URL to the PowerAuth Standard RESTful API (the URL part before "/pa/...").
     * @param enableUnsecureTraffic If HTTP and invalid HTTPS communication should be enabled
     * @throws IllegalStateException When the module was already configured.
     */
    public void configure(String instanceId, String appKey, String appSecret, String masterServerPublicKey, String baseEndpointUrl, boolean enableUnsecureTraffic) throws IllegalStateException, IllegalArgumentException {
        PowerAuthRNConfiguration config = new PowerAuthRNConfiguration(instanceId, appKey, appSecret, masterServerPublicKey, baseEndpointUrl, enableUnsecureTraffic);

        if (mPowerAuthModule != null) {
            // Module was already created, configure it right away.
            mPowerAuthModule.configure(config);
        } else {
            // Keep the config until the module is created
            mConfig = config;
        }
    }
}