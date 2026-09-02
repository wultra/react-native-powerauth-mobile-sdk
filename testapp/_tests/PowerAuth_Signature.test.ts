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

import {
    PowerAuthActivationState,
    PowerAuthAlgorithm,
    PowerAuthAuthentication,
    PowerAuthDevicePublicKeyFormat,
    PowerAuthErrorCode,
    PowerAuthHttpHeader,
    PowerAuthSignatureKeyId,
    PowerAuthSignatureKeyType
} from "react-native-powerauth-mobile-sdk";
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
    body?: string
    queryParams?: Record<string, string>
    useParams?: boolean
    factors: SignatureType
    shouldFail?: boolean
}

const testData: SignatureTestData[] = [
    { method: 'POST', uriId: '/some/uriId', body: 'Hello world', factors: SignatureType.POSSESSION },
    { method: 'GET', uriId: '/some/uriId', useParams: true, factors: SignatureType.POSSESSION },
    { method: 'GET', uriId: '/some/uriId/params', queryParams: { message: 'Hello world', page: '1' }, useParams: true, factors: SignatureType.POSSESSION },
    { method: 'POST', uriId: '/some/uriId/params', queryParams: { message: 'Hello world', page: '2' }, useParams: true, factors: SignatureType.POSSESSION },
    { method: 'POST', uriId: '/some/uriId', body: undefined, factors: SignatureType.POSSESSION },
    { method: 'POST', uriId: '/some/uriId/knowledge', body: '{ super value }', factors: SignatureType.POSSESSION_KNOWLEDGE },
    { method: 'POST', uriId: '/some/uriId/knowledge', body: undefined, factors: SignatureType.POSSESSION_KNOWLEDGE },
    { method: 'POST', uriId: '/failed/knowledge', body: undefined, factors: SignatureType.POSSESSION_KNOWLEDGE, shouldFail: true },
    { method: 'POST', uriId: '/failed/knowledge', body: 'undefined', factors: SignatureType.POSSESSION_KNOWLEDGE, shouldFail: true },
    { method: 'POST', uriId: '/very/secure', body: '{}', factors: SignatureType.POSSESSION_KNOWLEDGE }
]

