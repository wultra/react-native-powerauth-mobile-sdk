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

import type { Base64String } from "../PowerAuthCryptoUtils"
import { NativeObjectHandle } from "../internal/NativeObjectHandle"
import { NativeWrapper } from "../internal/NativeWrapper"
import { BaseReleasableObject } from "./BaseNativeObject"
import { PowerAuthError, PowerAuthErrorCode } from "./PowerAuthError"

/** Identifies a base key available from the protocol-4 Secure Vault. */
export enum PowerAuthSecureVaultKeyId {
    /** Available after successful possession and knowledge authentication. */
    KNOWLEDGE = "knowledge",
    /** Available after any successful two-factor authentication. */
    KNOWLEDGE_OR_BIOMETRY = "knowledgeOrBiometry"
}

/**
 * A protocol-4 Secure Vault base key that can derive purpose-specific keys.
 *
 * The sensitive base key remains on the native side. Call `release()` as soon as
 * all required keys have been derived.
 */
export class PowerAuthSecureVaultKey implements BaseReleasableObject {
    private readonly handle: NativeObjectHandle

    private constructor(
        /** Identifier of this Secure Vault base key. */
        public readonly keyIdentifier: PowerAuthSecureVaultKeyId,
        objectId: string
    ) {
        this.handle = new NativeObjectHandle(objectId)
    }

    /** @internal Creates a wrapper for an already-fetched native Secure Vault key. */
    static fromNative(
        keyIdentifier: PowerAuthSecureVaultKeyId,
        objectId: string
    ): PowerAuthSecureVaultKey {
        return new PowerAuthSecureVaultKey(keyIdentifier, objectId)
    }

    /**
     * Derives a purpose-specific key.
     *
     * @param index Non-negative safe integer identifying the derived key.
     * @param keySize Size of the derived key in bytes. The minimum is 16 bytes.
     * @returns Derived key bytes encoded as a Base64 string.
     */
    async deriveKey(index: number, keySize: number): Promise<Base64String> {
        // Validate in JS like Flutter's Dart checks. `number` is not an integer type, so also
        // require safe integers and a keySize upper bound that fits a 32-bit signed native size.
        if (!Number.isSafeInteger(index) || index < 0 ||
            !Number.isSafeInteger(keySize) || keySize < 16 || keySize > 0x7fffffff) {
            throw new PowerAuthError(
                undefined,
                "Make sure that the Secure Vault key index is a non-negative safe integer and the derived key size is an integer between 16 and 2147483647 bytes.",
                PowerAuthErrorCode.WRONG_PARAMETER
            )
        }
        return await this.handle.withObjectId(objectId =>
            NativeWrapper.thisCall("deriveSecureVaultKey", objectId, index, keySize)
        )
    }

    /** Releases the underlying native Secure Vault base key. */
    release(): Promise<void> {
        return this.handle.release()
    }
}
