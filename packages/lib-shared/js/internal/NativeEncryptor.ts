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
import { PowerAuthCryptogram } from "../model/PowerAuthEncryptor"
import { PowerAuthEncryptionHttpHeader } from "../model/PowerAuthEncryptionHttpHeader"

/**
 * Data returned from encryptRequest() function.
 */
export interface EncryptedRequestData {
    /**
     * Cryptogram that must be set to request body.
     */
    cryptogram: PowerAuthCryptogram
    /**
     * HTTP header indicating the encryption.
     */
    header: PowerAuthEncryptionHttpHeader
    /**
     * Identifier of newly created native object that is capable 
     * to decrypt the response.
     */
    decryptorId: string
}

/**
 * Encryptor interface implemented in the native code.
 */
export interface PowerAuthEncryptorIfc {
    /**
     * Create native encryptor and return identifier of the underlying native object.
     * @param scope Scope of the encryptor.
     * @param ownerId Instance identifier of parent PowerAuth class.
     * @param autoreleaseTime Defines autorelease timeout in milliseconds. The value is used only for the testing purposes, and is ignored in the release build of library.
     * @returns Native object identifier.
     */
    initialize(scope: string, ownerId: string, autoreleaseTime: number): Promise<string>

    /**
     * Release underlying object manually.
     * @param encryptorId Native object identifier.
     */
    release(encryptorId: string): Promise<void>

    /**
     * Test whether encryptor supports encryption.
     * @param encryptorId Native object identifier.
     */
    canEncryptRequest(encryptorId: string): Promise<boolean>

    /**
     * Encrypt request body and return data containing all information for the request construction.
     * @param encryptorId Native object identifier.
     * @param data Data to encrypt.
     * @param format Data encoding. See `PowerAuthDataFormat` type for options. 
     */
    encryptRequest(encryptorId: string, data: string | undefined, format: string | undefined): Promise<EncryptedRequestData>

    /**
     * Test whether encryptor supports response decryption.
     * @param encryptorId Native object identifier.
     */
    canDecryptResponse(encryptorId: string): Promise<boolean>

    /**
     * Decrypt response cryptogram.
     * @param encryptorId Native object identifier.
     * @param cryptogram Cryptogram to decrypt.
     * @param outputFormat Data encoding. See `PowerAuthDataFormat` type for options. 
     */
    decryptResponse(encryptorId: string, cryptogram: PowerAuthCryptogram, outputFormat: string | undefined): Promise<string>
}

export const NativeEncryptor = NativeModulesProvider.PowerAuthEncryptor;