/*
 * Copyright 2021 Wultra s.r.o.
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

import { NativeWrapper } from "./internal/NativeWrapper";

/**
 * The `PowerAuthActivationCodeUtil` provides various set of methods for parsing and validating
 * activation codes.
 *
 * Activation code format with an optional legacy signature suffix:
 * ```
 * code without signature:    CCCCC-CCCCC-CCCCC-CCCCC
 * code with signature:       CCCCC-CCCCC-CCCCC-CCCCC#BASE64_STRING_WITH_SIGNATURE
 * 
 * ```
 *
 * - Where the 'C' is Base32 sequence of characters, fully decodable into the sequence of bytes.
 *   The validator then compares CRC-16 checksum calculated for the first 10 bytes and compares
 *   it to last two bytes (in big endian order).
 * 
 */
export class PowerAuthActivationCodeUtil {

    /**
     * Parses an activation code which may contain a legacy signature suffix. The returned
     * `activationCode` has the suffix stripped. PowerAuth SDK 2.0 does not verify the suffix
     * and the activation process ignores it.
     *
     * The method doesn't perform an auto-correction, so the provided code must be valid.
     * 
     * @returns Activation code object
     * @throws error when not valid 
     */
    static parseActivationCode(activationCode: string): Promise<PowerAuthActivationCode> {
        return NativeWrapper.staticCall("parseActivationCode", activationCode);
    }

    /**
     * Returns true if |activationCode| is a valid activation code. The input code must not contain a signature part.
     * You can use this method to validate a whole user-typed activation code at once.
     */
    static validateActivationCode(activationCode: string): Promise<boolean> {
        return NativeWrapper.staticCall("validateActivationCode", activationCode);
    }

    /**
     * Returns true if |character| is a valid character allowed in the activation code.
     * The method strictly checks whether the character is from [A-Z2-7] characters range.
     */
    static validateTypedCharacter(character: number): Promise<boolean> {
        return NativeWrapper.staticCall("validateTypedCharacter", character);
    }

    /**
     * Validates an input |character| and throws if it's not valid or cannot be corrected.
     * The returned value contains the same input character, or the corrected one.
     * You can use this method for validation & auto-correction of just typed characters.
     * 
     * The function performs following auto-corections:
     * - lowercase characters are corrected to uppercase (e.g. 'a' will be corrected to 'A')
     * - '0' is corrected to 'O'
     * - '1' is corrected to 'I'
     */
    static correctTypedCharacter(character: number): Promise<number> {
        return NativeWrapper.staticCall("correctTypedCharacter", character);
    }
}

/**
 The `PowerAuthActivationCode` object contains parsed components from a user-provided activation code.
 You can use methods from `PowerAuthActivationCodeUtil` class to fill this object with valid data.
 */
export interface PowerAuthActivationCode {
    /**
     * Contains just the activation code, without a signature part.
     */
    activationCode: string;
    /**
     * Legacy signature suffix parsed from the input, if present.
     *
     * PowerAuth SDK 2.0 does not verify this value and the activation process ignores it.
     */
    activationSignature?: string;
}
