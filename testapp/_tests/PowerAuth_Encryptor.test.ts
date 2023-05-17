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

import { expect } from "../src/testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";
import { PowerAuthCryptogram, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { Buffer } from 'buffer'

export class PowerAuth_EncryptorTests extends TestWithActivation {

    override shouldCreateActivationBeforeTest(): boolean {
        const n = this.context.testName
        return !(n == 'testEncryptorWithoutActivation')
    }

    async testEncryptorWithoutActivation() {
        expect(await this.sdk.hasValidActivation()).toBe(false)
        const activationScoped = this.sdk.getEncryptorForActivationScope()
        expect(await activationScoped.canEncryptRequest()).toBe(false)

        const applicationScoped = this.sdk.getEncryptorForApplicationScope()
        expect(await applicationScoped.canEncryptRequest()).toBe(true)

        await expect(async () => await activationScoped.encryptRequest("{}")).toThrow({ errorCode: PowerAuthErrorCode.MISSING_ACTIVATION })
        await expect(async () => await applicationScoped.encryptRequest("{}")).toBeDefined()
    }

    async testActivationScopedEncryption_Default() {
        // Acquire encryptor
        const encryptor = this.sdk.getEncryptorForActivationScope()
        expect(encryptor.encryptorScope).toBe('ACTIVATION')

        for (let i = 1; i <= 2; i++) {
            // Encrypt request
            expect(await encryptor.canEncryptRequest()).toBe(true)
            const requestData = '{}'
            const encrypted = await encryptor.encryptRequest(requestData)
            const decryptor = encrypted.decryptor
            expect(encrypted.cryptogram).toBeDefined()
            expect(encrypted.header).toBeDefined()
            expect(decryptor).toBeDefined()
            expect(decryptor.decryptorScope).toBe(encryptor.encryptorScope)
            expect(await decryptor.canDecryptResponse()).toBe(true)

            // Let's use "user info" service for the test.
            const headers = new Headers([[encrypted.header.key, encrypted.header.value]])
            const response = await this.helper.httpClient.post('/pa/v3/user/info', JSON.stringify(encrypted.cryptogram), headers)
            expect(await decryptor.canDecryptResponse()).toBe(true)

            // Decrypt response
            const decrypted = await decryptor.decryptResponse(response as PowerAuthCryptogram)
            expect(decrypted).toBeDefined()
            const decryptedObject = JSON.parse(decrypted)

            // Response contains 'sub' key which should be equal to user-id
            expect(decryptedObject.sub).toEqual(this.activation.userId)
            expect(await decryptor.canDecryptResponse()).toBe(false)
        }
    }

    async testActivationScopedEncryption_StringFormat() {
        // Acquire encryptor
        const encryptor = this.sdk.getEncryptorForActivationScope()
        expect(encryptor.encryptorScope).toBe('ACTIVATION')

        for (let i = 1; i <= 2; i++) {
            // Encrypt request
            expect(await encryptor.canEncryptRequest()).toBe(true)
            const requestData = '{}'
            const encrypted = await encryptor.encryptRequest(requestData, "UTF8")
            const decryptor = encrypted.decryptor
            expect(encrypted.cryptogram).toBeDefined()
            expect(encrypted.header).toBeDefined()
            expect(decryptor).toBeDefined()
            expect(decryptor.decryptorScope).toBe(encryptor.encryptorScope)
            expect(await decryptor.canDecryptResponse()).toBe(true)

            // Let's use "user info" service for the test.
            const headers = new Headers()
            headers.set(encrypted.header.key, encrypted.header.value)
            const response = await this.helper.httpClient.post('/pa/v3/user/info', JSON.stringify(encrypted.cryptogram), headers)
            expect(await decryptor.canDecryptResponse()).toBe(true)

            // Decrypt response
            const decrypted = await decryptor.decryptResponse(response as PowerAuthCryptogram, "UTF8")
            expect(decrypted).toBeDefined()
            const decryptedObject = JSON.parse(decrypted)

            // Response contains 'sub' key which should be equal to user-id
            expect(decryptedObject.sub).toEqual(this.activation.userId)
            expect(await decryptor.canDecryptResponse()).toBe(false)
        }
    }

    async testActivationScopedEncryption_Base64Format() {
        // Acquire encryptor
        const encryptor = this.sdk.getEncryptorForActivationScope()
        expect(encryptor.encryptorScope).toBe('ACTIVATION')

        for (let i = 1; i <= 2; i++) {
            // Encrypt request
            expect(await encryptor.canEncryptRequest()).toBe(true)
            const data = Buffer.from("{}").toString('utf8')
            const encrypted = await encryptor.encryptRequest(data, 'BASE64')
            const decryptor = encrypted.decryptor
            expect(encrypted.cryptogram).toBeDefined()
            expect(encrypted.header).toBeDefined()
            expect(decryptor).toBeDefined()
            expect(decryptor.decryptorScope).toBe(encryptor.encryptorScope)
            expect(await decryptor.canDecryptResponse()).toBe(true)
    
            // Let's use "user info" service for the test
            const headers = new Headers()
            headers.set(encrypted.header.key, encrypted.header.value)
            const response = await this.helper.httpClient.post('/pa/v3/user/info', JSON.stringify(encrypted.cryptogram), headers)
            expect(await decryptor.canDecryptResponse()).toBe(true)
    
            // Decrypt response
            const decrypted = await decryptor.decryptResponse(response as PowerAuthCryptogram, 'BASE64')
            expect(decrypted).toBeDefined()
            const decryptedObject = JSON.parse(Buffer.from(decrypted, 'base64').toString('utf8'))
            expect(decryptedObject.sub).toEqual(this.activation.userId)
    
            expect(await decryptor.canDecryptResponse()).toBe(false)    
        }
    }

    async testReleaseEncryptorAndDecryptor() {
        // Acquire encryptor
        const encryptor = this.sdk.getEncryptorForActivationScope()
        expect(encryptor.encryptorScope).toBe('ACTIVATION')

        // Encrypt request
        expect(await encryptor.canEncryptRequest()).toBe(true)

        const data = Buffer.from("{}").toString('utf8')
        const encrypted = await encryptor.encryptRequest(data, 'BASE64')
        const decryptor = encrypted.decryptor
        expect(encrypted.cryptogram).toBeDefined()
        expect(encrypted.header).toBeDefined()
        expect(decryptor).toBeDefined()
        expect(await decryptor.canDecryptResponse()).toBe(true)

        await decryptor.release()
        expect(await decryptor.canDecryptResponse()).toBe(false)
        await encryptor.release()
        // POlling for the state automatically restore the native object.
        expect(await encryptor.canEncryptRequest()).toBe(true)

        // Remove activation also deactivate the encryptor
        await this.sdk.removeActivationWithAuthentication(this.credentials.knowledge)
        expect(await encryptor.canEncryptRequest()).toBe(false)
   }

   async testEncryptorAfterActivationRemove() {
        // Acquire encryptor
        const encryptor = this.sdk.getEncryptorForActivationScope()
        expect(encryptor.encryptorScope).toBe('ACTIVATION')

        // Encrypt request
        expect(await encryptor.canEncryptRequest()).toBe(true)

        const data = Buffer.from("{}").toString('utf8')
        const encrypted = await encryptor.encryptRequest(data, 'BASE64')
        const decryptor = encrypted.decryptor
        expect(encrypted.cryptogram).toBeDefined()
        expect(encrypted.header).toBeDefined()
        expect(decryptor).toBeDefined()
        expect(await decryptor.canDecryptResponse()).toBe(true)

        await this.sdk.removeActivationLocal()
        expect(await encryptor.canEncryptRequest()).toBe(false)
        expect(await decryptor.canDecryptResponse()).toBe(false)
    }

   async testEncryptorAfterDeconfigure() {
        // Acquire encryptor
        const encryptor = this.sdk.getEncryptorForActivationScope()
        expect(encryptor.encryptorScope).toBe('ACTIVATION')

        // Encrypt request
        expect(await encryptor.canEncryptRequest()).toBe(true)

        const data = Buffer.from("{}").toString('utf8')
        const encrypted = await encryptor.encryptRequest(data, 'BASE64')
        const decryptor = encrypted.decryptor
        expect(encrypted.cryptogram).toBeDefined()
        expect(encrypted.header).toBeDefined()
        expect(decryptor).toBeDefined()
        expect(await decryptor.canDecryptResponse()).toBe(true)

        const configuration = this.sdk.configuration
        expect(configuration).toBeDefined()

        await this.sdk.deconfigure()
        expect(await encryptor.canEncryptRequest()).toBe(false)
        expect(await decryptor.canDecryptResponse()).toBe(false)

        // Encryptor can be used after re-configure
        await this.sdk.configure(configuration!)
        expect(await encryptor.canEncryptRequest()).toBe(true)
        expect(await decryptor.canDecryptResponse()).toBe(false)
   }
}