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

import { expect } from "mobile-testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";
import { PowerAuthActivation, PowerAuthActivationState, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";

export class PowerAuth_ActivationTests extends TestWithActivation {

    async beforeAll(): Promise<void> {
        await super.beforeAll()
        this.printDebugMessages = false
    }

    shouldCreateActivationBeforeTest(): boolean {
        const n = this.currentTestName
        return n !== 'testCreateActivationWithBareCode' &&
               n !== 'testCreateActivationWithSignedCode' &&
               n !== 'testVerifyActivationQrCode'
    }

    async createActivationTest(useSignature: boolean) {
        const sdk = this.helper.sdk
        expect(sdk).toBeDefined()

        expect(await sdk.canStartActivation()).toBe(true)
        expect(await sdk.hasPendingActivation()).toBe(false)
        expect(await sdk.hasValidActivation()).toBe(false)
        expect(await sdk.getActivationIdentifier()).toBeUndefined()
        expect(await sdk.getActivationFingerprint()).toBeUndefined()
        expect(await sdk.getExternalPendingOperation()).toBeUndefined()

        await this.runFailingMethodsDuringActivation('BEGIN', PowerAuthErrorCode.MISSING_ACTIVATION, PowerAuthErrorCode.MISSING_ACTIVATION)
        await expect(async () => await sdk.persistActivation(this.credentials!.invalidKnowledge)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})

        // [ 1 ] Prepare activation on the server
        const detail = await this.helper.createActivation()
        expect(detail.activationCode).toBeDefined()
        expect(detail.activationCodeSignature).toBeDefined()
        const code = useSignature
            ? `${detail.activationCode}#${detail.activationCodeSignature}`
            : `${detail.activationCode}`
        // [ 2 ] Create activation locally, don't wait for promise completion, we need to test 
        //       a pending state
        const activation = PowerAuthActivation.createWithActivationCode(code, 'RN')
        const result = await sdk.createActivation(activation)
        expect(result).toBeDefined()
        expect(result.activationFingerprint).toBeDefined()

        await this.runFailingMethodsDuringActivation('AFTER_CREATE', PowerAuthErrorCode.PENDING_ACTIVATION, PowerAuthErrorCode.MISSING_ACTIVATION)
        await expect(async () => await sdk.createActivation(activation)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})
        
        // Key-exchange should be completed now, so activation Id and fingerprint is now available.
        expect(await sdk.canStartActivation()).toBe(false)
        expect(await sdk.hasPendingActivation()).toBe(true)
        expect(await sdk.hasValidActivation()).toBe(false)

        let activationId = await sdk.getActivationIdentifier()
        let activationFingerprint = await sdk.getActivationFingerprint()
        expect(activationId).toBeDefined()
        expect(activationFingerprint).toBeDefined()

        let activationDetail = await this.helper.getRegistrationDetail()

        expect(activationId).toBe(activationDetail.registrationId)

        // [ 3 ] Now persist activation locally
        await sdk.persistActivation(this.credentials.knowledge)

        activationId = await sdk.getActivationIdentifier()
        activationFingerprint = await sdk.getActivationFingerprint()
        expect(activationId).toBeDefined()
        expect(activationFingerprint).toBeDefined()

        expect(await sdk.canStartActivation()).toBe(false)
        expect(await sdk.hasPendingActivation()).toBe(false)
        expect(await sdk.hasValidActivation()).toBe(true)

        activationDetail = await this.helper.getRegistrationDetail()
        expect(activationId).toBe(activationDetail.registrationId)
        expect(result.activationFingerprint).toBe(activationFingerprint)

        // Fetch status now

        let state = (await sdk.fetchActivationStatus()).state

        // Validate status

        let doCommitActivation = false
        
        if (state !== PowerAuthActivationState.PENDING_COMMIT) {
            if (state === PowerAuthActivationState.ACTIVE) {
                this.reportWarning(`State should be PENDING_COMMIT but is ACTIVE`)
            } else {
                this.reportFailure(`State should be PENDING_COMMIT but is ${state}`)
            }
        } else {
            doCommitActivation = true
        }
        // [ 4 ] Commit activation on the server, if required
        
        await this.helper.commitActivation()
        state = (await sdk.fetchActivationStatus()).state
        expect(state).toBe(PowerAuthActivationState.ACTIVE)
        

        expect(await sdk.canStartActivation()).toBe(false)
        expect(await sdk.hasPendingActivation()).toBe(false)
        expect(await sdk.hasValidActivation()).toBe(true)

        await expect(async () => await sdk.createActivation(activation)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})
        await expect(async () => await sdk.persistActivation(this.credentials.invalidKnowledge)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})

        expect(await sdk.canStartActivation()).toBe(false)
        expect(await sdk.hasPendingActivation()).toBe(false)
        expect(await sdk.hasValidActivation()).toBe(true)
    }

    async runFailingMethodsDuringActivation(stage: string, expectedFetchError: PowerAuthErrorCode, expectedError: PowerAuthErrorCode) {
        const sdk = this.sdk
        this.debugInfo(`Evaluating wrong API usage in ${stage}`)
        // Fetch has a slighgtly different error handling, so it needs a different error code than other API function.
        // TODO: This should be unified in future versions
        await expect(async () => await sdk.fetchActivationStatus()).toThrow({errorCode: expectedFetchError})
        await expect(async () => await sdk.removeActivationWithAuthentication(this.credentials.invalidKnowledge)).toThrow({errorCode: expectedError})
        await expect(async () => await sdk.requestGetSignature(this.credentials.knowledge, '/some/uriid', null)).toThrow({errorCode: expectedError})
        await expect(async () => await sdk.requestSignature(this.credentials.knowledge, 'POST', '/some/uriid', undefined)).toThrow({errorCode: expectedError})
        await expect(async () => await sdk.changePassword(this.credentials.validPassword, this.credentials.invalidPassword)).toThrow({errorCode: expectedError})
        await expect(async () => await sdk.addBiometryFactor(this.credentials.validPassword, 'Auth title', 'Auth desc')).toThrow({errorCode: expectedError})
        await expect(async () => await sdk.fetchEncryptionKey(this.credentials.knowledge, 99)).toThrow({errorCode: expectedError})
        await expect(async () => await sdk.signDataWithDevicePrivateKey(this.credentials.knowledge, 'Data', 'UTF8')).toThrow({errorCode: expectedError})
        await expect(async () => await sdk.validatePassword(this.credentials.validPassword)).toThrow({errorCode: expectedError})

        // TODO: following functions should fail and not return false or some different error
        expect(await sdk.verifyServerSignedData('c2lnbmF0dXJl', 'c2lnbmF0dXJl', false)).toBe(false)
        expect(await sdk.unsafeChangePassword(this.credentials.validPassword, this.credentials.invalidPassword)).toBe(false)
        await expect(async () => await sdk.removeBiometryFactor()).toThrow({errorCode: PowerAuthErrorCode.BIOMETRY_NOT_CONFIGURED })
        await expect(async () => await sdk.activationRecoveryData(this.credentials.knowledge)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})
        //await expect(async () => await sdk.offlineSignature(this.credentials.knowledge, '/some/uriid', 'MDEyMzQ1Njc=', undefined)).toThrow({errorCode: PowerAuthErrorCode.MISSING_ACTIVATION})
        //await expect(async () => await sdk.confirmRecoveryCode('R:ZKMVN-4IMFK-FLSYX-ARRGA', this.credentials.knowledge)).toThrow({errorCode: expectedError})
    }

    // Actual tests starts here

    async testCreateActivationWithBareCode() {
        return await this.createActivationTest(false)
    }
    
    async testCreateActivationWithSignedCode() {
        return await this.createActivationTest(true)
    }
    
    async testFetchActivationStatus() {
        expect(await this.sdk.hasValidActivation()).toBe(true)

        let status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.ACTIVE)
        await this.helper.changeActivation("BLOCK")

        status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.BLOCKED)

        await this.helper.changeActivation("UNBLOCK")
        status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.ACTIVE)

        await this.helper.removeRegistration()
        status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.REMOVED)
        expect(await this.sdk.hasValidActivation()).toBe(true)

        await this.sdk.removeActivationLocal()
        expect(await this.sdk.hasValidActivation()).toBe(false)
    }

    async testActivationRemove() {
        await this.sdk.removeActivationWithAuthentication(this.credentials.knowledge)
        expect(await this.sdk.hasValidActivation()).toBe(false)
    }

    async testVerifyActivationQrCode() {
        const sdk = this.sdk
        expect(sdk).toBeDefined()
        expect(await sdk.canStartActivation()).toBe(true)

        // Prepare activation on the server
        const detail = await this.helper.createActivation()
        expect(detail.activationCode).toBeDefined()
        expect(detail.activationCodeSignature).toBeDefined()
        const code = detail.activationCode!
        const sign = detail.activationCodeSignature!

        expect(await sdk.verifyScannedActivationCode(`${code}#${sign}`)).toBe(true)
        expect(await sdk.verifyScannedActivationCode(`${code}`)).toBe(false)
        expect(await sdk.verifyScannedActivationCode(`VVVVV-VVVVV-VVVVV-VTFVA#${sign}`)).toBe(false)
    }
}