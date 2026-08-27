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

import { NativeModulesProvider } from "./NativeModulesProvider"
import { PowerAuthEncryptedRequest } from "../model/PowerAuthEncryptor"

/** Encryptor interface implemented by the native bridge. */
export interface PowerAuthEncryptorIfc {
    /** Acquires and registers one native encryptor. */
    initialize(scope: string, ownerId: string): Promise<string>

    /** Releases the native encryptor. Repeated release is safe. */
    release(encryptorId: string): Promise<void>

    /** Returns whether the native encryptor can encrypt a request. */
    canEncryptRequest(encryptorId: string): Promise<boolean>

    /** Encrypts an optional Base64-encoded request body. */
    encryptRequest(encryptorId: string, requestBodyBase64: string | undefined): Promise<PowerAuthEncryptedRequest>

    /** Returns whether the native encryptor can decrypt a response. */
    canDecryptResponse(encryptorId: string): Promise<boolean>

    /** Decrypts a serialized UTF-8 encrypted response body to Base64-encoded bytes. */
    decryptResponse(encryptorId: string, responseBody: string): Promise<string>
}

export const NativeEncryptor = NativeModulesProvider.PowerAuthEncryptor;
