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

import { NativeModules, Platform } from 'react-native';
import { PowerAuthAuthentication } from '../model/PowerAuthAuthentication'

/**
 * Internal authentication utility functions
 */
export class __AuthenticationUtils {

    /**
     * Method will process `PowerAuthAuthentication` object are will return object according to the platform.
     * 
     * @param authentication authentication configuration
     * @param makeReusable if the object should be forced to be reusable
     * @returns configured authorization object
     */
    static async process(instanceId: string ,authentication: PowerAuthAuthentication, makeReusable: boolean = false): Promise<PowerAuthAuthentication> {

        let obj: ReusablePowerAuthAuthentication = { biometryKey: null, ...authentication };

        // On android, we need to fetch the key for every biometric authentication.
        // If the key is already set, use it (we're processing reusable biometric authentication)
        if ((Platform.OS == "android" && authentication.useBiometry && (obj.biometryKey == null || makeReusable)) || (Platform.OS == "ios" && makeReusable)) {
            const key = await NativeModules.PowerAuth.authenticateWithBiometry(instanceId, authentication.biometryTitle ?? "??", authentication.biometryMessage ?? "??");
            obj.biometryKey = key;
            return obj;
        }
        
        // no need for processing, just return original object
        return authentication;
    }
}

class ReusablePowerAuthAuthentication extends PowerAuthAuthentication {
    biometryKey: string;
}