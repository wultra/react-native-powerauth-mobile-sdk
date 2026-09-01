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

import { Platform } from "react-native";
import { 
    buildBiometryConfiguration,
    buildClientConfiguration,
    buildConfiguration,
    buildKeychainConfiguration,
    buildSharingConfiguration,
    PowerAuthAlgorithm,
    PowerAuthBiometryConfiguration,
    PowerAuthClientConfiguration,
    PowerAuthConfiguration, 
    PowerAuthKeychainConfiguration,
    PowerAuthKeychainProtection,
    PowerAuthSharingConfiguration} from "react-native-powerauth-mobile-sdk";
import { TestSuite, expect } from "mobile-testbed";

const SDK_CONFIG = 'ARAVst+fkgOOT/U1gBr1qLMDEOTfEduuLUvbpOmTq7cI+skBAUEEVjKe+8yFg62GvhwU8eE3iEZZCOeNqtEyz2AXXs/yZewnmdETC8J2sNcw5NnIApYDUmBh2n+XRHize4EiVdetjQ=='
const BASE_URL = 'http://localhost'

export class ConfigurationObjectsTests extends TestSuite {
    
    testInstanceConfiguration() {
        // Config class
        const config = new PowerAuthConfiguration(SDK_CONFIG, BASE_URL)
        expect(config).toEqual({
            configuration: SDK_CONFIG,
            baseEndpointUrl: BASE_URL,
            offlineAuthenticationCodeComponentLength: 8
        })
        expect(Object.isFrozen(config)).toBe(false)
        // Config builder
        const frozen = buildConfiguration(config)
        expect(frozen).toEqual(config)
        expect(Object.isFrozen(frozen)).toBe(true)
        expect(Object.isFrozen(config)).toBe(false)

        const algorithmConfig = new PowerAuthConfiguration(
            SDK_CONFIG,
            BASE_URL,
            PowerAuthAlgorithm.P384_L5,
            6
        )
        expect(buildConfiguration(algorithmConfig)).toEqual({
            configuration: SDK_CONFIG,
            baseEndpointUrl: BASE_URL,
            algorithm: PowerAuthAlgorithm.P384_L5,
            offlineAuthenticationCodeComponentLength: 6
        })
        expect(PowerAuthAlgorithm.LEGACY).toBe("legacy")
        expect(PowerAuthAlgorithm.P384).toBe("p384")
        expect(PowerAuthAlgorithm.P384_L3).toBe("p384l3")
        expect(PowerAuthAlgorithm.P384_L5).toBe("p384l5")
    }
    
    testClientConfiguration() {
        // Default config
        const defaultConfig = PowerAuthClientConfiguration.default()
        expect(defaultConfig).toEqual({ connectionTimeout: 20, readTimeout: 20, enableUnsecureTraffic: false })
        expect(defaultConfig.customHttpHeaders).toBeNull()
        expect(defaultConfig.basicHttpAuthentication).toBeNull()
        expect(Object.isFrozen(defaultConfig)).toBe(true)

        // Config class
        let config = new PowerAuthClientConfiguration()
        expect(config).toEqual(defaultConfig)
        expect(Object.isFrozen(config)).toBe(false)

        const frozen = buildClientConfiguration(config)
        expect(frozen).toEqual(config)
        expect(Object.isFrozen(frozen)).toBe(true)
        expect(Object.isFrozen(config)).toBe(false)

        // Now try to build config from some incomplete objects
        config = buildClientConfiguration({connectionTimeout: 5})
        expect(config).toEqual({connectionTimeout: 5, readTimeout: defaultConfig.readTimeout, enableUnsecureTraffic: defaultConfig.enableUnsecureTraffic})
        expect(Object.isFrozen(config)).toBe(true)

        config = buildClientConfiguration({readTimeout: 5})
        expect(config).toEqual({connectionTimeout: defaultConfig.connectionTimeout, readTimeout: 5, enableUnsecureTraffic: defaultConfig.enableUnsecureTraffic})
        expect(Object.isFrozen(config)).toBe(true)

        config = buildClientConfiguration({enableUnsecureTraffic: true})
        expect(config).toEqual({connectionTimeout: defaultConfig.connectionTimeout, readTimeout: defaultConfig.readTimeout, enableUnsecureTraffic: true})
        expect(Object.isFrozen(config)).toBe(true)
    }
    
