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

import { expect } from "../src/testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";
import { PowerAuthActivation, PowerAuthActivationState, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";

export class PowerAuth_ActivationTests extends TestWithActivation {

    async beforeAll(): Promise<void> {
        await super.beforeAll()
        this.printDebugMessages = false
        //this.reportSkip('Temporary')
    }

    shouldCreateActivationBeforeTest(): boolean {
        const n = this.currentTestName
        return n !== 'testCreateActivationWithBareCode' &&
               n !== 'testCreateActivationWithSignedCode'
    }

    async createActivationTest(useSignature: boolean) {
        const sdk = await this.createSdk()
        expect(sdk).toBeDefined()

        expect(await sdk.canStartActivation()).toBeTruthy()
        expect(await sdk.hasPendingActivation()).toBeFalsy()
        expect(await sdk.hasValidActivation()).toBeFalsy()
        expect(await sdk.getActivationIdentifier()).toBeNullish()
        expect(await sdk.getActivationFingerprint()).toBeNullish()

        await this.runFailingMethodsDuringActivation('BEGIN', PowerAuthErrorCode.MISSING_ACTIVATION, PowerAuthErrorCode.MISSING_ACTIVATION)
        await expect(async () => await sdk.commitActivation(this.credentials.invalidKnowledge)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})

        // [ 1 ] Prepare activation on the server
        await this.helper.initActivation()
        expect(this.activation.activationCode).toBeDefined()
        expect(this.activation.activationSignature).toBeDefined()
        const code = useSignature 
                        ? `${this.activation.activationCode}#${this.activation.activationSignature}`
                        : `${this.activation.activationCode}`
        // [ 2 ] Create activation locally, don't wait for promise completion, we need to test 
        //       a pending state
        const activation = PowerAuthActivation.createWithActivationCode(code, 'RN')
        const result = await sdk.createActivation(activation)

        expect(result.activationFingerprint).toBeDefined()

        await this.runFailingMethodsDuringActivation('AFTER_CREATE', PowerAuthErrorCode.PENDING_ACTIVATION, PowerAuthErrorCode.MISSING_ACTIVATION)
        await expect(async () => await sdk.createActivation(activation)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})
        
        // Key-exchange should be completed now, so activation Id and fingerprint is now available.
        expect(await sdk.canStartActivation()).toBeFalsy()
        expect(await sdk.hasPendingActivation()).toBeTruthy()
        expect(await sdk.hasValidActivation()).toBeFalsy()

        let activationId = await sdk.getActivationIdentifier()
        let activationFingerprint = await sdk.getActivationFingerprint()
        expect(activationId).toBeNotNullish()
        expect(activationFingerprint).toBeNotNullish()

        let activationDetail = await this.helper.getActivationDetail()

        expect(activationDetail.devicePublicKeyFingerprint).toBeNotNullish()
        expect(result.activationFingerprint).toBe(activationFingerprint)
        expect(result.activationFingerprint).toBe(activationDetail.devicePublicKeyFingerprint)
        expect(activationId).toBe(activationDetail.activationId)

        // [ 3 ] Now commit activation locally
        await sdk.commitActivation(this.credentials.knowledge)

        activationId = await sdk.getActivationIdentifier()
        activationFingerprint = await sdk.getActivationFingerprint()
        expect(activationId).toBeNotNullish()
        expect(activationFingerprint).toBeNotNullish()

        expect(await sdk.canStartActivation()).toBeFalsy()
        expect(await sdk.hasPendingActivation()).toBeFalsy()
        expect(await sdk.hasValidActivation()).toBeTruthy()

        activationDetail = await this.helper.getActivationDetail()
        expect(activationDetail.devicePublicKeyFingerprint).toBeNotNullish()
        expect(result.activationFingerprint).toBe(activationFingerprint)
        expect(result.activationFingerprint).toBe(activationDetail.devicePublicKeyFingerprint)
        expect(activationId).toBe(activationDetail.activationId)

        // Fetch status now

        let state = (await sdk.fetchActivationStatus()).state

        // Validate status

        let doCommitActivation = false
        if (this.config.connection.autoCommit) {
            // Auto commit is expected, so the state should be ACTIVE
            if (state !== PowerAuthActivationState.ACTIVE) {
                if (state === PowerAuthActivationState.PENDING_COMMIT) {
                    this.reportWarning(`State should be ACTIVE but is PENDING_COMMIT`)
                    doCommitActivation = true
                } else {
                    this.reportFailure(`State should be ACTIVE but is ${state}`)
                }
            }
        } else if (this.config.connection.autoCommit === false) {
            // Auto commit is not expected, so the state should be PENDING_COMMIT
            if (state !== PowerAuthActivationState.PENDING_COMMIT) {
                if (state === PowerAuthActivationState.ACTIVE) {
                    this.reportWarning(`State should be PENDING_COMMIT but is ACTIVE`)
                } else {
                    this.reportFailure(`State should be PENDING_COMMIT but is ${state}`)
                }
            } else {
                doCommitActivation = true
            }
        }
        // [ 4 ] Commit activation on the server, if required
        if (doCommitActivation) {
            await this.helper.commitActivation()
            state = (await sdk.fetchActivationStatus()).state
            expect(state).toBe(PowerAuthActivationState.ACTIVE)
        }

        expect(await sdk.canStartActivation()).toBeFalsy()
        expect(await sdk.hasPendingActivation()).toBeFalsy()
        expect(await sdk.hasValidActivation()).toBeTruthy()

        await expect(async () => await sdk.createActivation(activation)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})
        await expect(async () => await sdk.commitActivation(this.credentials.invalidKnowledge)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})

        expect(await sdk.canStartActivation()).toBeFalsy()
        expect(await sdk.hasPendingActivation()).toBeFalsy()
        expect(await sdk.hasValidActivation()).toBeTruthy()
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
        await expect(async () => await sdk.signDataWithDevicePrivateKey(this.credentials.knowledge, 'Data')).toThrow({errorCode: expectedError})
        await expect(async () => await sdk.validatePassword(this.credentials.validPassword)).toThrow({errorCode: expectedError})

        // TODO: following functions should fail and not return false or some different error
        expect(await sdk.verifyServerSignedData('c2lnbmF0dXJl', 'c2lnbmF0dXJl', false)).toBeFalsy()
        expect(await sdk.unsafeChangePassword(this.credentials.validPassword, this.credentials.invalidPassword)).toBeFalsy()
        expect(await sdk.removeBiometryFactor()).toBeFalsy()
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
        expect(await this.sdk.hasValidActivation()).toBeTruthy()

        let status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.ACTIVE)
        await this.helper.blockActivation()

        status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.BLOCKED)

        await this.helper.unblockActivation()
        status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.ACTIVE)

        await this.helper.removeActivation()
        status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.REMOVED)
        expect(await this.sdk.hasValidActivation()).toBeTruthy()

        await this.sdk.removeActivationLocal()
        expect(await this.sdk.hasValidActivation()).toBeFalsy()
    }

    async testActivationRemove() {
        await this.sdk.removeActivationWithAuthentication(this.credentials.knowledge)
        expect(await this.sdk.hasValidActivation()).toBeFalsy()
    }
}