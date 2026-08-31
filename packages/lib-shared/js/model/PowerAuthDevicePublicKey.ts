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

import type { Base64String } from "../PowerAuthCryptoUtils";
import { PowerAuthSignatureKeyType } from "./PowerAuthSignatureKeyId";

/** Output format used when exporting device public keys. */
export enum PowerAuthDevicePublicKeyFormat {
    DER = "der",
    RAW = "raw"
}

/** Exported device public key data. */
export interface PowerAuthDevicePublicKeyData {
    /** Cryptographic type of the key. */
    keyType: PowerAuthSignatureKeyType
    /** Key algorithm name, such as `P-384` or `ML-DSA-65`. */
    keyAlgorithm: string
    /** Public key bytes encoded as a Base64 string. */
    keyData: Base64String
}