    testBiometryConfiguration() {
        const DEFAULT_LINK_ITEMS = Platform.OS === 'android'
        // Default config
        const defaultConfig = PowerAuthBiometryConfiguration.default()
        expect(defaultConfig).toEqual({
            authenticateOnBiometricKeySetup: true,
            invalidateBiometricFactorAfterChange: DEFAULT_LINK_ITEMS,
            linkItemsToCurrentSet: DEFAULT_LINK_ITEMS,
            confirmBiometricAuthentication: false,
            fallbackToDevicePasscode: false,
            fallbackToSharedBiometryKey: true,
            useLegacySymmetricKey: false
        })
        expect(Object.isFrozen(defaultConfig)).toBe(true)
        // Config class
        let config = new PowerAuthBiometryConfiguration()
        expect(config).toEqual(defaultConfig)
        expect(Object.isFrozen(config)).toBe(false)

        // Deprecated invalidation name remains a synchronized compatibility alias.
        config.linkItemsToCurrentSet = !DEFAULT_LINK_ITEMS
        expect(config.invalidateBiometricFactorAfterChange).toBe(!DEFAULT_LINK_ITEMS)
        config.invalidateBiometricFactorAfterChange = DEFAULT_LINK_ITEMS
        expect(config.linkItemsToCurrentSet).toBe(DEFAULT_LINK_ITEMS)

        const frozen = buildBiometryConfiguration(config)
        expect(frozen).toEqual(config)
        expect(Object.isFrozen(frozen)).toBe(true)
        expect(Object.isFrozen(config)).toBe(false)

        // Now try to build config from some incomplete objects
        config = buildBiometryConfiguration({authenticateOnBiometricKeySetup: false})
        expect(config).toEqual({
            authenticateOnBiometricKeySetup: false,
            invalidateBiometricFactorAfterChange: defaultConfig.invalidateBiometricFactorAfterChange,
            linkItemsToCurrentSet: defaultConfig.linkItemsToCurrentSet,
            confirmBiometricAuthentication: defaultConfig.confirmBiometricAuthentication,
            fallbackToDevicePasscode: defaultConfig.fallbackToDevicePasscode,
            fallbackToSharedBiometryKey: defaultConfig.fallbackToSharedBiometryKey,
            useLegacySymmetricKey: defaultConfig.useLegacySymmetricKey
        })
        expect(Object.isFrozen(config)).toBe(true)

        config = buildBiometryConfiguration({linkItemsToCurrentSet: !DEFAULT_LINK_ITEMS})
        expect(config).toEqual({
            authenticateOnBiometricKeySetup: defaultConfig.authenticateOnBiometricKeySetup,
            invalidateBiometricFactorAfterChange: !DEFAULT_LINK_ITEMS,
            linkItemsToCurrentSet: !DEFAULT_LINK_ITEMS,
            confirmBiometricAuthentication: defaultConfig.confirmBiometricAuthentication,
            fallbackToDevicePasscode: defaultConfig.fallbackToDevicePasscode,
            fallbackToSharedBiometryKey: defaultConfig.fallbackToSharedBiometryKey,
            useLegacySymmetricKey: defaultConfig.useLegacySymmetricKey
        })
        expect(Object.isFrozen(config)).toBe(true)

        config = buildBiometryConfiguration({invalidateBiometricFactorAfterChange: !DEFAULT_LINK_ITEMS})
        expect(config.invalidateBiometricFactorAfterChange).toBe(!DEFAULT_LINK_ITEMS)
        expect(config.linkItemsToCurrentSet).toBe(!DEFAULT_LINK_ITEMS)

        config = buildBiometryConfiguration({
            invalidateBiometricFactorAfterChange: DEFAULT_LINK_ITEMS,
            linkItemsToCurrentSet: !DEFAULT_LINK_ITEMS
        })
        expect(config.invalidateBiometricFactorAfterChange).toBe(DEFAULT_LINK_ITEMS)
        expect(config.linkItemsToCurrentSet).toBe(DEFAULT_LINK_ITEMS)

        config = buildBiometryConfiguration({confirmBiometricAuthentication: true})
        expect(config).toEqual({
            authenticateOnBiometricKeySetup: defaultConfig.authenticateOnBiometricKeySetup,
            invalidateBiometricFactorAfterChange: defaultConfig.invalidateBiometricFactorAfterChange,
            linkItemsToCurrentSet: defaultConfig.linkItemsToCurrentSet,
            confirmBiometricAuthentication: true,
            fallbackToDevicePasscode: defaultConfig.fallbackToDevicePasscode,
            fallbackToSharedBiometryKey: defaultConfig.fallbackToSharedBiometryKey,
            useLegacySymmetricKey: defaultConfig.useLegacySymmetricKey
        })
        expect(Object.isFrozen(config)).toBe(true)

        config = buildBiometryConfiguration({fallbackToDevicePasscode: true})
        expect(config).toEqual({
            authenticateOnBiometricKeySetup: defaultConfig.authenticateOnBiometricKeySetup,
            invalidateBiometricFactorAfterChange: defaultConfig.invalidateBiometricFactorAfterChange,
            linkItemsToCurrentSet: defaultConfig.linkItemsToCurrentSet,
            confirmBiometricAuthentication: defaultConfig.confirmBiometricAuthentication,
            fallbackToDevicePasscode: true,
            fallbackToSharedBiometryKey: defaultConfig.fallbackToSharedBiometryKey,
            useLegacySymmetricKey: defaultConfig.useLegacySymmetricKey
        })
        expect(Object.isFrozen(config)).toBe(true)

        config = buildBiometryConfiguration({fallbackToSharedBiometryKey: false, useLegacySymmetricKey: true})
        expect(config.fallbackToSharedBiometryKey).toBe(false)
        expect(config.useLegacySymmetricKey).toBe(true)
    }

