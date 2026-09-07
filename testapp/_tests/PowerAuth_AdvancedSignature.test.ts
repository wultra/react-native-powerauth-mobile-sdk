/*
 * Copyright 2026 Wultra s.r.o.
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

import {
    PowerAuthAlgorithm,
    PowerAuthDevicePublicKeyFormat,
    PowerAuthErrorCode,
    PowerAuthSignatureKeyId,
    PowerAuthSignatureKeyType
} from "react-native-powerauth-mobile-sdk"
import { expect } from "mobile-testbed"
import type { CustomConfig } from "../src/IntegrationUtils"
import { TestWithActivation } from "./helpers/TestWithActivation"

export class PowerAuth_AdvancedSignatureTests extends TestWithActivation {

    constructor(suiteName?: string, private readonly signatureAlgorithm: PowerAuthAlgorithm = PowerAuthAlgorithm.P384_L3) {
        super(suiteName)
    }

    provideCustomConfig(): CustomConfig {
        return { algorithm: this.signatureAlgorithm }
    }

    private get supportsMlDsa(): boolean {
        return this.signatureAlgorithm === PowerAuthAlgorithm.P384_L3 || this.signatureAlgorithm === PowerAuthAlgorithm.P384_L5
    }

    async testEcDigitalSignature() {
        const data = btoa('EC algorithm matrix payload')
        const signature = await this.sdk.calculateDigitalSignature(this.credentials.knowledge, data, PowerAuthSignatureKeyId.DEVICE_EC)
        await this.sdk.verifyDigitalSignature(signature, data, PowerAuthSignatureKeyId.DEVICE_EC)
        await expect(async () => this.sdk.verifyDigitalSignature(signature, btoa('different payload'), PowerAuthSignatureKeyId.DEVICE_EC))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_SIGNATURE })
    }

    async testDevicePublicKeys() {
        expect(await this.sdk.currentAlgorithm).toBe(this.signatureAlgorithm)
        const expectedTypes = this.supportsMlDsa ? [PowerAuthSignatureKeyType.EC, PowerAuthSignatureKeyType.ML_DSA] : [PowerAuthSignatureKeyType.EC]
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
            const expectedAlgorithm = type === PowerAuthSignatureKeyType.EC
                ? (this.signatureAlgorithm === PowerAuthAlgorithm.LEGACY ? 'P-256' : 'P-384')
                : (this.signatureAlgorithm === PowerAuthAlgorithm.P384_L5 ? 'ML-DSA-87' : 'ML-DSA-65')
            expect(derKey.keyAlgorithm).toBe(expectedAlgorithm)
            expect(rawKey.keyAlgorithm).toBe(expectedAlgorithm)
            expect(derKey.keyData.length > 0).toBe(true)
            expect(rawKey.keyData.length > 0).toBe(true)
            expect(derKey.keyData === rawKey.keyData).toBe(false)
        }
    }

    async testMlDsaDigitalSignature() {
        const data = btoa('signed payload')
        if (!this.supportsMlDsa) {
            await expect(async () => this.sdk.calculateDigitalSignature(this.credentials.knowledge, data, PowerAuthSignatureKeyId.DEVICE_ML_DSA))
                .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
            return
        }
        const signature = await this.sdk.calculateDigitalSignature(
            this.credentials.knowledge,
            data,
            PowerAuthSignatureKeyId.DEVICE_ML_DSA
        )
        await expect(async () => await this.sdk.verifyDigitalSignature(
            signature,
            data,
            PowerAuthSignatureKeyId.DEVICE_ML_DSA
        )).toSucceed()

        const decodedData = atob(data)
        const tamperedData = btoa(
            String.fromCharCode((decodedData.charCodeAt(0) + 1) % 256) + decodedData.slice(1)
        )
        await expect(async () => await this.sdk.verifyDigitalSignature(
            signature,
            tamperedData,
            PowerAuthSignatureKeyId.DEVICE_ML_DSA
        )).toThrow({ errorCode: PowerAuthErrorCode.WRONG_SIGNATURE })

        const decodedSignature = atob(signature)
        const tamperedSignature = btoa(
            String.fromCharCode((decodedSignature.charCodeAt(0) + 1) % 256) + decodedSignature.slice(1)
        )
        await expect(async () => await this.sdk.verifyDigitalSignature(
            tamperedSignature,
            data,
            PowerAuthSignatureKeyId.DEVICE_ML_DSA
        )).toThrow({ errorCode: PowerAuthErrorCode.WRONG_SIGNATURE })
    }

    async testJwsSignature() {
        if (!this.supportsMlDsa) {
            await expect(async () => this.sdk.calculateJwsSignature(this.credentials.knowledge, btoa('payload'), 'JWT', true, PowerAuthSignatureKeyId.DEVICE_ML_DSA))
                .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        }
        const data = 'signed payload'
        const dataBase64 = btoa(data)
        for (const keyId of [PowerAuthSignatureKeyId.DEVICE_EC, ...(this.supportsMlDsa ? [PowerAuthSignatureKeyId.DEVICE_ML_DSA] : [])]) {
            const compact = await this.sdk.calculateJwsSignature(
                this.credentials.knowledge,
                dataBase64,
                'JWT',
                true,
                keyId
            )
            const components = compact.split('.')
            expect(components.length).toBe(3)
            expect(JSON.parse(decodeBase64Url(components[0])).typ).toBe('JWT')
            expect(decodeBase64Url(components[1])).toBe(data)
            await expect(async () => await this.sdk.verifyJwsSignature(
                compact,
                true,
                true,
                keyId
            )).toSucceed()

            const tamperedPayload = encodeBase64Url('tampered payload')
            await expect(async () => await this.sdk.verifyJwsSignature(
                `${components[0]}.${tamperedPayload}.${components[2]}`,
                true,
                true,
                keyId
            )).toThrow({ errorCode: PowerAuthErrorCode.WRONG_SIGNATURE })
        }

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
        if (!this.supportsMlDsa) {
            await expect(async () => this.sdk.createCertificateSigningRequest(this.credentials.knowledge, { CN: 'PowerAuth Test' }, [], PowerAuthSignatureKeyId.DEVICE_ML_DSA))
                .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        }
        for (const keyId of [PowerAuthSignatureKeyId.DEVICE_EC, ...(this.supportsMlDsa ? [PowerAuthSignatureKeyId.DEVICE_ML_DSA] : [])]) {
            const csr = await this.sdk.createCertificateSigningRequest(
                this.credentials.knowledge,
                { CN: 'PowerAuth Integration Test', O: 'Wultra' },
                ['DNS: test.example.com', 'DNS: test2.example.com'],
                keyId
            )
            const lines = csr.trim().split('\n')
            expect(lines[0]).toBe('-----BEGIN CERTIFICATE REQUEST-----')
            expect(lines[lines.length - 1]).toBe('-----END CERTIFICATE REQUEST-----')
            const der = atob(lines.slice(1, -1).join(''))
            expect(der.length > (keyId === PowerAuthSignatureKeyId.DEVICE_EC ? 128 : 256)).toBe(true)
            expect(der.charCodeAt(0)).toBe(0x30)
        }
    }
}

function encodeBase64Url(value: string): string {
    return btoa(value)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/[=]+$/, '')
}

function decodeBase64Url(value: string): string {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    return atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
}
