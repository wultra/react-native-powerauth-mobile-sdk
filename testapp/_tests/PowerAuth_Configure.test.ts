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

import { PowerAuth, PowerAuthActivation, PowerAuthAuthentication, PowerAuthDebug, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { TestWithServer } from "./helpers/TestWithServer";
import { createActivationHelper, CustomActivationHelperPrepareData, RNActivationHelper } from "./helpers/RNActivationHelper";
import { expect } from "../src/testbed";

export class PowerAuth_ConfigureTests extends TestWithServer {

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
        // SDK instances from helpers should be afailable
        const sdk1 = helper1.powerAuthSdk
        const sdk2 = helper2.powerAuthSdk

        expect(await sdk1.isConfigured()).toBe(true)
        expect(await sdk2.isConfigured()).toBe(true)
        // Instances created from helper also should have configuration objects set
        expect(sdk1.configuration).toBeDefined()
        expect(sdk2.configuration).toBeDefined()
        expect(sdk1.keychainConfiguration).toBeDefined()
        expect(sdk2.keychainConfiguration).toBeDefined()
        expect(sdk1.clientConfiguration).toBeDefined()
        expect(sdk2.clientConfiguration).toBeDefined()
        expect(sdk1.biometryConfiguration).toBeDefined()
        expect(sdk2.biometryConfiguration).toBeDefined()

        // pa1 & pa2 should be configured now, because PowerAuth is just a thin envelope
        // keeping only essential values
        expect(await pa1.isConfigured()).toBe(true)
        expect(await pa2.isConfigured()).toBe(true)
        // Unline instances created in helper, pa1 & pa2
        expect(pa1.configuration).toBeNullish()
        expect(pa2.configuration).toBeNullish()
        expect(pa1.keychainConfiguration).toBeNullish()
        expect(pa2.keychainConfiguration).toBeNullish()
        expect(pa1.clientConfiguration).toBeNullish()
        expect(pa2.clientConfiguration).toBeNullish()
        expect(pa1.biometryConfiguration).toBeNullish()
        expect(pa2.biometryConfiguration).toBeNullish()
    }

    async testReconfigureWhileActive() {
        const helper1 = await this.getHelper1()
        const sdk1 = helper1.powerAuthSdk
        const helper2 = await this.getHelper2()
        const sdk2 = helper2.powerAuthSdk

        expect(await sdk1.isConfigured()).toBe(true)
        expect(await sdk2.isConfigured()).toBe(true)

        const config1 = sdk1.configuration
        const config2 = sdk2.configuration
        const clientConfig1 = sdk1.clientConfiguration
        const clientConfig2 = sdk2.clientConfiguration
        const keychainConfig1 = sdk1.keychainConfiguration
        const keychainConfig2 = sdk2.keychainConfiguration
        const biometryConfig1 = sdk1.biometryConfiguration
        const biometryConfig2 = sdk2.biometryConfiguration

        expect(config1).toBeDefined()
        expect(config2).toBeDefined()
        expect(clientConfig1).toBeDefined()
        expect(clientConfig2).toBeDefined()
        expect(keychainConfig1).toBeDefined()
        expect(keychainConfig2).toBeDefined()
        expect(biometryConfig1).toBeDefined()
        expect(biometryConfig2).toBeDefined()

        await helper1.createActivation(undefined, this.prepareData(this.instance1))
        await helper2.createActivation(undefined, this.prepareData(this.instance2))

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

    async runMethodsThatMustFail(sdk: PowerAuth) {
        await expect(async () => await sdk.hasValidActivation()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.canStartActivation()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.hasPendingActivation()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.hasActivationRecoveryData()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.fetchActivationStatus()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.createActivation(PowerAuthActivation.createWithActivationCode('', ''))).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.commitActivation(new PowerAuthAuthentication())).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.getActivationFingerprint()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.getActivationIdentifier()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.removeActivationWithAuthentication(new PowerAuthAuthentication())).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.removeActivationLocal()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.requestGetSignature(new PowerAuthAuthentication(), '', undefined)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.requestSignature(new PowerAuthAuthentication(), '', '')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.offlineSignature(new PowerAuthAuthentication(), '', '', undefined)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.verifyServerSignedData('', '', false)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.changePassword('', '')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.unsafeChangePassword('', '')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.addBiometryFactor('', '', '')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.hasBiometryFactor()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.removeBiometryFactor()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.fetchEncryptionKey(new PowerAuthAuthentication(), 1000)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.signDataWithDevicePrivateKey(new PowerAuthAuthentication(), '')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.validatePassword('')).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.activationRecoveryData(new PowerAuthAuthentication())).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.confirmRecoveryCode('', new PowerAuthAuthentication())).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        await expect(async () => await sdk.groupedBiometricAuthentication(new PowerAuthAuthentication(), async auth => {})).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
        
        // TODO: getBiometryInfo() doesn't depend on configuration. We should move this to separate class
        // await expect(async () => await sdk.getBiometryInfo()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})
    }

    // Support methods

    helperInstance1: RNActivationHelper | undefined
    helperInstance2: RNActivationHelper | undefined

    readonly instance1 = 'testInstance1'
    readonly instance2 = 'testInstance2'
    readonly password1 = 'SueprSecure'
    readonly password2 = 'GoodAlternative'

    async getHelper1(): Promise<RNActivationHelper> {
        if (!this.helperInstance1) {
            this.helperInstance1 = await this.createInstance(this.instance1)
        }
        return this.helperInstance1
    }

    async getHelper2(): Promise<RNActivationHelper> {
        if (!this.helperInstance2) {
            this.helperInstance2 = await this.createInstance(this.instance2)
        }
        return this.helperInstance2
    }

    async createInstance(instanceId: string): Promise<RNActivationHelper> {
        const helper = await createActivationHelper(this.serverApi, this.config, activation => this.customizePowerAuthActivation(activation))
        await helper.getPowerAuthSdk(this.prepareData(instanceId))
        return helper
    }

    async cleanupInstance(helper: RNActivationHelper | undefined, instanceId: string) {
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

    customizePowerAuthActivation(activation: PowerAuthActivation) {}

    prepareData(instanceId: string): CustomActivationHelperPrepareData {
        return {
            powerAuthInstanceId: instanceId,
            useConfigObjects: true,
            password: instanceId === this.instance1 ? this.password1 : this.password2
        }
    }
}