    testKeychainConfiguration() {
        // Default config
        const defaultConfig = PowerAuthKeychainConfiguration.default()
        expect(defaultConfig).toEqual({ 
            minimalRequiredKeychainProtection: PowerAuthKeychainProtection.NONE })
        expect(Object.isFrozen(defaultConfig)).toBe(true)

        
        // Config class
        let config = new PowerAuthKeychainConfiguration()
        expect(config).toEqual(defaultConfig)
        expect(Object.isFrozen(config)).toBe(false)
        
        const frozen = buildKeychainConfiguration(config)
        expect(frozen).toEqual(config)
        expect(Object.isFrozen(frozen)).toBe(true)
        expect(Object.isFrozen(config)).toBe(false)

        // Now try to build config from some incomplete objects
        config = buildKeychainConfiguration({minimalRequiredKeychainProtection: PowerAuthKeychainProtection.STRONGBOX})
        expect(config).toEqual({minimalRequiredKeychainProtection: PowerAuthKeychainProtection.STRONGBOX})
        expect(Object.isFrozen(config)).toBe(true)

        config = buildKeychainConfiguration({accessGroupName: "test.accessGroup"})
        expect(config).toEqual({accessGroupName: "test.accessGroup", minimalRequiredKeychainProtection: PowerAuthKeychainProtection.NONE})
        expect(Object.isFrozen(config)).toBe(true)

        config = buildKeychainConfiguration({userDefaultsSuiteName: "SuperDefaults"})
        expect(config).toEqual({userDefaultsSuiteName: "SuperDefaults", minimalRequiredKeychainProtection: PowerAuthKeychainProtection.NONE})
        expect(Object.isFrozen(config)).toBe(true)
    }

    testSharingConfiguration() {
        const config = new PowerAuthSharingConfiguration(
            "group.com.wultra.test",
            "com.wultra.test",
            "com.wultra.test.keychain",
            "test"
        )
        expect(config).toEqual({
            appGroup: "group.com.wultra.test",
            appIdentifier: "com.wultra.test",
            keychainAccessGroup: "com.wultra.test.keychain",
            sharedMemoryIdentifier: "test"
        })
        expect(Object.isFrozen(config)).toBe(false)

        const frozen = buildSharingConfiguration(config)
        expect(frozen).toEqual({
            appGroup: config.appGroup,
            appIdentifier: config.appIdentifier,
            keychainAccessGroup: config.keychainAccessGroup,
            sharedMemoryIdentifier: config.sharedMemoryIdentifier,
            isProvided: true
        })
        expect(Object.isFrozen(frozen)).toBe(true)

        const withoutSharedMemory = new PowerAuthSharingConfiguration(
            config.appGroup,
            config.appIdentifier,
            config.keychainAccessGroup
        )
        expect(withoutSharedMemory.sharedMemoryIdentifier).toBeUndefined()
    }
}
