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
    PowerAuthBiometryConfiguration,
    PowerAuthClientConfiguration,
    PowerAuthConfiguration, 
    PowerAuthKeychainConfiguration,
    PowerAuthKeychainProtection} from "react-native-powerauth-mobile-sdk";
import { TestSuite, expect } from "../src/testbed";

const APP_KEY = 'FbLfn5IDjk/1NYAa9aizAw=='
const APP_SECRET = '5N8R264tS9uk6ZOrtwj6yQ=='
const MASTER_KEY = 'BFYynvvMhYOthr4cFPHhN4hGWQjnjarRMs9gF17P8mXsJ5nREwvCdrDXMOTZyAKWA1JgYdp/l0R4s3uBIlXXrY0='
const BASE_URL = 'http://localhost'

export class ConfigurationObjectsTests extends TestSuite {
    
    testInstanceConfiguration() {
        // Config class
        const config = new PowerAuthConfiguration(APP_KEY, APP_SECRET, MASTER_KEY, BASE_URL)
        expect(config).toEqual({
            applicationKey: APP_KEY,
            applicationSecret: APP_SECRET,
            masterServerPublicKey: MASTER_KEY,
            baseEndpointUrl: BASE_URL,
        })
        expect(Object.isFrozen(config)).toBe(false)
        // Config builder
        const frozen = buildConfiguration(config)
        expect(frozen).toEqual(config)
        expect(Object.isFrozen(frozen)).toBe(true)
        expect(Object.isFrozen(config)).toBe(false)
    }
    
    testClientConfiguration() {
        // Default config
        const defaultConfig = PowerAuthClientConfiguration.default()
        expect(defaultConfig).toEqual({ connectionTimeout: 20, readTimeout: 20, enableUnsecureTraffic: false })
        expect(Object.isFrozen(defaultConfig)).toBe(true)

        // Config class
        let config = new PowerAuthClientConfiguration()
        expect(config).toEqual(defaultConfig)
        expect(Object.isFrozen(config)).toBe(false)

        let frozen = buildClientConfiguration(config)
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
            linkItemsToCurrentSet: DEFAULT_LINK_ITEMS,
            confirmBiometricAuthentication: false,
            fallbackToDevicePasscode: false
        })
        expect(Object.isFrozen(defaultConfig)).toBe(true)
        // Config class
        let config = new PowerAuthBiometryConfiguration()
        expect(config).toEqual(defaultConfig)
        expect(Object.isFrozen(config)).toBe(false)

        let frozen = buildBiometryConfiguration(config)
        expect(frozen).toEqual(config)
        expect(Object.isFrozen(frozen)).toBe(true)
        expect(Object.isFrozen(config)).toBe(false)

        // Now try to build config from some incomplete objects
        config = buildBiometryConfiguration({authenticateOnBiometricKeySetup: false})
        expect(config).toEqual({
            authenticateOnBiometricKeySetup: false,
            linkItemsToCurrentSet: defaultConfig.linkItemsToCurrentSet,
            confirmBiometricAuthentication: defaultConfig.confirmBiometricAuthentication,
            fallbackToDevicePasscode: defaultConfig.fallbackToDevicePasscode
        })
        expect(Object.isFrozen(config)).toBe(true)

        config = buildBiometryConfiguration({linkItemsToCurrentSet: !DEFAULT_LINK_ITEMS})
        expect(config).toEqual({
            authenticateOnBiometricKeySetup: defaultConfig.authenticateOnBiometricKeySetup,
            linkItemsToCurrentSet: !DEFAULT_LINK_ITEMS,
            confirmBiometricAuthentication: defaultConfig.confirmBiometricAuthentication,
            fallbackToDevicePasscode: defaultConfig.fallbackToDevicePasscode
        })
        expect(Object.isFrozen(config)).toBe(true)

        config = buildBiometryConfiguration({confirmBiometricAuthentication: true})
        expect(config).toEqual({
            authenticateOnBiometricKeySetup: defaultConfig.authenticateOnBiometricKeySetup,
            linkItemsToCurrentSet: defaultConfig.linkItemsToCurrentSet,
            confirmBiometricAuthentication: true,
            fallbackToDevicePasscode: defaultConfig.fallbackToDevicePasscode
        })
        expect(Object.isFrozen(config)).toBe(true)

        config = buildBiometryConfiguration({fallbackToDevicePasscode: true})
        expect(config).toEqual({
            authenticateOnBiometricKeySetup: defaultConfig.authenticateOnBiometricKeySetup,
            linkItemsToCurrentSet: defaultConfig.linkItemsToCurrentSet,
            confirmBiometricAuthentication: defaultConfig.confirmBiometricAuthentication,
            fallbackToDevicePasscode: true
        })
        expect(Object.isFrozen(config)).toBe(true)
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
        
        let frozen = buildKeychainConfiguration(config)
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
}