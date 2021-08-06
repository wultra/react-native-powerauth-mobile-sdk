/**
 * The `PowerAuthActivationCodeUtil` provides various set of methods for parsing and validating
 * activation or recovery codes.
 *
 * Current format:
 * ```
 * code without signature:    CCCCC-CCCCC-CCCCC-CCCCC
 * code with signature:       CCCCC-CCCCC-CCCCC-CCCCC#BASE64_STRING_WITH_SIGNATURE
 *
 * recovery code:             CCCCC-CCCCC-CCCCC-CCCCC
 * recovery code from QR:     R:CCCCC-CCCCC-CCCCC-CCCCC
 *
 * recovery PUK:              DDDDDDDDDD
 * ```
 *
 * - Where the 'C' is Base32 sequence of characters, fully decodable into the sequence of bytes.
 *   The validator then compares CRC-16 checksum calculated for the first 10 bytes and compares
 *   it to last two bytes (in big endian order).
 *
 * - Where the 'D' is digit (0 - 9)
 *
 * As you can see, both activation and recovery codes, shares the same basic principle (like CRC16
 * checksum). That's why parser returns the same `PowerAuthOtp` object for both scenarios.
 */
export declare class PowerAuthActivationCodeUtil {
    /**
     * Parses an input |activationCode| (which may or may not contain an optional signature) and returns PowerAuthOtp
     * object filled with valid data. The method doesn't perform an auto-correction, so the provided code must be valid.
     *
     * @return Activation code object
     * @throws error when not valid
     */
    static parseActivationCode(activationCode: string): Promise<PowerAuthActivationCode>;
    /**
     * Parses an input |recoveryCode| (which may or may not contain an optional "R:" prefix) and returns PowerAuthOtp
     * object filled with valid data. The method doesn't perform an auto-correction, so the provided code must be valid.
     *
     * @return Activation code object
     * @throws error when not valid
     */
    static parseRecoveryCode(recoveryCode: string): Promise<PowerAuthActivationCode>;
    /**
     * Returns true if |activationCode| is a valid activation code. The input code must not contain a signature part.
     * You can use this method to validate a whole user-typed activation code at once.
     */
    static validateActivationCode(activationCode: string): Promise<boolean>;
    /**
     * Returns true if |recoveryCode| is a valid recovery code. You can use this method to validate
     * a whole user-typed recovery code at once. The input code may contain "R:" prefix, if code is scanned from QR code.
     */
    static validateRecoveryCode(recoveryCode: string): Promise<boolean>;
    /**
     * Returns true if |puk| appears to be valid. You can use this method to validate
     * a whole user-typed recovery PUK at once. In current version, only 10 digits long string is considered as a valid PUK.
     */
    static validateRecoveryPuk(puk: string): Promise<boolean>;
    /**
     * Returns true if |character| is a valid character allowed in the activation or recovery code.
     * The method strictly checks whether the character is from [A-Z2-7] characters range.
     */
    static validateTypedCharacter(character: number): Promise<boolean>;
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
    static correctTypedCharacter(character: number): Promise<number>;
}
/**
 The `PowerAuthActivationCode` object contains parsed components from user-provided activation, or recovery
 code. You can use methods from `PowerAuthActivationCodeUtil` class to fill this object with valid data.
 */
export interface PowerAuthActivationCode {
    /**
     * If object is constructed from an activation code, then property contains just a code, without a signature part.
     * If object is constructed from a recovery code, then property contains just a code, without an optional "R:" prefix.
     */
    activationCode: string;
    /**
     * Signature calculated from activationCode. The value is typically optional for cases,
     * when the user re-typed activation code manually.
     *
     * If object is constructed from a recovery code, then the activation signature part is always empty.
     */
    activationSignature: string;
}
