/*
 * Copyright 2024 Wultra s.r.o.
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
import com.facebook.react.bridge.ReactContext;
import io.getlime.security.powerauth.sdk.PowerAuthSDK;

/**
 * PowerAuth React-Native Utilities.
 * @noinspection unused
 */
public class PowerAuthUtils {
    /**
     * Function that lifts PowerAuthSDK instance from the React-Native module if present (configured). If the object is not available, returns nil.
     * Might throw IllegalStateException from the RN layer.
     *
     * Note: calling persistActivationWithAuthentication/removeActivationLocal etc. directly on the lifted
     * instance bypasses PasswordCodePointScheme's marker bookkeeping (which lives in PowerAuthJsModule). This
     * is safe - the affected activation just silently keeps using the legacy (1st. code point only) scheme -
     * but it means the corrected scheme never engages for such an activation.
     *
     * @param instanceId Id of the instance that was configured from the JS/TS layer.
     * @param reactContext React context obtained from your ReactNative module or app.
     * @return Native PowerAuthSDK or null if such instance is not configured.
     */
    @Nullable
    public static PowerAuthSDK liftPowerAuthSdk(@NonNull String instanceId, @NonNull ReactContext reactContext) {
        ObjectRegister module = reactContext.getNativeModule(ObjectRegister.class);
        if (module == null) {
            return null;
        }
        return module.findObject(instanceId, PowerAuthSDK.class);
    }
}