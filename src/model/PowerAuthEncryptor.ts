/*
 * Copyright 2023 Wultra s.r.o.
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

import { NativeEncryptor } from "../internal/NativeEncryptor"
import { BaseNativeObject } from "./BaseNativeObject"
import { PowerAuthEncryptionHttpHeader } from "../index"
import { NativeWrapper } from "../internal/NativeWrapper"
import { PowerAuthDataFormat } from "./PowerAuthDataFormat"
import { NativeObject } from "../internal/NativeObject"

/**
 * Scope of encryptor.
 */
export type PowerAuthEncryptorScope = 'APPLICATION' | 'ACTIVATION'

/**
 * Interface representing encrypted data in request or response.
 */
export interface PowerAuthCryptogram {
    /**
     * Ephemeral public key, valid only for encrypted request.
     */
    readonly ephemeralPublicKey?: string
    /**
     * Encrypted data, valid for request and response.
     */
    readonly encryptedData: string
    /**
     * Message authenticated code, valid for request and response.
     */
    readonly mac: string
    /**
     * Nonce, valid for encrypted request.
     */
    readonly nonce?: string
}

/**
 * Object returned from the `encryptRequest()` function.
 */
export interface PowerAuthEncryptedRequestData {
    /**
     * Cryptogram with encrypted request data.
     */
    readonly cryptogram: PowerAuthCryptogram
    /**
     * HTTP request header. You must include this header to your HTTP request 
     * to properly decrypt the request data on the server.
     * 
     * If you plan to combine encryption with PowerAuth Symmetric Signature, then 
     * the header can be ommitted.
     */
    readonly header: PowerAuthEncryptionHttpHeader
    /**
     * Object that can decrypt encrypted response received from the server.
     */
    readonly decryptor: PowerAuthDecryptor
}

/**
 * Interface that implements End-To-End encryption. Use `PowerAuth` class to get instnace 
 * of properly scoped encryptor.
 */
export interface PowerAuthEncryptor {
    /**
     * Scope of this encryptor.
     */
    readonly encryptorScope: PowerAuthEncryptorScope
    /**
     * Determine whether encryptor can encrypt the request. 
     * 
     * The encryptor is reusable, so this method typically returns `true`, unless the parent
     * `PowerAuth` instance is deconfigured or has no longer valid activation (if activation scoped).
     */
    canEncryptRequest(): Promise<boolean>
    /**
     * Encrypt the request data.
     * @param body UTF8 encoded string to encrypt.
     * @returns Object containing encrypted data, HTTP header and decryptor for the response decryption.
     */
    encryptRequest(body: string): Promise<PowerAuthEncryptedRequestData>
    /**
     * Encrypt the request data.
     * @param body Data to encrypt. By default plain string is expected, but you can use `dataFormat` parameter to specify Base64 encoded string at input.
     * @param bodyFormat Specify encoding of `body` parameter. The default value is `UTF8`, so plain string is expected in `body` parameter.
     * @returns Object containing encrypted data, HTTP header and decryptor for the response decryption.
     */
    encryptRequest(body: string, bodyFormat: PowerAuthDataFormat): Promise<PowerAuthEncryptedRequestData>
    /**
     * Release underlying native object. You can still use the encryptor, because the native object is
     * re-created after the next call to `canEncryptRequest()` or `encryptRequest()` functions.
     */
    release(): Promise<void>
}

/**
 * Interface defining decryptor that is capable to decrypt encrypted response received from the server.
 * 
 * Be aware that the native underlying object has a limited lifetime set to 5 minutes. If you don't decrypt
 * the resposne within this time interval, then the information required for the request decryption is lost.
 */
export interface PowerAuthDecryptor {
    /**
     * Determine whether object is able to decrypt the response.
     */
    canDecryptResponse(): Promise<boolean>
    /**
     * Decrypt the response received from the server. The underlying native object is automatically released
     * after this call.
     * 
     * @param cryptogram Cryptogram containing encrypted response from the server.
     * @param outputDataFormat Data format expected at the output. If not used, then 'UTF8' is applied.
     */
    decryptResponse(cryptogram: PowerAuthCryptogram, outputDataFormat: PowerAuthDataFormat): Promise<string>

