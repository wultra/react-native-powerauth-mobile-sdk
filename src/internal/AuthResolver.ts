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
     * The method should be used only for the signing purposes.
     * @param authentication Authentication configuration
     * @param makeReusable if the object should be forced to be reusable
     * @returns configured authorization object
     */
    async resolve(authentication: PowerAuthAuthentication, makeReusable: boolean = false): Promise<PowerAuthAuthentication> {
        // Force cast to private interface and patch possible legacy object.
        const correctAuth = authentication.convertLegacyObject(false)
        const privateAuth = (correctAuth as any as PrivatePowerAuthAuthentication)
        // Test whether previously fetched biometryKeyId is invalid. Reset biometry key's identifier
        // if underlying data object is no longer valid.
        if (privateAuth.biometryKeyId && !NativeObject.isValidNativeObject(privateAuth.biometryKeyId)) {
            privateAuth.biometryKeyId = undefined
        }
        // Validate whether biometric key is set
        const useBiometry = privateAuth.isBiometry
        // On both platforms we need to fetch the key for every biometric authentication.
        // If the key is already set, use it.
        if (useBiometry && !privateAuth.biometryKeyId) {
            try {
                const prompt = correctAuth.biometricPrompt
                // Acquire biometry key. The function returns ID to underlying data object with a limited validity.
                privateAuth.biometryKeyId = (await NativeWrapper.thisCall('authenticateWithBiometry', this.instanceId, prompt, makeReusable)) as string;
                return correctAuth;
            } catch (e) {
                throw NativeWrapper.processException(e)
            }
        }
        // no other processing is required
        return correctAuth;
    }
}

/**
 * Reveals private properties in PowerAuthAuthentication object.
 * See private section of `PowerAuthAuthentication`.
 */
interface PrivatePowerAuthAuthentication {
    biometryKeyId?: string
    isBiometry: boolean
}