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
import { PowerAuthError, PowerAuthErrorCode } from '../model/PowerAuthError';
import { PowerAuthAuthentication } from '../model/PowerAuthAuthentication'

export class __NativeWrapper {

    constructor(private powerAuthInstanceId: string) {

    }

    async call<T>(name: string, ...args): Promise<T> {
        try {
            return await ((NativeModules.PowerAuth[name] as Function).apply(null, [this.powerAuthInstanceId, ...args]));
        } catch (e) {
            throw __NativeWrapper.processException(e);
        }
    }

    static async call<T>(name: string, ...args): Promise<T> {
        try {
            return await ((NativeModules.PowerAuth[name] as Function).apply(null, [...args]));
        } catch (e) {
            throw __NativeWrapper.processException(e);
        }
    }

    /**
     * Process any exception reported from the native module and handle platfrom specific cases.
     * The method also validate whether exception parameter is already PowerAuthError type, to prevent
     * double error wrapping.
     * 
     * @param exception Exception to process.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    static processException(exception: any, message: string = null): PowerAuthError {
        // Initial checks:
        // - Check if exception is null. That can happen when non-native exception is processed.
        // - Check if the exception is already PowerAuthError type. If so, then return the same instance.
        if (exception == null) {
            return new PowerAuthError(null, message ?? "Operation failed with unspecified error")
        } else if (exception as PowerAuthError) {
            // There's no additional message, we can return exception as it is.
            if (message == null) {
                return exception
            }
            // There's additional message, so wrap PowerAuthError into another PowerAuthError
            return new PowerAuthError(exception, message)
        } 
        // Otherwise handle the platform specific cases.
        if (Platform.OS == "android") {
            return this.processAndroidException(exception, message)
        } else if (Platform.OS == "ios") {
            return this.processIosException(exception, message)
        } else {
            return new PowerAuthError(null, "Unsupported platform")
        }
    }

    /**
     * Process iOS specific exception reported from the native module.
     * 
     * @param exception Original exception reported from iOS native module.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    private static processIosException(exception: any, message: string = null): PowerAuthError {
        return new PowerAuthError(exception, message)
    }

    /**
     * Process Android specific exception reported from the native module.
     * 
     * @param exception Original exception reported from Android native module.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    private static processAndroidException(exception: any, message: string = null): PowerAuthError {
        return new PowerAuthError(exception, message)
    }

    /**
     * Method will process `PowerAuthAuthentication` object are will return object according to the platform.
     * 
     * @param authentication authentication configuration
     * @param makeReusable if the object should be forced to be reusable
     * @returns configured authorization object
     */
     async authenticate(authentication: PowerAuthAuthentication, makeReusable: boolean = false): Promise<PowerAuthAuthentication> {

        let obj: ReusablePowerAuthAuthentication = { biometryKey: null, ...authentication };

        // On android, we need to fetch the key for every biometric authentication.
        // If the key is already set, use it (we're processing reusable biometric authentication)
        if ((Platform.OS == "android" && authentication.useBiometry && (obj.biometryKey == null || makeReusable)) || (Platform.OS == "ios" && makeReusable)) {
            try {
                const key = await this.call("authenticateWithBiometry", authentication.biometryTitle ?? "??", authentication.biometryMessage ?? "??") as string;
                obj.biometryKey = key;
                return obj;
            } catch (e) {
                throw __NativeWrapper.processException(e)
            }
        }
        
        // no need for processing, just return original object
        return authentication;
    }
}

class ReusablePowerAuthAuthentication extends PowerAuthAuthentication {
    biometryKey: string;
}
