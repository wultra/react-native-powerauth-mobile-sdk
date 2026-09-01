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
     * removed, or if the user re-enrolls for face. The default value depends on platform:
     * - On Android is set to `true`
     * - On iOS  is set to `false`
     */
    readonly invalidateBiometricFactorAfterChange?: boolean
    /**
     * Set whether the key protected with the biometry is invalidated after enrolled biometry changes.
     * @deprecated Use `invalidateBiometricFactorAfterChange`.
     */
    readonly linkItemsToCurrentSet?: boolean
    /**
     * ### iOS specific
     * 
     * If set to `true`, then the key protected with the biometry can be accessed also with a device passcode.
     * If set, then `invalidateBiometricFactorAfterChange` has no effect. The default is `false`,
     * so fallback to device's passcode is not enabled.
     *
     * Do not enable this option when the application must distinguish biometric authentication
     * from knowledge-factor authentication. A device-passcode fallback is not proof that the user
     * authenticated with biometry.
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
     * Set whether biometric key setup requires biometric authentication. If `true`, callers must
     * provide a biometric prompt when persisting an activation or adding a biometric factor.
     *
     * The default value is `true`. Key protection algorithm compatibility is configured
     * independently with `useLegacySymmetricKey`.
     */
    readonly authenticateOnBiometricKeySetup?: boolean

    /**
     * ### Android specific
     * 
     * Set whether fallback to a shared, legacy biometry key is enabled. By default, this is enabled for compatibility
     * reasons. If enabled, `PowerAuth` performs an additional lookup for a legacy biometric key previously shared
     * between multiple `PowerAuth` object instances.
     * 
     * If your application uses multiple `PowerAuth` instances, it's recommended to set this configuration to `false`.
     * This is because the native SDK doesn't properly handle multiple activations with the shared biometric key.
     * 
     * If set to `false`, the shared key will no longer be accessible, and you may need to reconfigure the biometric factor
     * for the existing activations on your `PowerAuth` object instances.
     * 
     * The default value is `true`, so the fallback is enabled.
     */
    readonly fallbackToSharedBiometryKey?: boolean
    /**
     * ### Android specific
     *
     * If `true`, newly configured biometric factors use the legacy AES-KDF protection from
     * PowerAuth Mobile SDK 1.x instead of the default HMAC-KDF protection. Existing factors are
     * unaffected. Keep the default value of `false` unless legacy compatibility is required.
     */
    readonly useLegacySymmetricKey?: boolean
}

/**
 * Class that is used to provide biomety configuration for `PowerAuth` class.
 */
export class PowerAuthBiometryConfiguration implements PowerAuthBiometryConfigurationType {
    invalidateBiometricFactorAfterChange: boolean
    /**
     * @deprecated Use `invalidateBiometricFactorAfterChange`.
     */
    linkItemsToCurrentSet!: boolean
    fallbackToDevicePasscode: boolean
    confirmBiometricAuthentication: boolean
    authenticateOnBiometricKeySetup: boolean
    fallbackToSharedBiometryKey: boolean
    useLegacySymmetricKey: boolean

    /**
     * The default class constructor, respecting a platform specific differences.
     */
    public constructor() {
        const d = buildBiometryConfiguration()
        this.invalidateBiometricFactorAfterChange = d.invalidateBiometricFactorAfterChange
        Object.defineProperty(this, 'linkItemsToCurrentSet', {
            enumerable: true,
            configurable: false,
            get: () => this.invalidateBiometricFactorAfterChange,
            set: (value: boolean) => { this.invalidateBiometricFactorAfterChange = value }
        })
        this.fallbackToDevicePasscode = d.fallbackToDevicePasscode
        this.confirmBiometricAuthentication = d.confirmBiometricAuthentication
        this.authenticateOnBiometricKeySetup = d.authenticateOnBiometricKeySetup
        this.fallbackToSharedBiometryKey = d.fallbackToSharedBiometryKey
        this.useLegacySymmetricKey = d.useLegacySymmetricKey
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
    const invalidateBiometricFactorAfterChange = input?.invalidateBiometricFactorAfterChange
        ?? input?.linkItemsToCurrentSet
        ?? Utils.platformOs === 'android'
    return Object.freeze({
        // The following platform switch is required due to fact that the native SDK has by default a different
        // configuration for this attribute. This was not configurable in the previous version of RN wrapper, 
        // so the old behavior must be emulated. If we enforce true or false, then app developers may encounter 
        // a weird behavior after the library update.
        invalidateBiometricFactorAfterChange,
        linkItemsToCurrentSet: invalidateBiometricFactorAfterChange,
        fallbackToDevicePasscode: input?.fallbackToDevicePasscode ?? false,
        confirmBiometricAuthentication: input?.confirmBiometricAuthentication ?? false,
        authenticateOnBiometricKeySetup: input?.authenticateOnBiometricKeySetup ?? true,
        fallbackToSharedBiometryKey: input?.fallbackToSharedBiometryKey ?? true,
        useLegacySymmetricKey: input?.useLegacySymmetricKey ?? false
    })
}
