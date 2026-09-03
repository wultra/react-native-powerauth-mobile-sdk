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

    provideCustomConfig(): CustomConfig {
        return { algorithm: PowerAuthAlgorithm.P384_L3 }
    }

    async testDevicePublicKeys() {
        expect(await this.sdk.currentAlgorithm).toBe(PowerAuthAlgorithm.P384_L3)
        const expectedTypes = [PowerAuthSignatureKeyType.EC, PowerAuthSignatureKeyType.ML_DSA]
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

    async testMlDsaDigitalSignature() {
        const data = btoa('signed payload')
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

    async testMlDsaJwsSignature() {
        const data = 'signed payload'
        const dataBase64 = btoa(data)
        const compact = await this.sdk.calculateJwsSignature(
            this.credentials.knowledge,
            dataBase64,
            'JWT',
            true,
            PowerAuthSignatureKeyId.DEVICE_ML_DSA
        )
        const components = compact.split('.')
        expect(components.length).toBe(3)
        expect(JSON.parse(decodeBase64Url(components[0])).typ).toBe('JWT')
        expect(decodeBase64Url(components[1])).toBe(data)
        await expect(async () => await this.sdk.verifyJwsSignature(
            compact,
            true,
            true,
            PowerAuthSignatureKeyId.DEVICE_ML_DSA
        )).toSucceed()

        const tamperedPayload = encodeBase64Url('tampered payload')
        await expect(async () => await this.sdk.verifyJwsSignature(
            `${components[0]}.${tamperedPayload}.${components[2]}`,
            true,
            true,
            PowerAuthSignatureKeyId.DEVICE_ML_DSA
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

    async testMlDsaCertificateSigningRequest() {
        const csr = await this.sdk.createCertificateSigningRequest(
            this.credentials.knowledge,
            { CN: 'PowerAuth Integration Test', O: 'Wultra' },
            ['DNS: test.example.com', 'DNS: test2.example.com'],
            PowerAuthSignatureKeyId.DEVICE_ML_DSA
        )
        const lines = csr.trim().split('\n')
        expect(lines[0]).toBe('-----BEGIN CERTIFICATE REQUEST-----')
        expect(lines[lines.length - 1]).toBe('-----END CERTIFICATE REQUEST-----')
        const der = atob(lines.slice(1, -1).join(''))
        expect(der.length > 256).toBe(true)
        expect(der.charCodeAt(0)).toBe(0x30)
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
