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

import { TestConfig } from '../../src/Config'
import { ActivationHelper, ActivationHelperPrepareData, ApplicationConfig, ApplicationSetup, PowerAuthTestServer } from 'powerauth-js-test-client'
import {
    PowerAuth,
    PowerAuthActivation,
    PowerAuthAuthentication,
    PowerAuthBiometryConfiguration,
    PowerAuthClientConfiguration,
    PowerAuthConfiguration,
    PowerAuthCreateActivationResult,
    PowerAuthKeychainConfiguration } from "react-native-powerauth-mobile-sdk";
import { RNHttpClient } from './RNHttpClient'

/**
 * Method that can customize `PowerAuthActivation` object before the activation creation. 
 */
export type RNActivationCustomization = (activation: PowerAuthActivation) => void

/**
 * ActivationHelper specialized with React Native PowerAuth objects. 
 */
//export type RNActivationHelper = ActivationHelper<PowerAuth, PowerAuthCreateActivationResult>
export class RNActivationHelper extends ActivationHelper<PowerAuth, PowerAuthCreateActivationResult> {
    /**
     * Instance of HTTP client
     */
    readonly httpClient: RNHttpClient

    /**
     * Construct custom application helper.
     * @param server 
     * @param testConfig 
     * @param appSetup 
     */
    constructor(server: PowerAuthTestServer, testConfig: TestConfig, appSetup: ApplicationSetup) {
        super(server, appSetup)
        this.httpClient = new RNHttpClient(testConfig)
    }

    static async createCustom(server: PowerAuthTestServer, cfg: TestConfig): Promise<RNActivationHelper> {
        await server.connect()
        const appSetup = await server.prepareApplicationFromConfiguration(cfg.application)
        return new RNActivationHelper(server, cfg, appSetup)
    }
}

/**
 * Additional data provided to prepare function.
 */
export interface CustomActivationHelperPrepareData extends ActivationHelperPrepareData {
    /**
     * If provided, then overrides instance identifier from TestConfig
     */
    powerAuthInstanceId?: string
    /**
     * If set to true, then `PowerAuth` object will be configured with configuration objects instead of legacy variant.
     * If you don't provide `instanceConfig` object, then it's automatically created with ApplicationSetup values.
     */
    useConfigObjects?: boolean
    /**
     * If provided, then `PowerAuth` object will be configured with this configuration, instead of the default one.
     */
    instanceConfig?: PowerAuthConfiguration
    /**
     * If provided, then this client configuration will be applied to PowerAuth instance.
     * Note that the configuration will be ignored if `useConfigObjects` is false and `instanceConfig` is undefined. 
     */
    clientConfig?: PowerAuthClientConfiguration
    /**
     * If provided, then this keychain configuration will be applied to PowerAuth instance.
     * Note that the configuration will be ignored if `useConfigObjects` is false and `instanceConfig` is undefined. 
     */
    keychainConfig?: PowerAuthKeychainConfiguration
    /**
     * If provided, then this biometry configuration will be applied to PowerAuth instance.
     * Note that the configuration will be ignored if `useConfigObjects` is false and `instanceConfig` is undefined. 
     */
    biometryConfig?: PowerAuthBiometryConfiguration
}

/**
 * Create activation helper.
 * @param server Instance of `PowerAuthTestServer`.
 * @param cfg Instance of `TestConfig`.
 * @param customizeActivation Function that can customize `PowerAuthActivation` object before activation creation. 
 * @returns Promise with NRActivationHelper 
 */
export async function createActivationHelper(server: PowerAuthTestServer, cfg: TestConfig, customizeActivation: RNActivationCustomization): Promise<RNActivationHelper> {
    const helper = await RNActivationHelper.createCustom(server, cfg)
    helper.createSdk = async (appSetup, prepareData) => {
        // Prepare instanceId. We're using custom data in prepare interface to keep instance id.
        const pd = prepareData as CustomActivationHelperPrepareData
        if (!pd) throw new Error('createSdk: Missing prepare data object')
        const instanceId = pd?.powerAuthInstanceId ?? cfg.instance?.powerAuthInstanceId ?? 'default'
        const sdk = new PowerAuth(instanceId)
        if (await sdk.isConfigured()) {
            await sdk.deconfigure()
        }
        const allowUnsecure = cfg.enrollment.baseUrl.startsWith('http://')
        if (pd.instanceConfig !== undefined || pd.useConfigObjects) {
            // Use configuration objects
            const instanceConfig = pd.instanceConfig ?? new PowerAuthConfiguration(appSetup.appKey, appSetup.appSecret, appSetup.masterServerPublicKey, cfg.enrollment.baseUrl)
            let clientConfig = pd.clientConfig
            if (!clientConfig) {
                clientConfig = new PowerAuthClientConfiguration()
                clientConfig.enableUnsecureTraffic = allowUnsecure
            }
            await sdk.configure(instanceConfig, clientConfig, pd.biometryConfig,  pd.keychainConfig)
        } else {
            // Use legacy configuration
            await sdk.configure(appSetup.appKey, appSetup.appSecret, appSetup.masterServerPublicKey, cfg.enrollment.baseUrl, allowUnsecure)
        }
        return sdk
    }
    helper.prepareStep = async (helper, activation, prepareData) => {
        // Get essential objects
        const pd = prepareData as CustomActivationHelperPrepareData
        if (!pd) throw new Error('prepareStep: Missing prepare data object')
        if (!pd.password) throw new Error('Missing password in prepare data object')
        // Get SDK
        const sdk = await helper.getPowerAuthSdk(prepareData)
        // Remove activation if there's still an activation
        if (await sdk.hasValidActivation()) {
            await sdk.removeActivationLocal()
        }
        const deviceName = 'Test device'
        // Prepare activation data
        const activationData = PowerAuthActivation.createWithActivationCode(activation.activationCode!, deviceName)
        customizeActivation(activationData)
        // Create activation
        const result = await sdk.createActivation(activationData)
        // Commit activation locally
        const auth = pd.useBiometry
                        ? PowerAuthAuthentication.commitWithPasswordAndBiometry(pd.password, {
                            promptMessage: 'Please authenticate to enable biometry',
                            promptTitle: 'Enable biometry' 
                          })
                        : PowerAuthAuthentication.commitWithPassword(pd.password)
        await sdk.commitActivation(auth)
        return result
    }
    return helper
}