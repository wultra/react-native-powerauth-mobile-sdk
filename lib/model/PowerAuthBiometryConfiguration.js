/*
 * Copyright 2021 Wultra s.r.o.
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
import { Platform } from "react-native";
/**
 * Class that is used to provide biomety configuration for `PowerAuth` class.
 */
var PowerAuthBiometryConfiguration = /** @class */ (function () {
    /**
     * The default class constructor, respecting a platform specific differences.
     */
    function PowerAuthBiometryConfiguration() {
        // The following platform switch is required due to fact that the native SDK has by default a different
        // configuration for this attribute. This was not configurable in the previous version of RN wrapper, 
        // so the old behavior must be emulated. If we enforce true or false, then app developers may encounter 
        // a weird behavior after the library update.
        if (Platform.OS == "android") {
            this.linkItemsToCurrentSet = true;
        }
        else {
            this.linkItemsToCurrentSet = false;
        }
        this.fallbackToDevicePasscode = false;
        this.confirmBiometricAuthentication = false;
        this.authenticateOnBiometricKeySetup = true;
    }
    /**
     * @returns `PowerAuthBiometryConfiguration` with default configuration.
     */
    PowerAuthBiometryConfiguration.default = function () {
        return new PowerAuthBiometryConfiguration();
    };
    return PowerAuthBiometryConfiguration;
}());
export { PowerAuthBiometryConfiguration };
