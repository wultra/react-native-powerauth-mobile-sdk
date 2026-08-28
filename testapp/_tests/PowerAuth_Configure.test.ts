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

import { Platform } from "react-native"
import { PowerAuth, PowerAuthActivation, PowerAuthAlgorithm, PowerAuthAuthentication, PowerAuthBiometryConfiguration, PowerAuthClientConfiguration, PowerAuthConfiguration, PowerAuthErrorCode, PowerAuthKeychainConfiguration, PowerAuthSharingConfiguration } from "react-native-powerauth-mobile-sdk"
import { expect } from "mobile-testbed"
import { TestWithActivation } from "./helpers/TestWithActivation"
import { IntegrationHelper, isBiometryEnrolledForTests } from "../src/IntegrationUtils"

export class PowerAuth_ConfigureTests extends TestWithActivation {

    // lets not create activation before each test
    override shouldCreateActivationBeforeTest(): boolean {
        return false
    }

    async beforeEach(): Promise<void> {
        await super.beforeEach()
        // Cleanup everything at the beginning of the test
        await this.cleanupInstances()
    }

    async afterEach(): Promise<void> {
        await super.afterEach()
        // Cleanup everything after the test
        await this.cleanupInstances()
    }

    async testConfigureAndDeconfigure() {
        const pa1 = new PowerAuth(this.instance1)
        const pa2 = new PowerAuth(this.instance2)
        expect(pa1.instanceId).toBe(this.instance1)
        expect(pa2.instanceId).toBe(this.instance2)

        expect(await pa1.isConfigured()).toBe(false)
        expect(await pa2.isConfigured()).toBe(false)

        // Create helpers. The function also instantiate and configure PowerAuth instance
        const helper1 = await this.getHelper1()
        const helper2 = await this.getHelper2()
        // SDK instances from helpers should be available
        const sdk1 = helper1.sdk
        const sdk2 = helper2.sdk

        expect(await sdk1.isConfigured()).toBe(true)
        expect(await sdk2.isConfigured()).toBe(true)
        const biometricStatus = await sdk1.getBiometricStatus()
        expect(biometricStatus.isBiometricFactorConfigured).toBe(false)
        expect(biometricStatus.isAuthenticationWithBiometricsAvailable).toBe(false)
        expect(await sdk1.isAuthenticationWithBiometricsAvailable()).toBe(false)
        // Instances created from helper also should have configuration objects set
        expect(await sdk1.configuration).toBeDefined()
        expect(await sdk2.configuration).toBeDefined()
        expect(await sdk1.clientConfiguration).toBeDefined()
        expect(await sdk2.clientConfiguration).toBeDefined()
        expect(await sdk1.biometryConfiguration).toBeDefined()
        expect(await sdk2.biometryConfiguration).toBeDefined()
        expect(await sdk1.keychainConfiguration).toBeDefined()
        expect(await sdk2.keychainConfiguration).toBeDefined()
        expect(await sdk1.sharingConfiguration).toBeUndefined()
        expect(await sdk2.sharingConfiguration).toBeUndefined()

        // pa1 & pa2 should be configured now, because PowerAuth is just a thin envelope
        // keeping only essential values
        expect(await pa1.isConfigured()).toBe(true)
        expect(await pa2.isConfigured()).toBe(true)
        // Online instances created in helper, pa1 & pa2
        expect(await pa1.configuration).toBeDefined()
        expect(await pa2.configuration).toBeDefined()
        expect(await pa1.clientConfiguration).toBeDefined()
        expect(await pa2.clientConfiguration).toBeDefined()
        expect(await pa1.biometryConfiguration).toBeDefined()
        expect(await pa2.biometryConfiguration).toBeDefined()
        expect(await pa1.keychainConfiguration).toBeDefined()
        expect(await pa2.keychainConfiguration).toBeDefined()
        expect(await pa1.sharingConfiguration).toBeUndefined()
        expect(await pa2.sharingConfiguration).toBeUndefined()
    }

