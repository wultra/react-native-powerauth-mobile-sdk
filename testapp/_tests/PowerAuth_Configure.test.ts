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
import { PowerAuth, PowerAuthActivation, PowerAuthAlgorithm, PowerAuthAuthentication, PowerAuthBiometryConfiguration, PowerAuthClientConfiguration, PowerAuthConfiguration, PowerAuthDebug, PowerAuthErrorCode, PowerAuthKeychainConfiguration, PowerAuthKeychainProtection, PowerAuthSharingConfiguration } from "react-native-powerauth-mobile-sdk"
import { expect } from "mobile-testbed"
import { TestWithActivation } from "./helpers/TestWithActivation"
import { AppConfig, IntegrationHelper, createE2ePowerAuthConfiguration, isBiometryEnrolledForTests } from "../src/IntegrationUtils"

const normalizeEndpointUrl = (url: string) => url.replace(/\/+$/, "")

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
        if (Platform.OS === 'android') {
            expect(await sdk1.keychainConfiguration).toBeDefined()
            expect(await sdk2.keychainConfiguration).toBeDefined()
        } else {
            expect(await sdk1.keychainConfiguration).toBeUndefined()
            expect(await sdk2.keychainConfiguration).toBeUndefined()
        }
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
        if (Platform.OS === 'android') {
            expect(await pa1.keychainConfiguration).toBeDefined()
            expect(await pa2.keychainConfiguration).toBeDefined()
        } else {
            expect(await pa1.keychainConfiguration).toBeUndefined()
            expect(await pa2.keychainConfiguration).toBeUndefined()
        }
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
        if (Platform.OS === 'android') {
            expect(keychainConfig1).toBeDefined()
            expect(keychainConfig2).toBeDefined()
        } else {
            expect(keychainConfig1).toBeUndefined()
            expect(keychainConfig2).toBeUndefined()
        }
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

    async iosTestDeprecatedKeychainConfiguration() {
        const helper = await this.getHelper1()
        const sdk = helper.sdk
        const configuration = await sdk.configuration
        const keychainConfiguration = new PowerAuthKeychainConfiguration()
        keychainConfiguration.accessGroupName = "fake.accessGroup"
        keychainConfiguration.userDefaultsSuiteName = "com.wultra.test.powerauth"

        expect(await sdk.isConfigured()).toBe(true)
        expect(await sdk.keychainConfiguration).toBeUndefined()
        await sdk.deconfigure()
        await PowerAuth.cleanupInstanceData(
            sdk.instanceId,
            configuration,
            keychainConfiguration
        )
        await sdk.configure(
            configuration,
            undefined,
            undefined,
            keychainConfiguration
        )
        expect(await sdk.isConfigured()).toBe(true)
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
        clientConfiguration.connectionTimeout = 12.5
        clientConfiguration.readTimeout = 14.25
        clientConfiguration.enableUnsecureTraffic = true
        clientConfiguration.customHttpHeaders = [{ name: "X-Test", value: "secret" }]
        clientConfiguration.basicHttpAuthentication = { username: "user", password: "secret" }
        await sdk.configure(configuration, clientConfiguration)

        const effective = await sdk.clientConfiguration
        expect(effective.connectionTimeout).toBe(12.5)
        expect(effective.readTimeout).toBe(Platform.OS === 'ios' ? 12.5 : 14.25)
        expect(effective.enableUnsecureTraffic).toBe(true)
        expect(effective.customHttpHeaders).toBeUndefined()
        expect(effective.basicHttpAuthentication).toBeUndefined()
    }

    async testInvalidConfigurationValues() {
        const helper = await this.getHelper1()
        const sdk = helper.sdk
        const configuration = await sdk.configuration
        await sdk.deconfigure()

        await expect(async () => await sdk.configure(new PowerAuthConfiguration(
            configuration.configuration,
            configuration.baseEndpointUrl,
            configuration.algorithm,
            3
        ))).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})

        await expect(async () => await sdk.configure({
            configuration: configuration.configuration,
            baseEndpointUrl: configuration.baseEndpointUrl,
            algorithm: "invalid" as PowerAuthAlgorithm
        })).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
    }

    async testFullConfiguration() {
        const helper = await this.getHelper1()
        const sdk = helper.sdk

        expect(await sdk.isConfigured()).toBe(true)

        const configuration = await sdk.configuration
        const applicationDetail = await helper.getApplicationDetail()
        expect(normalizeEndpointUrl(configuration.baseEndpointUrl)).toBe(normalizeEndpointUrl(AppConfig.enrollmentUrl))
        expect(configuration.configuration).toBe(applicationDetail.mobileSdkConfig)
        expect(configuration.offlineAuthenticationCodeComponentLength).toBe(6)
        expect(configuration.algorithm).toBe(await sdk.currentAlgorithm)

        const clientConfiguration = await sdk.clientConfiguration
        expect(clientConfiguration.connectionTimeout).toBe(12)
        expect(clientConfiguration.readTimeout).toBe(Platform.OS === 'android' ? 34 : 12)
        expect(clientConfiguration.enableUnsecureTraffic).toBe(true)

        const biometryConfiguration = await sdk.biometryConfiguration
        expect(biometryConfiguration.invalidateBiometricFactorAfterChange).toBe(false)
        expect(biometryConfiguration.fallbackToDevicePasscode).toBe(Platform.OS === 'ios')
        expect(biometryConfiguration.confirmBiometricAuthentication).toBe(Platform.OS === 'android')
        expect(biometryConfiguration.authenticateOnBiometricKeySetup).toBe(Platform.OS === 'ios')
        expect(biometryConfiguration.fallbackToSharedBiometryKey).toBe(Platform.OS === 'ios')
        expect(biometryConfiguration.useLegacySymmetricKey).toBe(Platform.OS === 'android')

        const keychainConfiguration = await sdk.keychainConfiguration
        if (Platform.OS === 'android') {
            expect(keychainConfiguration).toBeDefined()
            expect(keychainConfiguration?.minimalRequiredKeychainProtection).toBe(PowerAuthKeychainProtection.SOFTWARE)
        } else {
            expect(keychainConfiguration).toBeUndefined()
        }

        const sharingConfiguration = await sdk.sharingConfiguration
        if (Platform.OS === 'ios') {
            expect(sharingConfiguration?.appGroup).toBe("group.com.wultra.testGroup")
            expect(sharingConfiguration?.appIdentifier).toBe("SharedInstanceTests")
            expect(sharingConfiguration?.keychainAccessGroup).toBe("fake.accessGroup")
            expect(sharingConfiguration?.sharedMemoryIdentifier).toBe("test")
        } else {
            expect(sharingConfiguration).toBeUndefined()
        }
    }

    async testDebugTracingRedactsClientSecrets() {
        const helper = await this.getHelper1()
        const sdk = helper.sdk
        const configuration = await sdk.configuration
        await sdk.deconfigure()

        const headerSecret = "sensitive-header-value"
        const usernameSecret = "sensitive-basic-username"
        const passwordSecret = "sensitive-basic-password"
        const clientConfiguration = new PowerAuthClientConfiguration()
        clientConfiguration.customHttpHeaders = [{ name: "X-Sensitive", value: headerSecret }]
        clientConfiguration.basicHttpAuthentication = {
            username: usernameSecret,
            password: passwordSecret
        }

        const originalLog = console.log
        const debugWasEnabled = PowerAuthDebug.isEnabled
        const messages: string[] = []
        try {
            PowerAuthDebug.isEnabled = true
            console.log = (...args: any[]) => messages.push(args.join(" "))
            PowerAuthDebug.traceNativeCodeCalls(false, true)
            await sdk.configure(configuration, clientConfiguration)
        } finally {
            PowerAuthDebug.traceNativeCodeCalls(false, false)
            PowerAuthDebug.isEnabled = debugWasEnabled
            console.log = originalLog
        }

        const trace = messages.join("\n")
        expect(trace.includes(headerSecret)).toBe(false)
        expect(trace.includes(usernameSecret)).toBe(false)
        expect(trace.includes(passwordSecret)).toBe(false)
        expect(trace.includes("***")).toBe(true)
        expect(clientConfiguration.customHttpHeaders?.[0].value).toBe(headerSecret)
        expect(clientConfiguration.basicHttpAuthentication?.username).toBe(usernameSecret)
        expect(clientConfiguration.basicHttpAuthentication?.password).toBe(passwordSecret)
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
        if (this.currentTestName === 'iosTestDeprecatedKeychainConfiguration') {
            keychainConfig = new PowerAuthKeychainConfiguration()
            keychainConfig.accessGroupName = "fake.accessGroup"
            keychainConfig.userDefaultsSuiteName = "com.wultra.test.powerauth"
        }
        let configuration: PowerAuthConfiguration | undefined
        const applicationDetail = await helper.getApplicationDetail()
        if (this.currentTestName === 'testConfigurationAlgorithms') {
            configuration = new PowerAuthConfiguration(
                applicationDetail.mobileSdkConfig,
                AppConfig.enrollmentUrl
            )
        } else if (this.currentTestName === 'testFullConfiguration') {
            configuration = new PowerAuthConfiguration(
                applicationDetail.mobileSdkConfig,
                AppConfig.enrollmentUrl,
                undefined,
                6
            )
            clientConfig = new PowerAuthClientConfiguration()
            clientConfig.enableUnsecureTraffic = true
            clientConfig.connectionTimeout = 12
            clientConfig.readTimeout = 34
            biometryConfig = new PowerAuthBiometryConfiguration()
            biometryConfig.invalidateBiometricFactorAfterChange = false
            biometryConfig.fallbackToDevicePasscode = true
            biometryConfig.confirmBiometricAuthentication = true
            biometryConfig.authenticateOnBiometricKeySetup = false
            biometryConfig.fallbackToSharedBiometryKey = false
            biometryConfig.useLegacySymmetricKey = true
            if (Platform.OS === 'android') {
                keychainConfig = new PowerAuthKeychainConfiguration()
                keychainConfig.minimalRequiredKeychainProtection = PowerAuthKeychainProtection.SOFTWARE
            } else {
                sharingConfig = new PowerAuthSharingConfiguration(
                    "group.com.wultra.testGroup",
                    "SharedInstanceTests",
                    "fake.accessGroup",
                    "test"
                )
            }
        } else {
            configuration = createE2ePowerAuthConfiguration(
                applicationDetail.mobileSdkConfig,
                AppConfig.enrollmentUrl
            )
        }
        await helper.configure({
            configuration,
            clientConfiguration: clientConfig,
            biometryConfiguration: biometryConfig,
            keychainConfiguration: keychainConfig,
            sharingConfiguration: sharingConfig
        })
    }
}
