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

/**
 * Interface that representing the activation data sharing settings.
 */
export interface PowerAuthSharingConfigurationType {
    /**
     * ### iOS specific
     * 
     * Name of app group that allows you sharing data between multiple applications. Be aware that the value 
     * overrides `accessGroupName` property if it's provided in `PowerAuthKeychainConfiguration`.
     * 
     * The UTF-8 representation of this string should not exceed 26 bytes, due to internal limitations applied
     * on the operating system level.
     */
    readonly appGroup: string
    /**
     * ### iOS specific
     * 
     * Unique application identifier. This identifier helps you to determine which application
     * currently holds the lock on activation data in a special operations.
     *
     * The length of identifier cannot exceed 127 bytes if represented as UTF-8 string. It's recommended
     * to use application's main bundle identifier, but in general, it's up to you how you identify your
     * own applications.
     */
    readonly appIdentifier: string
    /**
     * ### iOS specific
     * 
     * Keychain access group name used by the PowerAuthSDK keychain instances.
     */
    readonly keychainAccessGroup: string

    /**
     * ### iOS specific
     * 
     * Optional identifier of memory shared between the applications in app group. If identifier is not provided
     * then PowerAuthSDK calculate unique identifier based on `PowerAuth.instanceId`.
     *
     * You can set this property in case that PowerAuth SDK generates identifier that collide with your application's
     * functionality. The configuration of PowerAuthSDK instance always contains an actual identifier used for its
     * shared memory initialization, so you can test whether the generated identifier is OK.
     *
     * The length of identifier cannot exceed 4 bytes if represented as UTF8 string. This is an operating system
     * limitation.
     */
    readonly sharedMemoryIdentifier?: string
}

/**
 * ### iOS specific
 * 
 * The `PowerAuthSharingConfiguration` class contains configuration required for PowerAuthSDK instances shared 
 * accross multiple applications or application and its native extensions.
 */
export class PowerAuthSharingConfiguration implements PowerAuthSharingConfigurationType {
    appGroup: string
    appIdentifier: string
    keychainAccessGroup: string
    sharedMemoryIdentifier?: string
    /**
     * Construct configuration with required parameters
     * @param appGroup Name of app group that allows you sharing data between multiple applications.
     * @param appIdentifier Unique application identifier. This identifier helps you to determine which application currently holds the lock on activation data in a special operations.
     * @param keychainAccessGroup Keychain access group name used by the PowerAuthSDK keychain instances.
     * @param sharedMemoryIdentifier Optional identifier of memory shared between the applications in app group.
     */
    constructor(appGroup: string, appIdentifier: string, keychainAccessGroup: string, sharedMemoryIdentifier: string | undefined = undefined) {
        this.appGroup = appGroup
        this.appIdentifier = appIdentifier
        this.keychainAccessGroup = keychainAccessGroup
        this.sharedMemoryIdentifier = sharedMemoryIdentifier
    }
}

/**
 * Function create a frozen object implementing `PowerAuthSharingConfigurationType` with all required properties set.
 * @param input Optional application's configuration. If not provided, then the default values are set.
 * @returns Frozen object implementing `PowerAuthSharingConfigurationType` with additional property indicating that configuration is provided.
 */
export function buildSharingConfiguration(input: PowerAuthSharingConfigurationType | undefined = undefined): PowerAuthSharingConfigurationType {
    return Object.freeze({
        appGroup: input?.appGroup ?? "",
        appIdentifier: input?.appIdentifier ?? "",
        keychainAccessGroup: input?.keychainAccessGroup ?? "",
        sharedMemoryIdentifier: input?.sharedMemoryIdentifier ?? "",
        isProvided: input !== undefined
    })
}