    async testGroupedBiometricAuthenticationRejectsNonBiometricAuthentication() {
        const sdk = (await this.getHelper1()).sdk
        let callbackInvoked = false

        await expect(async () => await sdk.groupedBiometricAuthentication(
            PowerAuthAuthentication.possession(),
            async () => { callbackInvoked = true }
        )).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        expect(callbackInvoked).toBe(false)
    }

    async testReconfigureWhileActive() {
        const helper1 = await this.getHelper1()
        const sdk1 = helper1.sdk
        const helper2 = await this.getHelper2()
        const sdk2 = helper2.sdk

        expect(await sdk1.isConfigured()).toBe(true)
        expect(await sdk2.isConfigured()).toBe(true)

        const config1 = await sdk1.configuration
        const config2 = await sdk2.configuration
        const clientConfig1 = await sdk1.clientConfiguration
        const clientConfig2 = await sdk2.clientConfiguration
        const keychainConfig1 = await sdk1.keychainConfiguration
        const keychainConfig2 = await sdk2.keychainConfiguration
        const biometryConfig1 = await sdk1.biometryConfiguration
        const biometryConfig2 = await sdk2.biometryConfiguration
        const sharingConfig1 = await sdk1.sharingConfiguration
        const sharingConfig2 = await sdk2.sharingConfiguration

        expect(config1).toBeDefined()
        expect(config2).toBeDefined()
        expect(clientConfig1).toBeDefined()
        expect(clientConfig2).toBeDefined()
        expect(keychainConfig1).toBeDefined()
        expect(keychainConfig2).toBeDefined()
        expect(biometryConfig1).toBeDefined()
        expect(biometryConfig2).toBeDefined()
        expect(sharingConfig1).toBeUndefined()
        expect(sharingConfig2).toBeUndefined()

        await helper1.prepareActiveActivation(this.password1)
        await helper2.prepareActiveActivation(this.password2)

        expect(await sdk1.hasValidActivation()).toBe(true)
        expect(await sdk2.hasValidActivation()).toBe(true)

        expect(await sdk1.validatePassword(this.password1)).toSucceed()
        expect(await sdk2.validatePassword(this.password2)).toSucceed()

        await sdk1.deconfigure()
        await sdk2.deconfigure()

        // Now run all methods that must fail while instance is not configured
        await this.runMethodsThatMustFail(sdk1)
        await this.runMethodsThatMustFail(sdk2)

        // Reconfigure. This technically re-create native SDK objects on behalf
        await sdk1.configure(config1!, clientConfig1!, biometryConfig1!, keychainConfig1!)
        await sdk2.configure(config2!, clientConfig2!, biometryConfig2!, keychainConfig2!)

        expect(await sdk1.isConfigured()).toBe(true)
        expect(await sdk2.isConfigured()).toBe(true)

        expect(await sdk1.hasValidActivation()).toBe(true)
        expect(await sdk2.hasValidActivation()).toBe(true)

        expect(await sdk1.validatePassword(this.password1)).toSucceed()
        expect(await sdk2.validatePassword(this.password2)).toSucceed()
    }

    async iosTestActivationSharing() {
        const helper1 = await this.getHelper1()
        const sdk1 = helper1.sdk
        expect(await sdk1.isConfigured()).toBe(true)
        const sharingConfiguration = await sdk1.sharingConfiguration
        expect(sharingConfiguration?.appGroup).toBe("group.com.wultra.testGroup")
        expect(sharingConfiguration?.appIdentifier).toBe("SharedInstanceTests")
        expect(sharingConfiguration?.keychainAccessGroup).toBe("fake.accessGroup")
        expect(sharingConfiguration?.sharedMemoryIdentifier).toBe("tst1")
    }

