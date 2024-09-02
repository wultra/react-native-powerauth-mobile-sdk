/*
 * Copyright 2022 Wultra s.r.o.
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

import { Utils } from "../internal/Utils"

/**
 * Interface that is used to provide biomety configuration for `PowerAuth` class.
 */
export interface PowerAuthBiometryConfigurationType {
    /**
     * Set whether the key protected with the biometry is invalidated if fingers are added or
     * removed, or if the user re-enrolls for face. The default value depends on plafrom:
     * - On Android is set to `true`
     * - On iOS  is set to `false`
     */
    readonly linkItemsToCurrentSet?: boolean
    /**
     * ### iOS specific
     * 
     * If set to `true`, then the key protected with the biometry can be accessed also with a device passcode.
     * If set, then `linkItemsToCurrentSet` option has no effect. The default is `false`, so fallback
     * to device's passcode is not enabled.
     */
    readonly fallbackToDevicePasscode?: boolean
    /**
     * ### Android specific
     * 
     * If set to `true`, then the user's confirmation will be required after the successful biometric authentication.
     */
    readonly confirmBiometricAuthentication?: boolean
    /**
     * ### Android specific
     * 
     * Set, whether biometric key setup always require a biometric authentication.
     * 
     * ### Discussion
     * 
     * Setting parameter to `true` leads to use symmetric AES cipher on the background,
     * so both configuration and usage of biometric key require the biometric authentication.
     * 
     * If set to `false`, then RSA cipher is used and only the usage of biometric key
     * require the biometric authentication. This is due to fact, that RSA cipher can encrypt
     * data with using it's public key available immediate after the key-pair is created in
     * Android KeyStore.
     * 
     * The default value is `false`.
     */
    readonly authenticateOnBiometricKeySetup?: boolean
}

/**
 * Class that is used to provide biomety configuration for `PowerAuth` class.
 */
export class PowerAuthBiometryConfiguration implements PowerAuthBiometryConfigurationType {
    linkItemsToCurrentSet: boolean
    fallbackToDevicePasscode: boolean
    confirmBiometricAuthentication: boolean
    authenticateOnBiometricKeySetup: boolean

    /**
     * The default class constructor, respecting a platform specific differences.
     */
    public constructor() {
        const d = buildBiometryConfiguration()
        this.linkItemsToCurrentSet = d.linkItemsToCurrentSet
        this.fallbackToDevicePasscode = d.fallbackToDevicePasscode
        this.confirmBiometricAuthentication = d.confirmBiometricAuthentication
        this.authenticateOnBiometricKeySetup = d.authenticateOnBiometricKeySetup
    }

    /**
     * @returns `PowerAuthBiometryConfiguration` with default configuration. 
     */
    public static default(): PowerAuthBiometryConfigurationType {
        return buildBiometryConfiguration()
    }
}

/**
 * Function create a frozen object implementing `BiometryConfigurationType` with all properties set.
 * @param input Optional application's configuration. If not provided, then the default values are set.
 * @returns Frozen `BiometryConfigurationType` interface with all properties set.
 */
export function buildBiometryConfiguration(input: PowerAuthBiometryConfigurationType | undefined = undefined): Required<PowerAuthBiometryConfigurationType> {
    return Object.freeze({
        // The following platform switch is required due to fact that the native SDK has by default a different
        // configuration for this attribute. This was not configurable in the previous version of RN wrapper, 
        // so the old behavior must be emulated. If we enforce true or false, then app developers may encounter 
        // a weird behavior after the library update.
        linkItemsToCurrentSet: input?.linkItemsToCurrentSet ?? Utils.platformOs === 'android',
        fallbackToDevicePasscode: input?.fallbackToDevicePasscode ?? false,
        confirmBiometricAuthentication: input?.confirmBiometricAuthentication ?? false,
        authenticateOnBiometricKeySetup: input?.authenticateOnBiometricKeySetup ?? true
    })
}