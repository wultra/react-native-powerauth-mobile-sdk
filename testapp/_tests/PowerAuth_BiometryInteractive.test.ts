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
import { expect, UserPromptDuration } from "mobile-testbed";
import { PowerAuthActivation, PowerAuthAuthentication, PowerAuthBiometryConfiguration, PowerAuthBiometryStatus, PowerAuthBiometryType, PowerAuthError, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { Platform } from "react-native";
import { importPassword } from "./helpers/PasswordHelper";
import { CustomConfig } from "../src/IntegrationUtils";

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

    provideCustomConfig(): CustomConfig {
        // Use auth on setup
        const n = this.context.testName

        // Use config that allows create activation with biometry key with no user's interaction
        const config = new PowerAuthBiometryConfiguration()
        config.authenticateOnBiometricKeySetup = n == 'testCreateActivationWithSymmetricKey'
        config.fallbackToDevicePasscode = n == 'iosTestFallbackToPasscode'
        return {
            biometryConfiguration: config
        }
    }

    activateWithBiometrics(): boolean { return true }

    async beforeEach(): Promise<void> {
        await super.beforeEach()
        const biometricStatus = await this.sdk.getBiometricStatus()
        if (biometricStatus.systemStatus !== PowerAuthBiometryStatus.OK) {
            this.reportSkip(`Biometric status is ${biometricStatus.systemStatus}`)
        }
    }

    async testCreateActivationWithSymmetricKey() {
        const sdk = await this.helper.sdk
        const activatioData = await this.helper.createActivation()
        const activation = PowerAuthActivation.createWithActivationCode(activatioData.activationCode!, "Test");
        await sdk.createActivation(activation)
        // Now persist activation with a legacy authentication

        if (this.isAndoid) await this.showPrompt('Authenticate to create activation with biometry')

        const password = await importPassword(this.credentials.validPassword)
        const persistAuth = PowerAuthAuthentication.persistWithPasswordAndBiometry(password, {
            promptTitle: 'Authenticate with biometry',
            promptSubtitle: 'PowerAuth activation',
            promptMessage: 'Authenticate to create activation with biometry'
        })
        await sdk.persistActivation(persistAuth)

        // Commit activation on the server
        if ((await this.helper.getRegistrationDetail()).registrationStatus != 'ACTIVE') {
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
            promptSubtitle: 'PowerAuth biometric factor',
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
            let header = await this.sdk.authenticationHeaderForRequestWithBody(reusableAuth, 'POST', uriId, data)
            // Verify signature
            let result = await this.helper.verifySignature('POST', uriId, data, header.value)
            expect(result.signatureValid).toBe(true)
            //
            await this.showPrompt('Biometric dialog should not be displayed.', UserPromptDuration.QUICK)
            // Calculate yet another signature and verify
            data = '{"value":true}'
            uriId = '/another/uriId'

            header = await this.sdk.authenticationHeaderForRequestWithBody(reusableAuth, 'POST', uriId, data)
            result = await this.helper.verifySignature('POST', uriId, data, header.value)
            expect(result.signatureValid).toBe(true)

            await this.showPrompt('Biometric dialog should not be displayed.', UserPromptDuration.QUICK)
            // Calculate yet another signature and verify
            data = '{"value":false}'
            uriId = '/another/uriId'

            header = await this.sdk.authenticationHeaderForRequestWithBody(reusableAuth, 'POST', uriId, data)
            result = await this.helper.verifySignature('POST', uriId, data, header.value)
            expect(result.signatureValid).toBe(true)

            // Now sleep for 10 seconds

            await this.sleepWithProgress(10000)

            await this.showPrompt('Biometric dialog should be displayed again.')

            // Calculate yet another signature and verify
            data = '{"value":false, "something":true}'
            uriId = '/another/uriId'

            header = await this.sdk.authenticationHeaderForRequestWithBody(reusableAuth, 'POST', uriId, data)
            result = await this.helper.verifySignature('POST', uriId, data, header.value)
            expect(result.signatureValid).toBe(true)

            await this.showPrompt('Biometric dialog should not be displayed again.', UserPromptDuration.QUICK)
            // Calculate yet another signature and verify
            data = '{"value":false}'
            uriId = '/another/uriId'

            header = await this.sdk.authenticationHeaderForRequestWithBody(reusableAuth, 'POST', uriId, data)
            result = await this.helper.verifySignature('POST', uriId, data, header.value)
            expect(result.signatureValid).toBe(true)
        })
    }

    async testGroupedBiometricAuthenticationWrapsCallbackError() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please authenticate for group operation.')

        let callbackError: PowerAuthError | undefined
        try {
            await this.sdk.groupedBiometricAuthentication(
                this.credentials.biometry,
                async () => { throw new Error('uncaught callback failure') }
            )
        } catch (error) {
            expect(error instanceof PowerAuthError).toBe(true)
            callbackError = error as PowerAuthError
        }
        expect(callbackError).toBeDefined()
        expect(callbackError?.code).toBe(PowerAuthErrorCode.UNKNOWN_ERROR)
        expect(callbackError?.message?.includes('groupedAuthenticationCalls')).toBe(true)
    }

    async testRemoveActivationWithBiometry() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Authenticate to remove activation')
        await this.sdk.removeActivationWithAuthentication(this.credentials.biometry)
    }
    
    async testCancelBiometry() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please CANCEL authentication dialog')
        const auth = PowerAuthAuthentication.biometry({promptTitle: "Please cancel", promptMessage: "Please CANCEL this dialog", cancelButtonTitle: "super cancel"})
        await expect(async () => this.sdk.authenticationHeaderForRequestWithBody(auth, 'POST', '/some/uriId', '{}')).toThrow({ errorCode: PowerAuthErrorCode.BIOMETRY_CANCEL })
    }

    async testFailedBiometry() {
        if (this.isAndoid) {
            return
        }
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        const isFaceId = !this.isAndoid && (await this.sdk.getBiometricStatus()).biometryType == PowerAuthBiometryType.FACE
        if (isFaceId) {
            await this.showPrompt('This test is not supported on FaceID')
            return
        }

        await this.showPrompt('Please FAIL authentication dialog')
        
        const auth = PowerAuthAuthentication.biometry({promptTitle: "Please fail", promptMessage: "Please use wrong biometry to fail"})
        // At biometry fail, the fake key is generated and the signature will be invalid
        const uriId = '/some/failed/uriId'
        const body = '{ failedApi: true }'
        const header = await this.sdk.authenticationHeaderForRequestWithBody(auth, 'POST', uriId, body)
        const result = await this.helper.verifySignature('POST', uriId, body, header.value)
        expect(result.signatureValid).toBe(false)
    }

    async iosTestFallbackToPasscode() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please FAIL authentication and use device passcode')
        const auth = PowerAuthAuthentication.biometry({promptTitle: "Please fail", promptMessage: "Please use fallback to passcode"})
        // At biometry passcode fallback, everything should work properly
        const uriId = '/some/fallback/uriId'
        const body = '{ fallbackApi: true }'
        const header = await this.sdk.authenticationHeaderForRequestWithBody(auth, 'POST', uriId, body)
        const result = await this.helper.verifySignature('POST', uriId, body, header.value)
        expect(result.signatureValid).toBe(true)
    }

    async iosTestFallbackButton() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please FAIL authentication and use fallback button')
        const auth = PowerAuthAuthentication.biometry({promptTitle: "Please fail", promptMessage: "Please use fallback to passcode", fallbackButtonTitle: 'fallback button'})
        await expect(async () => this.sdk.authenticationHeaderForRequestWithBody(auth, 'POST', '/some/uriId', '{}')).toThrow({ errorCode: PowerAuthErrorCode.BIOMETRY_FALLBACK })
    }
}
