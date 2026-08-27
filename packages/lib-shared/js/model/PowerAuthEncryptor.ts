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
import { NativeObjectHandle } from "../internal/NativeObjectHandle"
import { BaseReleasableObject } from "./BaseNativeObject"
import { PowerAuthHttpHeader } from "./PowerAuthClientConfiguration"

/** Scope of an end-to-end encryptor. */
export type PowerAuthEncryptorScope = 'APPLICATION' | 'ACTIVATION'

/** Encrypted HTTP request produced by `PowerAuthEncryptor`. */
export interface PowerAuthEncryptedRequest {
    /** Serialized encrypted HTTP request body encoded as a UTF-8 string. */
    readonly requestBody: string
    /** HTTP headers that must accompany `requestBody`. */
    readonly requestHeaders: ReadonlyArray<PowerAuthHttpHeader>
}

/**
 * A stateful, single-use end-to-end encryptor.
 *
 * The same instance encrypts one request and decrypts its response. Acquire a fresh encryptor
 * for every additional HTTP exchange and call `release()` in a `finally` block.
 */
export interface PowerAuthEncryptor extends BaseReleasableObject {
    /** Scope used to acquire this encryptor. */
    readonly scope: PowerAuthEncryptorScope

    /** Returns whether this instance can encrypt a request. */
    canEncryptRequest(): Promise<boolean>

    /** Returns whether this instance can decrypt a response. */
    canDecryptResponse(): Promise<boolean>

    /**
     * Encrypts an optional request body.
     * @param requestBodyBase64 Clear request body encoded as a Base64 string, or `undefined` for an empty body.
     */
    encryptRequest(requestBodyBase64?: string): Promise<PowerAuthEncryptedRequest>

    /**
     * Decrypts the serialized encrypted HTTP response body.
     *
     * The encryptor is consumed after this attempt, whether decryption succeeds or fails.
     * @param responseBody Encrypted HTTP response body encoded as a UTF-8 string.
     * @returns Clear response body encoded as a Base64 string.
     */
    decryptResponse(responseBody: string): Promise<string>
}

/** Internal platform-backed implementation of `PowerAuthEncryptor`. */
export class PowerAuthEncryptorImpl implements PowerAuthEncryptor {
    private readonly handle: NativeObjectHandle

    private constructor(
        public readonly scope: PowerAuthEncryptorScope,
        objectId: string
    ) {
        this.handle = new NativeObjectHandle(objectId)
    }

    static async acquire(
        scope: PowerAuthEncryptorScope,
        powerAuthInstanceId: string
    ): Promise<PowerAuthEncryptor> {
        const objectId = await NativeEncryptor.initialize(scope, powerAuthInstanceId)
        return new PowerAuthEncryptorImpl(scope, objectId)
    }

    canEncryptRequest(): Promise<boolean> {
        return this.handle.withObjectId(objectId => NativeEncryptor.canEncryptRequest(objectId))
    }

    canDecryptResponse(): Promise<boolean> {
        return this.handle.withObjectId(objectId => NativeEncryptor.canDecryptResponse(objectId))
    }

    encryptRequest(requestBodyBase64?: string): Promise<PowerAuthEncryptedRequest> {
        return this.handle.withObjectId(objectId => NativeEncryptor.encryptRequest(objectId, requestBodyBase64))
    }

    async decryptResponse(responseBody: string): Promise<string> {
        try {
            return await this.handle.withObjectId(objectId => NativeEncryptor.decryptResponse(objectId, responseBody))
        } finally {
            await this.release()
        }
    }

    release(): Promise<void> {
        return this.handle.release(objectId => NativeEncryptor.release(objectId))
    }
}