function withTimeout<T>(operation: Promise<T>, timeoutMs: number = 10_000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Operation did not complete within ${timeoutMs} ms`)), timeoutMs)
        operation.then(
            value => {
                clearTimeout(timeout)
                resolve(value)
            },
            error => {
                clearTimeout(timeout)
                reject(error)
            }
        )
    })
}

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
            let header: PowerAuthHttpHeader
            if (td.useParams) {
                header = await sdk.authenticationHeaderForRequestWithParams(auth, td.method, td.uriId, td.queryParams)
            } else {
                header = await sdk.authenticationHeaderForRequestWithBody(auth, td.method, td.uriId, td.body)
            }

            // Let's validate signature on the server
            const parsed = SignatureHelper.parseHeader(header.value)
            expect(header.name).toBe('X-PowerAuth-Authorization')
            expect(parsed.activationId).toBe(activationId)
            expect(parsed.signatureType.toUpperCase()).toBe(td.factors)

            // The cloud verifier accepts query parameters only for GET. Verifying a header
            // produced for POST as GET still proves that the supplied method affects the code.
            if (td.useParams && td.method === 'POST') {
                const result = await this.helper.verifySignature('GET', td.uriId, '', header.value, td.queryParams, true)
                expect(result.signatureValid).toBe(false)
            } else {
                const result = await this.helper.verifySignature(td.method, td.uriId, td.body ?? "", header.value, td.queryParams, td.useParams)
                expect(!td.shouldFail).toBe(result.signatureValid)
            }
        }
    }

    async testAuthenticationPurpose() {
        const persistAuth = PowerAuthAuthentication.persistWithPassword(this.credentials.validPassword)
        const data = btoa('test')

        await expect(async () => await this.sdk.fetchEncryptionKey(persistAuth, 0))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => await this.sdk.signDataWithDevicePrivateKey(persistAuth, data, 'BASE64'))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => await this.sdk.calculateDigitalSignature(
            persistAuth,
            data,
            PowerAuthSignatureKeyId.DEVICE_EC
        )).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => await this.sdk.calculateJwsSignature(
            persistAuth,
            data,
            'JWT',
            true,
            PowerAuthSignatureKeyId.DEVICE_EC
        )).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => await this.sdk.createCertificateSigningRequest(
            persistAuth,
            { CN: 'PowerAuth Integration Test' },
            undefined,
            PowerAuthSignatureKeyId.DEVICE_EC
        )).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => await this.sdk.authenticationHeaderForRequestWithParams(persistAuth, 'GET', '/wrong-purpose'))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => await this.sdk.authenticationHeaderForRequestWithBody(persistAuth, 'POST', '/wrong-purpose', '{}'))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => await this.sdk.offlineAuthenticationCode(persistAuth, '/wrong-purpose', 'MDEyMzQ1Njc=', '{}'))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
    }

    async testLegacyRequestSignatureCompatibility() {
        const bodyHeader = await this.sdk.requestSignature(this.credentials.possession, 'POST', '/legacy/body', '{}')
        expect(bodyHeader.key).toBe('X-PowerAuth-Authorization')
        expect(bodyHeader.value).toBeDefined()
        expect((await this.helper.verifySignature('POST', '/legacy/body', '{}', bodyHeader.value)).signatureValid).toBe(true)

        const params = { value: '1' }
        const paramsHeader = await this.sdk.requestGetSignature(this.credentials.possession, '/legacy/params', params)
        expect(paramsHeader.key).toBe('X-PowerAuth-Authorization')
        expect(paramsHeader.value).toBeDefined()
        expect((await this.helper.verifySignature('GET', '/legacy/params', '', paramsHeader.value, params)).signatureValid).toBe(true)
    }

    async testOfflineAuthenticationCode() {
        const nonce = 'MDEyMzQ1Njc4OWFiY2RlZg=='
        const authenticationCode = await withTimeout(
            this.sdk.offlineAuthenticationCode(this.credentials.knowledge, '/offline/code', nonce, '{}')
        )
        expect(authenticationCode).toBeDefined()
        expect(authenticationCode.length > 0).toBe(true)

        const legacyCode = await withTimeout(
            this.sdk.offlineSignature(this.credentials.knowledge, '/offline/legacy', nonce, '{}')
        )
        expect(legacyCode).toBeDefined()
        expect(legacyCode.length > 0).toBe(true)
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

    async testAdvancedDevicePublicKeys() {
        const algorithm = await this.sdk.currentAlgorithm
        const expectedTypes = algorithm === PowerAuthAlgorithm.P384_L3 || algorithm === PowerAuthAlgorithm.P384_L5
            ? [PowerAuthSignatureKeyType.EC, PowerAuthSignatureKeyType.ML_DSA]
            : [PowerAuthSignatureKeyType.EC]
        const derKeys = await this.sdk.exportDevicePublicKeys(PowerAuthDevicePublicKeyFormat.DER)
        const rawKeys = await this.sdk.exportDevicePublicKeys(PowerAuthDevicePublicKeyFormat.RAW)

        expect(derKeys.length).toBe(expectedTypes.length)
        expect(rawKeys.length).toBe(expectedTypes.length)
        expect(derKeys.map(key => key.keyType).sort()).toEqual([...expectedTypes].sort())
        expect(rawKeys.map(key => key.keyType).sort()).toEqual([...expectedTypes].sort())

        for (const type of expectedTypes) {
            const derKey = derKeys.find(key => key.keyType === type)
            const rawKey = rawKeys.find(key => key.keyType === type)
            if (!derKey || !rawKey) {
                throw new Error(`Missing exported ${type} device key`)
            }
            expect(derKey.keyAlgorithm).toBe(rawKey.keyAlgorithm)
            expect(derKey.keyAlgorithm.length > 0).toBe(true)
            expect(derKey.keyData.length > 0).toBe(true)
            expect(rawKey.keyData.length > 0).toBe(true)
            expect(derKey.keyData === rawKey.keyData).toBe(false)
        }
    }

    async testAdvancedDigitalSignature() {
        const data = btoa('signed payload')
        const signature = await this.sdk.calculateDigitalSignature(
            this.credentials.knowledge,
            data,
            PowerAuthSignatureKeyId.DEVICE_EC
        )
        await expect(async () => await this.sdk.verifyDigitalSignature(signature, data, PowerAuthSignatureKeyId.DEVICE_EC)).toSucceed()

        const decodedData = atob(data)
        const tamperedData = btoa(
            String.fromCharCode((decodedData.charCodeAt(0) + 1) % 256) + decodedData.slice(1)
        )
        await expect(async () => await this.sdk.verifyDigitalSignature(
            signature,
            tamperedData,
            PowerAuthSignatureKeyId.DEVICE_EC
        )).toThrow({ errorCode: PowerAuthErrorCode.WRONG_SIGNATURE })

        const decodedSignature = atob(signature)
        const tamperedSignature = btoa(
            String.fromCharCode((decodedSignature.charCodeAt(0) + 1) % 256) + decodedSignature.slice(1)
        )
        await expect(async () => await this.sdk.verifyDigitalSignature(
            tamperedSignature,
            data,
            PowerAuthSignatureKeyId.DEVICE_EC
        )).toThrow({ errorCode: PowerAuthErrorCode.WRONG_SIGNATURE })
    }

    async testAdvancedJwsSignature() {
        const data = 'signed payload'
        const dataBase64 = btoa(data)
        const compact = await this.sdk.calculateJwsSignature(
            this.credentials.knowledge,
            dataBase64,
            'JWT',
            true,
            PowerAuthSignatureKeyId.DEVICE_EC
        )
        const components = compact.split('.')
        expect(components.length).toBe(3)
        expect(JSON.parse(decodeBase64Url(components[0])).typ).toBe('JWT')
        expect(decodeBase64Url(components[1])).toBe(data)
        await expect(async () => await this.sdk.verifyJwsSignature(
            compact,
            true,
            true,
            PowerAuthSignatureKeyId.DEVICE_EC
        )).toSucceed()

        const tamperedPayload = encodeBase64Url('tampered payload')
        await expect(async () => await this.sdk.verifyJwsSignature(
            `${components[0]}.${tamperedPayload}.${components[2]}`,
            true,
            true,
            PowerAuthSignatureKeyId.DEVICE_EC
        )).toThrow({ errorCode: PowerAuthErrorCode.WRONG_SIGNATURE })

        const json = await this.sdk.calculateJwsSignature(
            this.credentials.knowledge,
            dataBase64,
            'application/powerauth-test',
            false,
            PowerAuthSignatureKeyId.DEVICE
        )
        expect(JSON.parse(json)).toBeDefined()
        await expect(async () => await this.sdk.verifyJwsSignature(
            json,
            false,
            true,
            PowerAuthSignatureKeyId.DEVICE
        )).toSucceed()
    }

    async testCertificateSigningRequest() {
        const csr = await this.sdk.createCertificateSigningRequest(
            this.credentials.knowledge,
            { CN: 'PowerAuth Integration Test', O: 'Wultra' },
            ['DNS: test.example.com', 'DNS: test2.example.com'],
            PowerAuthSignatureKeyId.DEVICE_EC
        )
        const lines = csr.trim().split('\n')
        expect(lines[0]).toBe('-----BEGIN CERTIFICATE REQUEST-----')
        expect(lines[lines.length - 1]).toBe('-----END CERTIFICATE REQUEST-----')
        const der = atob(lines.slice(1, -1).join(''))
        expect(der.length > 256).toBe(true)
        expect(der.charCodeAt(0)).toBe(0x30)
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

function encodeBase64Url(value: string): string {
    return btoa(value)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

function decodeBase64Url(value: string): string {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
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
