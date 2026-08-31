//
// Copyright 2023 Wultra s.r.o.
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
import { PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_EncryptorTests extends TestWithActivation {

    override shouldCreateActivationBeforeTest(): boolean {
        return this.context.testName !== 'testApplicationScopeWithoutActivation'
    }

    async testApplicationScopeWithoutActivation() {
        expect(await this.sdk.hasValidActivation()).toBe(false)
        await expect(async () => await this.sdk.getEncryptorForActivationScope())
            .toThrow({ errorCode: PowerAuthErrorCode.MISSING_ACTIVATION })

        const encryptor = await this.sdk.getEncryptorForApplicationScope()
        try {
            expect(encryptor.scope).toBe('APPLICATION')
            expect(await encryptor.canEncryptRequest()).toBe(true)
            expect(await encryptor.canDecryptResponse()).toBe(false)

            const encrypted = await encryptor.encryptRequest(btoa('{}'))
            expect(encrypted.requestBody.length > 0).toBe(true)
            expect(encrypted.requestHeaders.length > 0).toBe(true)
            expect(await encryptor.canEncryptRequest()).toBe(false)
            expect(await encryptor.canDecryptResponse()).toBe(true)
        } finally {
            await encryptor.release()
        }
    }

    async testActivationScopedExchange() {
        const userId = this.helper.userId
        expect(userId).toBeDefined()
        const expectedUserInfo = this.helper.userInfo(userId!)
        const storeResult = await this.helper.fillUserInfo(expectedUserInfo)
        expect(storeResult.status).toBe('OK')

        for (let exchange = 0; exchange < 2; exchange++) {
            const encryptor = await this.sdk.getEncryptorForActivationScope()
            try {
                expect(encryptor.scope).toBe('ACTIVATION')
                expect(await encryptor.canEncryptRequest()).toBe(true)
                expect(await encryptor.canDecryptResponse()).toBe(false)

                const encrypted = await encryptor.encryptRequest(btoa('{}'))
                expect(encrypted.requestBody.length > 0).toBe(true)
                expect(encrypted.requestHeaders.length > 0).toBe(true)
                expect(await encryptor.canEncryptRequest()).toBe(false)
                expect(await encryptor.canDecryptResponse()).toBe(true)

                const headers = new Headers()
                encrypted.requestHeaders.forEach(header => headers.set(header.name, header.value))
                const responseBody = await this.helper.callRawSDKEndpoint(
                    'pa/v3/user/info',
                    encrypted.requestBody,
                    headers
                )
                const clearResponseBase64 = await encryptor.decryptResponse(responseBody)
                const userInfo = JSON.parse(atob(clearResponseBase64))
                expect(userInfo.sub).toEqual(expectedUserInfo.subject)

                await expect(async () => await encryptor.canEncryptRequest())
                    .toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
                await expect(async () => await encryptor.canDecryptResponse())
                    .toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
            } finally {
                await encryptor.release()
            }
        }
    }

    async testReleaseIsCachedAndIdempotent() {
        const encryptor = await this.sdk.getEncryptorForActivationScope()
        const firstRelease = encryptor.release()
        const secondRelease = encryptor.release()

        expect(firstRelease === secondRelease).toBe(true)

        await expect(async () => await encryptor.canEncryptRequest())
            .toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })

        await Promise.all([firstRelease, secondRelease])
        expect(encryptor.release() === firstRelease).toBe(true)

        await expect(async () => await encryptor.encryptRequest(btoa('{}')))
            .toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
    }

    async testDeconfigurationInvalidatesEncryptor() {
        const encryptor = await this.sdk.getEncryptorForActivationScope()
        expect(await encryptor.canEncryptRequest()).toBe(true)

        await this.sdk.deconfigure()

        await expect(async () => await encryptor.canEncryptRequest())
            .toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await encryptor.release()
    }

    async testFailurePaths() {
        let encryptor = await this.sdk.getEncryptorForActivationScope()
        try {
            await expect(async () => await encryptor.encryptRequest('not base64'))
                .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
            await expect(async () => await encryptor.decryptResponse(btoa('x')))
                .toThrow()
        } finally {
            await encryptor.release()
        }

        encryptor = await this.sdk.getEncryptorForActivationScope()
        try {
            await encryptor.encryptRequest(btoa('{}'))
            await expect(async () => await encryptor.decryptResponse('**??=='))
                .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        } finally {
            await encryptor.release()
        }

        encryptor = await this.sdk.getEncryptorForActivationScope()
        try {
            await encryptor.encryptRequest(btoa('{}'))
            await expect(async () => await encryptor.decryptResponse(btoa('not encrypted')))
                .toThrow()
            await expect(async () => await encryptor.canEncryptRequest())
                .toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        } finally {
            await encryptor.release()
        }
    }
}
