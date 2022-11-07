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

import { TestWithActivation } from "./helpers/TestWithActivation";
import { CustomActivationHelperPrepareData } from "./helpers/RNActivationHelper";
import { expect, UserPromptDuration } from "../src/testbed";
import { PowerAuthActivation, PowerAuthAuthentication, PowerAuthBiometryConfiguration, PowerAuthBiometryStatus, PowerAuthBiometryType, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { ActivationStatus } from "powerauth-js-test-client";
import { Platform } from "react-native";

export class PowerAuth_BiometryInteractiveTests extends TestWithActivation {

    isAndoid = Platform.OS === 'android'

    /**
     * Construct this test suite as interactive
     * @param suiteName Optional test stuite name
     */
    constructor(suiteName: string | undefined = undefined) {
        super(suiteName, true)
    }

    shouldCreateActivationBeforeTest(): boolean {
        const n = this.context.testName
        return !(n == 'testCreateActivationWithSymmetricKey')
    }

    customPrepareData(): CustomActivationHelperPrepareData {
        // Use auth on setup
        const n = this.context.testName

        // Use config that allows create activation with biometry key with no user's interaction
        const config = new PowerAuthBiometryConfiguration()
        config.authenticateOnBiometricKeySetup = n == 'testCreateActivationWithSymmetricKey'
        config.fallbackToDevicePasscode = n == 'iosTestFallbackToPasscode'
        return {
            useConfigObjects: true,
            useBiometry: true,
            biometryConfig: config,
            password: this.credentials.validPassword
        }
    }

    async beforeEach(): Promise<void> {
        await super.beforeEach()
        let biometryInfo = await this.sdk.getBiometryInfo()
        if (biometryInfo.canAuthenticate !== PowerAuthBiometryStatus.OK) {
            this.reportSkip(`Biometric status is ${biometryInfo.canAuthenticate}`)
        }
    }

    async testCreateActivationWithSymmetricKey() {
        const sdk = await this.helper.getPowerAuthSdk()
        const activatioData = await this.helper.initActivation()
        const activation = PowerAuthActivation.createWithActivationCode(activatioData.activationCode!, "Test");
        await sdk.createActivation(activation)
        // Now commit activation with a legacy authentication

        if (this.isAndoid) await this.showPrompt('Authenticate to create activation with biometry')

        const commitAuth = PowerAuthAuthentication.commitWithPasswordAndBiometry(this.credentials.validPassword, {
            promptTitle: 'Authenticate with biometry',
            promptMessage: 'Authenticate to create activation with biometry'
        })
        await sdk.commitActivation(commitAuth)

        // Commit activation on the server
        if (await this.helper.getActivationStatus() != ActivationStatus.ACTIVE) {
            await this.helper.commitActivation()
        }

        // Now calculate some signature
        await this.showPrompt('Authenticate to calculate signature with symmetric key')

        const auth = PowerAuthAuthentication.biometry({
            promptTitle: 'Authenticate',
            promptMessage: 'Please authenticate with biometry'
        })
        await this.sdk.tokenStore.requestAccessToken('biometric-token', auth)
        await this.sdk.tokenStore.removeAccessToken('biometric-token')

        // Now remove biometry key
        await this.sdk.removeBiometryFactor()

        // And add it again
        if (this.isAndoid) await this.showPrompt('Authenticate to add biometric factor again')
        await this.sdk.addBiometryFactor(this.credentials.validPassword, {
            promptTitle: 'Authenticate',
            promptMessage: 'Authenticate to add biometric factor'
        })
    }

    async testBiometricSignature() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please authenticate with biometry to request access token')

        const auth = PowerAuthAuthentication.biometry({
            promptTitle: 'Authenticate',
            promptMessage: 'Please authenticate with biometry'
        })
        await this.sdk.tokenStore.requestAccessToken('biometric-token', auth)
        await this.sdk.tokenStore.removeAccessToken('biometric-token')

        // Try to reuse already used auth object
        await expect(async () => await this.sdk.tokenStore.requestAccessToken('biometric-token', auth)).toThrow({errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT})
    }

    async testLegacyBiometricSignature() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please authenticate with biometry to request access token')
        const auth = new PowerAuthAuthentication()
        auth.usePossession = true
        auth.useBiometry = true
        auth.biometryTitle = 'Authenticate (Legacy)'
        auth.biometryMessage = 'Please authenticate with biometry to request access token'

        await this.sdk.tokenStore.requestAccessToken('biometric-token', auth)
        await this.sdk.tokenStore.removeAccessToken('biometric-token')
    }

    async testLegacyBiometricSignature_NoPrompt() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        const auth = new PowerAuthAuthentication()
        auth.usePossession = true
        auth.useBiometry = true

        await this.showPrompt('Please authenticate - Dialog without strings')
        await this.sdk.tokenStore.requestAccessToken('biometric-token', auth)
        await this.sdk.tokenStore.removeAccessToken('biometric-token')
    }

    async testGroupedBiometricAuthentication() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please authenticate for group operation.')
        await this.sdk.groupedBiometricAuthentication(this.credentials.biometry, async reusableAuth => {
            //
            await this.showPrompt('Biometric dialog should not be displayed.', UserPromptDuration.QUICK)
            // Calculate signature 
            let data = '{}'
            let uriId = '/some/uriId'
            let header = await this.sdk.requestSignature(reusableAuth, 'POST', uriId, data)
            // Verify signature
            let result = await this.helper.signatureHelper.verifyOnlineSignature('POST', uriId, data, header.value)
            expect(result).toBe(true)
            //
            await this.showPrompt('Biometric dialog should not be displayed.', UserPromptDuration.QUICK)
            // Calculate yet another signature and verify
            data = '{"value":true}'
            uriId = '/another/uriId'

            header = await this.sdk.requestSignature(reusableAuth, 'POST', uriId, data)
            result = await this.helper.signatureHelper.verifyOnlineSignature('POST', uriId, data, header.value)
            expect(result).toBe(true)

            await this.showPrompt('Biometric dialog should not be displayed.', UserPromptDuration.QUICK)
            // Calculate yet another signature and verify
            data = '{"value":false}'
            uriId = '/another/uriId'

            header = await this.sdk.requestSignature(reusableAuth, 'POST', uriId, data)
            result = await this.helper.signatureHelper.verifyOnlineSignature('POST', uriId, data, header.value)
            expect(result).toBe(true)

            // Now sleep for 10 seconds

            await this.sleepWithProgress(10000)

            await this.showPrompt('Biometric dialog should be displayed again.')

            // Calculate yet another signature and verify
            data = '{"value":false, "something":true}'
            uriId = '/another/uriId'

            header = await this.sdk.requestSignature(reusableAuth, 'POST', uriId, data)
            result = await this.helper.signatureHelper.verifyOnlineSignature('POST', uriId, data, header.value)
            expect(result).toBe(true)

            await this.showPrompt('Biometric dialog should not be displayed again.', UserPromptDuration.QUICK)
            // Calculate yet another signature and verify
            data = '{"value":false}'
            uriId = '/another/uriId'

            header = await this.sdk.requestSignature(reusableAuth, 'POST', uriId, data)
            result = await this.helper.signatureHelper.verifyOnlineSignature('POST', uriId, data, header.value)
            expect(result).toBe(true)
        })
    }

    async testRemoveActivationWithBiometry() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Authenticate to remove activation')
        await this.sdk.removeActivationWithAuthentication(this.credentials.biometry)
    }
    
    async testCancelBiometry() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please CANCEL authentication dialog')
        const auth = PowerAuthAuthentication.biometry({promptTitle: "Please cancel", promptMessage: "Please CANCEL this dialog", cancelButton: "super cancel"})
        await expect(async () => this.sdk.requestSignature(auth, 'POST', '/some/uriId', '{}')).toThrow({ errorCode: PowerAuthErrorCode.BIOMETRY_CANCEL })
    }

    async testFailedBiometry() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        const isFaceId = !this.isAndoid && (await this.sdk.getBiometryInfo()).biometryType == PowerAuthBiometryType.FACE
        if (isFaceId) {
            await this.showPrompt('This test is not supported on FaceID')
            return
        }

        await this.showPrompt('Please FAIL authentication dialog')
        
        const auth = PowerAuthAuthentication.biometry({promptTitle: "Please fail", promptMessage: "Please use wrong biometry to fail"})
        // At biometry fail, the fake key is generated and the signature will be invalid
        let uriId = '/some/failed/uriId'
        let body = '{ failedApi: true }'
        const header = await this.sdk.requestSignature(auth, 'POST', uriId, body)
        const result = await this.helper.signatureHelper.verifyOnlineSignature('POST', uriId, body, header.value)
        expect(result).toBe(false)
    }

    async iosTestFallbackToPasscode() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please FAIL authentication and use device passcode')
        const auth = PowerAuthAuthentication.biometry({promptTitle: "Please fail", promptMessage: "Please use fallback to passcode"})
        // At biometry passcode fallback, everything should work properly
        let uriId = '/some/fallback/uriId'
        let body = '{ fallbackApi: true }'
        const header = await this.sdk.requestSignature(auth, 'POST', uriId, body)
        const result = await this.helper.signatureHelper.verifyOnlineSignature('POST', uriId, body, header.value)
        expect(result).toBe(true)
    }

    async iosTestFallbackButton() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please FAIL authentication and use fallback button')
        const auth = PowerAuthAuthentication.biometry({promptTitle: "Please fail", promptMessage: "Please use fallback to passcode", fallbackButton: 'fallback button'})
        await expect(async () => this.sdk.requestSignature(auth, 'POST', '/some/uriId', '{}')).toThrow({ errorCode: PowerAuthErrorCode.BIOMETRY_FALLBACK })
    }
}