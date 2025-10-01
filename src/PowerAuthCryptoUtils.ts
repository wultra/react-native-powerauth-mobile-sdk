import {NativeWrapper} from "./internal/NativeWrapper";
import {NativeCryptoUtils} from "./internal/NativeCryptoUtils";

/**
 * Typealias for Base64 encoded string.
 * This type emphasizes the fact that we expect Base64 encoded string.
 */
export type Base64String = string;

export class PowerAuthCryptoUtils {

    /**
     * Hashes given data using SHA-256 algorithm.
     * @param data String data encoded in Base64 format.
     * @returns Hashed data in Base64 format
     * @throws `PowerAuthErrorCode.WRONG_PARAMETER` if data is not Base64 encoded.
     */
    static async hashSha256(data: Base64String): Promise<Base64String> {
        try {
            return await NativeCryptoUtils.hashSha256(data);
        } catch (error) {
            throw NativeWrapper.processException(error)
        }
    }

    /**
     * Generates random bytes.
     * @param length Number of bytes to generate.
     * @returns Random bytes in Base64 format.
     */
    static async randomBytes(length: number): Promise<Base64String> {
        try {
            return await NativeCryptoUtils.randomBytes(length);
        } catch (error) {
            throw NativeWrapper.processException(error)
        }
    }
}