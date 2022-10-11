//
// Copyright 2022 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { Platform } from 'react-native';
import { PowerAuthAuthentication } from '../index';
import { NativeWrapper } from './NativeWrapper';

/**
 * The `AuthResolver` helper class hides internal dependencies when PowerAuthAuthentication needs to be
 * resolved in case of biometry factor is used.
 */
export class AuthResolver {
    /**
     * Construct resolver with required instance identifier.
     * @param instanceId PowerAuth instnace identifier.
     */
    constructor(private instanceId: string) {
    }

    /**
     * Method will process `PowerAuthAuthentication` object are will return object according to the platform.
     * 
     * @param authentication authentication configuration
     * @param makeReusable if the object should be forced to be reusable
     * @returns configured authorization object
     */
    async resolve(authentication: PowerAuthAuthentication, makeReusable: boolean = false): Promise<PowerAuthAuthentication> {
        const obj: ReusablePowerAuthAuthentication = { ...authentication };
        // On android, we need to fetch the key for every biometric authentication.
        // If the key is already set, use it (we're processing reusable biometric authentication)
        if ((Platform.OS == 'android' && authentication.useBiometry && (obj.biometryKey === undefined || makeReusable)) || (Platform.OS == 'ios' && makeReusable)) {
            try {
                obj.biometryKey = (await NativeWrapper.thisCall("authenticateWithBiometry", this.instanceId, authentication.biometryTitle ?? "??", authentication.biometryMessage ?? "??")) as string;
                return obj;
            } catch (e) {
                throw NativeWrapper.processException(e)
            }
        }
        
        // no need for processing, just return original object
        return authentication;
    }
}

/**
 * Extended PowerAuthAuthentication object containing a biometry key.
 */
class ReusablePowerAuthAuthentication extends PowerAuthAuthentication {
    biometryKey?: string
}