    /**
     * Decrypt response received from the server into plain string. The underlying native object is automatically 
     * released after this call.
     * @param cryptogram Cryptogram containing encrypted response from the server.
     */
    decryptResponse(cryptogram: PowerAuthCryptogram): Promise<string>
    /**
     * Release decryptor and its underlying native object.
     */
    release(): Promise<void>
}

/**
 * Class that implements End-To-End encryption. Use `PowerAuth` class to get instnace 
 * of properly scoped encryptor.
 */
export class PowerAuthEncryptorImpl extends BaseNativeObject implements PowerAuthEncryptor {

    canEncryptRequest(): Promise<boolean> {
        return this.withObjectId(objjectId => NativeEncryptor.canEncryptRequest(objjectId))
    }

    encryptRequest(body: string, bodyFormat: PowerAuthDataFormat = 'UTF8'): Promise<PowerAuthEncryptedRequestData> {
        return this.withObjectId(async (objectId) => {
            const result = await NativeEncryptor.encryptRequest(objectId, body, bodyFormat)
            return {
                cryptogram: result.cryptogram,
                header: result.header,
                decryptor: new PowerAuthDecryptorImpl(result.decryptorId)
            }
        })
    }

    /**
     * Scope of this encryptor.
     */
    readonly encryptorScope: PowerAuthEncryptorScope
    /**
     * Instance identifier of PowerAuth instance owning this encryptor.
     */
    private readonly powerAuthInstanceId: string
    /**
     * Autorelease time in ms.
     */
    private readonly autoreleaseTime: number

    /**
     * Construct encryptor object and specify its scope.
     * @param scope Scope of the encryptor.
     * @param powerAuthInstanceId Instance identifier of PowerAuth class owning this encryptor.
     * @param autoreleaseTime Autorelease timeout in milliseconds. The value is used only for the testing purposes, and is ignored in the release build of library.
     */
    constructor(
        scope: PowerAuthEncryptorScope, 
        powerAuthInstanceId: string, 
        autoreleaseTime: number = 0) {
        super()
        this.encryptorScope = scope
        this.powerAuthInstanceId = powerAuthInstanceId
        this.autoreleaseTime = autoreleaseTime
    }

    protected override onCreate(): Promise<string> {
        return NativeEncryptor.initialize(this.encryptorScope, this.powerAuthInstanceId, this.autoreleaseTime)
    }

    protected override onRelease(objectId: string): Promise<void> {
        return NativeEncryptor.release(objectId)
    }
}

/**
 * Internal implementation of `PowerAuthDecryptor`
 */
class PowerAuthDecryptorImpl implements PowerAuthDecryptor {

    canDecryptResponse(): Promise<boolean> {
        return this.withObjectId(async objectId => {
            if (await NativeObject.isValidNativeObject(objectId)) {
                return NativeEncryptor.canDecryptResponse(objectId)
            }
            return false
        })
    }

    decryptResponse(cryptogram: PowerAuthCryptogram): Promise<string>;
    decryptResponse(cryptogram: PowerAuthCryptogram, outputDataFormat: PowerAuthDataFormat): Promise<string>;
    decryptResponse(cryptogram: any, outputDataFormat?: any): Promise<string> {
        return this.withObjectId(objectId => NativeEncryptor.decryptResponse(objectId, cryptogram, outputDataFormat))
    }

    release(): Promise<void> {
        return this.withObjectId(objectId => NativeEncryptor.release(objectId))
    }

    constructor(private objectId: string) {}

    private async withObjectId<T>(action: (objectId: string) => Promise<T>): Promise<T> {
        try {
            return await action(this.objectId)
        } catch (error: any) {
            throw NativeWrapper.processException(error)
        }
    }
}
