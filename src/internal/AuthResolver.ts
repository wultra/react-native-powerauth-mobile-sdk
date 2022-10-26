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
import { PowerAuthAuthentication, PowerAuthError, PowerAuthErrorCode } from '../index';
import { NativeWrapper } from './NativeWrapper';
import { NativeObject } from './NativeObject';

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
     * @param recoveringFromError if true, then this is call
     * @returns configured authorization object
     */
    async resolve(authentication: PowerAuthAuthentication, makeReusable: boolean = false): Promise<PowerAuthAuthentication> {
        const obj: ReusablePowerAuthAuthentication = { ...authentication }
        // Test whether previously fetched biometryKeyId is invalid. Reset biometry key's identifier
        // if underlying data object is no longer valid.
        if (obj.biometryKeyId && !NativeObject.isValidNativeObject(obj.biometryKeyId)) {
            obj.biometryKeyId = undefined
        }
        // Validate whether biometric key is set
        if (obj.useBiometry && !await NativeWrapper.thisCallBool('hasBiometryFactor', this.instanceId)) {
            // Biometry is requested but there's no biometry factor set
            throw new PowerAuthError(undefined, "Biometry factor is not configured", PowerAuthErrorCode.BIOMETRY_NOT_CONFIGURED)
        }
        // On android, we need to fetch the key for every biometric authentication.
        // If the key is already set, use it (we're processing reusable biometric authentication)
        if ((Platform.OS == 'android' && authentication.useBiometry && (!obj.biometryKeyId || makeReusable)) ||
            (Platform.OS == 'ios' && makeReusable)) {
            try {
                // Android requires to always provide title and message
                const title   = authentication.biometryTitle ?? '??'
                const message = authentication.biometryMessage ?? '??'
                // Acquire biometry key. The function returns ID to underlying data object with a limited validity.
                obj.biometryKeyId = (await NativeWrapper.thisCall('authenticateWithBiometry', this.instanceId, title, message, makeReusable)) as string;
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
    /**
     * Contains identifier for data allocated in native code.
     */
    biometryKeyId?: string
}