    async testConfigurationAlgorithms() {
        const helper = await this.getHelper1()
        const sdk = helper.sdk
        const defaultConfiguration = await sdk.configuration

        expect(defaultConfiguration.algorithm).toBe(PowerAuthAlgorithm.P384_L3)
        expect(defaultConfiguration.offlineAuthenticationCodeComponentLength).toBe(8)
        expect(await sdk.currentAlgorithm).toBe(PowerAuthAlgorithm.P384_L3)

        for (const algorithm of [
            PowerAuthAlgorithm.LEGACY,
            PowerAuthAlgorithm.P384,
            PowerAuthAlgorithm.P384_L3,
            PowerAuthAlgorithm.P384_L5
        ]) {
            await sdk.deconfigure()
            await sdk.configure(new PowerAuthConfiguration(
                defaultConfiguration.configuration,
                defaultConfiguration.baseEndpointUrl,
                algorithm,
                6
            ))
            expect(await sdk.currentAlgorithm).toBe(algorithm)
            const effectiveConfiguration = await sdk.configuration
            expect(effectiveConfiguration.algorithm).toBe(algorithm)
            expect(effectiveConfiguration.offlineAuthenticationCodeComponentLength).toBe(6)
        }
    }

    async testEffectiveClientConfiguration() {
        const helper = await this.getHelper1()
        const sdk = helper.sdk
        const configuration = await sdk.configuration
        await sdk.deconfigure()

        const clientConfiguration = new PowerAuthClientConfiguration()
        clientConfiguration.connectionTimeout = 12
        clientConfiguration.readTimeout = 14
        clientConfiguration.customHttpHeaders = [{ name: "X-Test", value: "secret" }]
        clientConfiguration.basicHttpAuthentication = { username: "user", password: "secret" }
        await sdk.configure(configuration, clientConfiguration)

        const effective = await sdk.clientConfiguration
        expect(effective.connectionTimeout).toBe(12)
        expect(effective.readTimeout).toBe(Platform.OS === 'ios' ? 12 : 14)
        expect(effective.customHttpHeaders).toBeUndefined()
        expect(effective.basicHttpAuthentication).toBeUndefined()
    }

    async testCleanupInstanceData() {
        const helper = await this.getHelper1()
        const sdk = helper.sdk
        const configuration = await sdk.configuration
        const keychainConfiguration = await sdk.keychainConfiguration
        const sharingConfiguration = await sdk.sharingConfiguration
        await expect(async () => await PowerAuth.cleanupInstanceData(
            sdk.instanceId,
            configuration,
            keychainConfiguration,
            sharingConfiguration
        )).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await sdk.deconfigure()

        await PowerAuth.cleanupInstanceData(
            sdk.instanceId,
            configuration,
            keychainConfiguration,
            sharingConfiguration
        )
        await sdk.configure(configuration, undefined, undefined, keychainConfiguration, sharingConfiguration)
        expect(await sdk.isConfigured()).toBe(true)
    }

