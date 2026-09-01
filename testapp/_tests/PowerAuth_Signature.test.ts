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

import { PowerAuthActivationState, PowerAuthAuthentication, PowerAuthAuthorizationHttpHeader, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { expect } from "mobile-testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";

enum SignatureType {
    POSSESSION = 'POSSESSION',
    POSSESSION_KNOWLEDGE = 'POSSESSION_KNOWLEDGE',
    BIOMETRY = 'BIOMETRY'
}

interface SignatureTestData {
    method: string,
    uriId: string,
    body: string | undefined
    factors: SignatureType
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
            const parsed = SignatureHelper.parseHeader(header.value)
            expect(parsed.activationId).toBe(activationId)
            expect(parsed.signatureType.toUpperCase()).toBe(td.factors)

            const result = await this.helper.verifySignature(td.method, td.uriId, td.body || "", header.value)
            expect(!td.shouldFail).toBe(result.signatureValid)
        }
    }

    async testAuthenticationPurpose() {
        const persistAuth = PowerAuthAuthentication.persistWithPassword(this.credentials.validPassword)

        await expect(async () => await this.sdk.fetchEncryptionKey(persistAuth, 0))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => await this.sdk.signDataWithDevicePrivateKey(persistAuth, btoa('test'), 'BASE64'))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
    }

    async testWrongPassword() {
        let status = await this.sdk.fetchActivationStatus()
        const maxFailCount = status.maxFailCount
        for (let i = 1; i <= maxFailCount; i++) {
            expect(status.state).toBe(PowerAuthActivationState.ACTIVE)
            await expect(async () => await this.sdk.validatePassword(this.credentials.invalidPassword)).toThrow({errorCode: PowerAuthErrorCode.NETWORK_ERROR})
            status = await this.sdk.fetchActivationStatus()
            expect(status.failCount).toBe(i)
            expect(status.remainingAttempts).toBe(maxFailCount - i)
        }
        expect(status.state).toBe(PowerAuthActivationState.BLOCKED)
        expect(status.remainingAttempts).toBe(0)
    }

    // TODO: add offlineSignature test via {{baseUrl}}/v2/operations/{{operationId}}/offline/otp

    async testDeviceSignedDataBase64() {
        const dataToSign = 'This is a very sensitive information and must be signed.'
        const dataToSignBase64 = btoa(dataToSign)
        expect(await this.sdk.signDataWithDevicePrivateKey(this.credentials.knowledge, dataToSignBase64, 'BASE64')).toSucceed()
        // Now verify signature on the server.
        // We provide plain data, as the test server library will encode it to Base64 internally.
        // TODO: missing verification API
        // const result = await this.serverApi.verifyDeviceSignedData(activationId!, dataToSign, signature)
        // expect(result).toBe(true)
    }

    // async testServerSignedData_WithNoActivation() {
    //     const dataToSign = 'All your money are belong to us!'
    //     let signedPayload = await this.serverApi.createNonPersonalizedOfflineSignature(this.helper.application, dataToSign)
    //     let signedData = signedPayload.parsedSignedData
    //     let signature = signedPayload.parsedSignature
    //     expect(signedPayload.parsedData).toBe(dataToSign)
    //     expect(signedData).toBeNotNullish()
    //     expect(signature).toBeNotNullish()

    //     let result = await this.sdk.verifyServerSignedData(signedData!, signature!, true)
    //     expect(result).toBe(true)
    //     result = await this.sdk.verifyServerSignedData(Base64.encode(`A${signedData!}`), signature!, true)
    //     expect(result).toBe(false)
    // }

    // async testServerSignedData_WithActivation() {
    //     const activationId = await this.sdk.getActivationIdentifier()
    //     const dataToSign = 'All your money are belong to us!'
    //     let signedPayload = await this.serverApi.createPersonalizedOfflineSignature(activationId!, dataToSign)
    //     let signedData = signedPayload.parsedSignedData
    //     let signature = signedPayload.parsedSignature
    //     expect(signedPayload.parsedData).toBe(dataToSign)
    //     expect(signedData).toBeNotNullish()
    //     expect(signature).toBeNotNullish()

    //     let result = await this.sdk.verifyServerSignedData(signedData!, signature!, false)
    //     expect(result).toBe(true)
    //     result = await this.sdk.verifyServerSignedData(Base64.encode(`A${signedData!}`), signature!, false)
    //     expect(result).toBe(false)
    // }
}

interface OnlineSignature {
    activationId: string
    signature: string
    signatureType: string
    signatureVersion: string
    nonce: string
}

class SignatureHelper {

    static readonly signatureMagic = 'PowerAuth '

    /**
     * Parse authentication header produced in mobile SDK.
     * @param header HTTP header's value.
     * @returns Object representing an online signature.
     */
    static parseHeader(header: string): OnlineSignature {
        if (!header.startsWith(SignatureHelper.signatureMagic)) {
            throw new Error('Signature string must begin with PowerAuth')
        }
        const components = new Map<string, string>()
        header.substring(SignatureHelper.signatureMagic.length)
            .split(', ')
            .forEach(keyValue => {
                const equalIdx = keyValue.indexOf('=')
                if (equalIdx == -1) {
                    throw new Error(`Unknown component in header: ${keyValue}`)
                }
                const key = keyValue.substring(0, equalIdx)
                const value = keyValue.substring(equalIdx + 1)
                if (!value.startsWith('\"') || !value.endsWith('\"')) {
                    throw new Error(`Value is not closed in parenthesis:: ${keyValue}`)
                }
                components.set(key, value.substring(1, value.length - 1))
            })
        const version       = components.get('pa_version')
        const activationId  = components.get('pa_activation_id')
        const nonce         = components.get('pa_nonce')
        const signatureType = components.get('pa_signature_type')
        const signature     = components.get('pa_signature')
        if (!version)       throw new Error('Missing pa_version in PA signature')
        if (!activationId)  throw new Error('Missing pa_activation_id in PA signature')
        if (!nonce)         throw new Error('Missing pa_nonce in PA signature')
        if (!signatureType) throw new Error('Missing pa_signature_type in PA signature')
        if (!signature)     throw new Error('Missing pa_signature in PA signature')
        return {
            signature: signature,
            activationId: activationId,
            nonce: nonce,
            signatureType: signatureType.toUpperCase(),
            signatureVersion: version
        }
    }
}
