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

/**
 * Interface that representing the keychain settings.
 */
export interface PowerAuthKeychainConfigurationData {
    /**
     * ### iOS specific
     * 
     * Access group name used by the `PowerAuth` keychain instances. This property
     * has no default value, so the application shoud provide a valid access group,
     * if such group should be used.
     */
    readonly accessGroupName?: string
    /**
     * ### iOS specific
     * 
     * Suite name used by the `UserDefaults` that check for Keychain data presence.
     * 
     * If the value is not set, `UserDefaults.standardUserDefaults` are used. Otherwise,
     * user defaults with given suite name are created. In case a developer started using SDK
     * with no suite name specified, the developer is responsible for migrating data
     * to the new `UserDefaults` before using the SDK with the new suite name.
     */
    readonly userDefaultsSuiteName?: string
    /**
     * ### Android specific
     * 
     * Set minimal required keychain protection level that must be supported on the current device. Note that
     * if you enforce protection higher than `PowerAuthKeychainProtection.NONE`, then your application must target
     * at least Android 6.0.
     */
    readonly minimalRequiredKeychainProtection: PowerAuthKeychainProtection
}

/**
 * The type that representing the keychain settings. Unline `KeychainConfigurationData`, this type
 * has all properties optional.
 */
export type PowerAuthKeychainConfigurationType = Partial<PowerAuthKeychainConfigurationData>

/**
 * ### Android specific
 * 
 * The `PowerAuthKeychainProtection` enum defines the level of keycain content protection.
 * The level of the protection depends on Android KeyStore implementation available on the device.
 * If the KeyStore supports hardware backed keys, like StrongBox, then also the higher level of
 * protection is reported.
 */
export enum PowerAuthKeychainProtection {
    /**
     * The content of the keychain is not encrypted and therefore not protected. This level of
     * the protection is typically reported on devices older than Android Marshmallow, or in
     * case that the device has faulty KeyStore implementation.
     */
    NONE = "NONE",
    /**
     * The content of the keychain is encrypted with key generated by Android KeyStore, but the key
     * is protected only on the operating system level. The security of the key material relies solely
     * on software measures, which means that a compromise of the Android OS (such as root exploit)
     * might up revealing this key.
     *
     * If this level of protection is enforced in `PowerAuthKeychainConfiguration`, then your application 
     * must target Android 6.0 and higher.
     */
    SOFTWARE = "SOFTWARE",
    /**
     * The content of the keychain is encrypted with key generated by Android KeyStore and the key
     * is stored and managed by [Trusted Execution Environment](https://en.wikipedia.org/wiki/Trusted_execution_environment).
     */
    HARDWARE = "HARDWARE",
    /**
     * The content of the keychain is encrypted with key generated by Android KeyStore and the key
     * is stored inside of Secure Element (e.g. StrongBox). This is the highest level of Keychain
     * protection currently available.
     * 
     * Be aware, that enforce STRONGBOX is not recommended due to its low reliabiliy and low performance
     * on the current Android devices.
     */
    STRONGBOX = "STRONGBOX"
}

/**
 * Class representing the keychain settings.
 */
export class PowerAuthKeychainConfiguration implements PowerAuthKeychainConfigurationType {
    accessGroupName?: string
    userDefaultsSuiteName?: string
    minimalRequiredKeychainProtection: PowerAuthKeychainProtection
    constructor() {
        this.minimalRequiredKeychainProtection = buildKeychainConfiguration().minimalRequiredKeychainProtection
    }

    /**
     * @returns `PowerAuthKeychainConfiguration` with default values.
     */
    public static default(): PowerAuthKeychainConfigurationType {
        return buildKeychainConfiguration()
    }
}

/**
 * Function create a frozen object implementing `KeychainConfigurationData` with all required properties set.
 * @param input Optional application's configuration. If not provided, then the default values are set.
 * @returns 
 */
export function buildKeychainConfiguration(input: PowerAuthKeychainConfigurationType | undefined = undefined): PowerAuthKeychainConfigurationData {
    return Object.freeze({
        accessGroupName: input?.accessGroupName,
        userDefaultsSuiteName: input?.userDefaultsSuiteName,
        minimalRequiredKeychainProtection: input?.minimalRequiredKeychainProtection ?? PowerAuthKeychainProtection.NONE
    })
}