    async runMethodsThatMustFail(sdk: PowerAuth) {
        const persistAuth = PowerAuthAuthentication.persistWithPassword('1234')
        const signAuth = PowerAuthAuthentication.possession()
        await expect(async () => await sdk.hasValidActivation()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.canStartActivation()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.hasPendingActivation()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.fetchActivationStatus()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.createActivation(PowerAuthActivation.createWithActivationCode('', ''))).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.persistActivation(persistAuth)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.getActivationFingerprint()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.getActivationIdentifier()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.removeActivationWithAuthentication(signAuth)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.removeActivationLocal()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.authenticationHeaderForRequestWithParams(signAuth, 'GET', '', undefined)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.authenticationHeaderForRequestWithBody(signAuth, 'POST', '', undefined)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.requestGetSignature(signAuth, '', undefined)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.requestSignature(signAuth, '', '')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.offlineSignature(signAuth, '', '', undefined)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.verifyServerSignedData('', '', false)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.changePassword('', '')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.unsafeChangePassword('', '')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.addBiometryFactor('', '', '')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.hasBiometryFactor()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.removeBiometryFactor()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.getBiometricStatus()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.isAuthenticationWithBiometricsAvailable()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.fetchEncryptionKey(signAuth, 1000)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.signDataWithDevicePrivateKey(signAuth, '', 'UTF8')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.validatePassword('')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.groupedBiometricAuthentication(signAuth, async _auth => {})).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.configuration).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.currentAlgorithm).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.clientConfiguration).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.biometryConfiguration).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.keychainConfiguration).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.sharingConfiguration).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
    }

    async testConfigurationWithBiometry() {
        const helper1 = await this.getHelper1()
        const sdk1 = helper1.sdk
        const helper2 = await this.getHelper2()
        const sdk2 = helper2.sdk

        // Skip on CI emulators without enrolled biometry. Calling addBiometryFactor on Android
        // with no enrolled templates opens the system fingerprint enrollment screen.
        if (!(await isBiometryEnrolledForTests(sdk1))) {
            this.reportSkip(`Biometric status is ${(await sdk1.getBiometricStatus()).systemStatus}`)
            return
        }

        expect(await sdk1.isConfigured()).toBe(true)
        expect(await sdk2.isConfigured()).toBe(true)

        await helper1.prepareActiveActivation(this.password1)
        await helper2.prepareActiveActivation(this.password2)

        expect(await sdk1.hasValidActivation()).toBe(true)
        expect(await sdk2.hasValidActivation()).toBe(true)
        expect(await sdk1.hasBiometryFactor()).toBe(false)
        expect(await sdk2.hasBiometryFactor()).toBe(false)

        expect(await sdk1.validatePassword(this.password1)).toSucceed()
        expect(await sdk2.validatePassword(this.password2)).toSucceed()

        await sdk1.addBiometryFactor(this.password1)
        await sdk2.addBiometryFactor(this.password2)

        expect(await sdk1.hasBiometryFactor()).toBe(true)
        expect(await sdk2.hasBiometryFactor()).toBe(true)

        await sdk1.removeBiometryFactor()
        expect(await sdk1.hasBiometryFactor()).toBe(false)
        expect(await sdk2.hasBiometryFactor()).toBe(true)

        await sdk2.removeBiometryFactor()
        expect(await sdk1.hasBiometryFactor()).toBe(false)
        expect(await sdk2.hasBiometryFactor()).toBe(false)
    }

    // Support methods

    helperInstance1: IntegrationHelper | undefined
    helperInstance2: IntegrationHelper | undefined

    readonly instance1 = 'testInstance1'
    readonly instance2 = 'testInstance2'
    readonly password1 = 'SueprSecure'
    readonly password2 = 'GoodAlternative'

    async getHelper1(): Promise<IntegrationHelper> {
        if (!this.helperInstance1) {
            this.helperInstance1 = await this.createInstance(this.instance1)
        }
        return this.helperInstance1
    }

    async getHelper2(): Promise<IntegrationHelper> {
        if (!this.helperInstance2) {
            this.helperInstance2 = await this.createInstance(this.instance2)
        }
        return this.helperInstance2
    }

    async createInstance(instanceId: string): Promise<IntegrationHelper> {
        const helper = new IntegrationHelper(new PowerAuth(instanceId))
        await this.configureSDK(helper)
        return helper
    }

    async cleanupInstance(helper: IntegrationHelper | undefined, instanceId: string) {
        const sdk = new PowerAuth(instanceId)
        if (await sdk.isConfigured()) {
            await sdk.removeActivationLocal()
            await sdk.deconfigure()
        }
        await helper?.cleanup()
    }

    async cleanupInstances() {
        await this.cleanupInstance(this.helperInstance1, this.instance1)
        await this.cleanupInstance(this.helperInstance2, this.instance2)
        this.helperInstance1 = undefined
        this.helperInstance2 = undefined
    }

    private async configureSDK(helper: IntegrationHelper): Promise<void> {

        if (await helper.sdk.isConfigured()) {
            await helper.sdk.deconfigure()
        }

        let sharingConfig: PowerAuthSharingConfiguration | undefined
        let biometryConfig: PowerAuthBiometryConfiguration | undefined
        let keychainConfig: PowerAuthKeychainConfiguration | undefined
        let clientConfig: PowerAuthClientConfiguration | undefined
        if (this.currentTestName === 'iosTestActivationSharing') {
            sharingConfig = new PowerAuthSharingConfiguration(
                "group.com.wultra.testGroup",
                "SharedInstanceTests",
                "fake.accessGroup", // This will work only in simulator
                "tst1"
            )
        }
        await helper.configure({
            clientConfiguration: clientConfig,
            biometryConfiguration: biometryConfig,
            keychainConfiguration: keychainConfig,
            sharingConfiguration: sharingConfig
        })
    }
}
