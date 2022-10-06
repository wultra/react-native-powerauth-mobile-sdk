/*
 * Copyright 2022 Wultra s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ActivationStatus, SignatureHelper, SignatureType } from "powerauth-js-test-client";
import { PowerAuthActivation, PowerAuthActivationState, PowerAuthAuthentication, PowerAuthAuthorizationHttpHeader, PowerAuthErrorCode, PowerAuthRecoveryActivationData } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";
import { Base64 } from "js-base64"; 

interface SignatureTestData {
    method: string,
    uriId: string,
    body: string | Map<string, string> | undefined
    factors: SignatureType,
    shouldFail?: boolean
}

const testData: SignatureTestData[] = [
    { method: 'POST', uriId: '/some/uriId', body: 'Hello world', factors: SignatureType.POSSESSION },
    { method: 'POST', uriId: '/some/uriId', body: undefined, factors: SignatureType.POSSESSION },
    { method: 'POST', uriId: '/some/uriId/knowledge', body: '{ super value }', factors: SignatureType.POSSESSION_KNOWLEDGE },
    { method: 'POST', uriId: '/some/uriId/knowledge', body: undefined, factors: SignatureType.POSSESSION_KNOWLEDGE },
    { method: 'POST', uriId: '/failed/knowledge', body: undefined, factors: SignatureType.POSSESSION_KNOWLEDGE, shouldFail: true },
    { method: 'POST', uriId: '/failed/knowledge', body: 'undefined', factors: SignatureType.POSSESSION_KNOWLEDGE, shouldFail: true },
    { method: 'POST', uriId: '/very/secure', body: '{}', factors: SignatureType.POSSESSION_KNOWLEDGE },

    // TODO: normalization in test client seems to be broken
    //{ method: 'GET',  uriId: '/uri/ID', body: new Map([['param1', 'valueX'], ['something', 'ExpectedValue']]), factors: SignatureType.POSSESSION }
]

export class PowerAuth_SignatureTests extends TestWithActivation {

    shouldCreateActivationBeforeTest(): boolean {
        return this.currentTestName !== 'testServerSignedData_WithNoActivation'
    }

    async testSignatureCalculation() {
        const sdk = this.sdk
        const signatureHelper = this.helper.signatureHelper
        const activationId = await sdk.getActivationIdentifier()

        for (const i in testData) {
            const td = testData[i]
            // Prepare auth object
            let auth: PowerAuthAuthentication
            if (td.factors === SignatureType.POSSESSION) {
                auth = this.credentials.possession
            } else if (td.factors === SignatureType.POSSESSION_KNOWLEDGE) {
                auth = td.shouldFail ?? false ? this.credentials.invalidKnowledge : this.credentials.knowledge
            } else {
                auth = this.credentials.biometry
            }
            let header: PowerAuthAuthorizationHttpHeader
            if (td.method === 'POST') {
                const body = td.body
                if (!(typeof body === 'string' || body === undefined)) {
                    throw new Error(`Unsuported body type for test with uriId = ${td.uriId}`)
                }
                header = await sdk.requestSignature(auth, td.method, td.uriId, body)
            } else if (td.method === 'GET') {
                const body = td.body
                if (typeof body === 'string') {
                    throw new Error(`Unsuported body type for test with uriId = ${td.uriId}`)
                }
                header = await sdk.requestGetSignature(auth, td.uriId, body)
            } else {
                throw new Error(`Unsupported HTTP method ${td.method}`)
            }

            // Let's validate signature on the server
            const parsed = signatureHelper.parseHeader(header.value)
            expect(parsed.activationId).toBe(activationId)
            expect(parsed.applicationKey).toBe(this.helper.appSetup.appKey)
            expect(parsed.signatureType.toUpperCase()).toBe(td.factors)

            const result = await signatureHelper.verifyOnlineSignature(td.method, td.uriId, td.body, header.value)
            if (result !== !(td.shouldFail ?? false)) {
                this.reportFailure(`Result doesn't match for ${td.uriId}`)
            }
        }
    }

    async testWrongPassword() {
        let status = await this.sdk.fetchActivationStatus()
        const maxFailCount = status.maxFailCount
        for (let i = 1; i <= maxFailCount; i++) {
            expect(status.state).toBe(PowerAuthActivationState.ACTIVE)
            await expect(async () => await this.sdk.validatePassword(this.credentials.invalidPassword)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
            status = await this.sdk.fetchActivationStatus()
            expect(status.failCount).toBe(i)
            expect(status.remainingAttempts).toBe(maxFailCount - i)
        }
        expect(status.state).toBe(PowerAuthActivationState.BLOCKED)
        expect(status.remainingAttempts).toBe(0)
    }

    async testDeviceSignedData() {
        const dataToSign = 'This is a very sensitive information and must be signed.'
        const activationId = await this.sdk.getActivationIdentifier()
        const signature = await this.sdk.signDataWithDevicePrivateKey(this.credentials.knowledge, dataToSign)
        // Now verify signature on the server.
        const result = await this.serverApi.verifyDeviceSignedData(activationId, dataToSign, signature)
        expect(result).toBeTruthy()
    }

    async testServerSignedData_WithNoActivation() {
        const dataToSign = 'All your money are belong to us!'
        let signedPayload = await this.serverApi.createNonPersonalizedOfflineSignature(this.helper.application, dataToSign)
        let signedData = signedPayload.parsedSignedData
        let signature = signedPayload.parsedSignature
        expect(signedPayload.parsedData).toBe(dataToSign)
        expect(signedData).toBeNotNullish()
        expect(signature).toBeNotNullish()

        let result = await this.sdk.verifyServerSignedData(signedData!, signature!, true)
        expect(result).toBeTruthy()
        result = await this.sdk.verifyServerSignedData(Base64.encode(`A${signedData!}`), signature!, true)
        expect(result).toBeFalsy()
    }

    async testServerSignedData_WithActivation() {
        const activationId = await this.sdk.getActivationIdentifier()
        const dataToSign = 'All your money are belong to us!'
        let signedPayload = await this.serverApi.createPersonalizedOfflineSignature(activationId, dataToSign)
        let signedData = signedPayload.parsedSignedData
        let signature = signedPayload.parsedSignature
        expect(signedPayload.parsedData).toBe(dataToSign)
        expect(signedData).toBeNotNullish()
        expect(signature).toBeNotNullish()

        let result = await this.sdk.verifyServerSignedData(signedData!, signature!, false)
        expect(result).toBeTruthy()
        result = await this.sdk.verifyServerSignedData(Base64.encode(`A${signedData!}`), signature!, false)
        expect(result).toBeFalsy()
    }
}