import { TestWithActivation } from "./helpers/TestWithActivation";

import { PowerAuthCryptoUtils, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";
import { Buffer } from "buffer";

const b64FromUtf8 = (text: string): string =>
    Buffer.from(text, 'utf8').toString('base64')

const b64DecodeLength = (b64: string): number =>
    Buffer.from(b64, 'base64').length

const b64ToUintArray = (b64: string): Uint8Array =>
    Uint8Array.from(atob(b64), c => c.charCodeAt(0));

const isValidBase64 = (b64: string): boolean => {
    try {
        // Buffer throws for invalid base64 in RN polyfill as well
        Buffer.from(b64, 'base64');
        return true;
    } catch (_) {
        return false;
    }
}

export class PowerAuth_CryptoUtilsTest extends TestWithActivation {
    shouldCreateActivationBeforeTest(): boolean {
        return false;
    }

    async testHashSha256() {
        // 1) Empty input (valid Base64 for empty data)
        const emptyInput = "";
        const emptyHash = await PowerAuthCryptoUtils.hashSha256(emptyInput);
        // SHA-256("") in Base64
        const expectedEmptyHash = "47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=";
        expect(emptyHash).toBe(expectedEmptyHash);
        expect(isValidBase64(emptyHash)).toBe(true);
        expect(b64DecodeLength(emptyHash)).toBe(32);

        // 2) Known vector
        const wInput = b64FromUtf8("wultra rocks");
        const wHash = await PowerAuthCryptoUtils.hashSha256(wInput);
        const expectedWHash = "/hFLZ1UzxfJcifyyw0ekDS+vSACr0OdBnXDN8Y5JPlo="; // SHA-256("wultra rocks")
        expect(wHash).toBe(expectedWHash);
        expect(b64DecodeLength(wHash)).toBe(32);

        // 3) Determinism
        expect(await PowerAuthCryptoUtils.hashSha256(wInput)).toBe(wHash);

        // 4) Different inputs produce different hashes
        const abInput = b64FromUtf8("ab");
        const abHash = await PowerAuthCryptoUtils.hashSha256(abInput);
        expect(abHash).toNotBe(wHash);

        // 5) Padding boundaries: 1, 2, 3, 4, 5 bytes of input
        const testLengths = [1, 2, 3, 4, 5, 30, 31, 32, 33, 127, 128, 1024];
        let previousHash: string | undefined = undefined;
        for (const len of testLengths) {
            const bytes = Buffer.alloc(len);
            // Fill bytes deterministically so that tests are stable across runs
            for (let i = 0; i < len; i++) {
                bytes[i] = (i * 31 + 7) & 0xff;
            }
            const inputB64 = bytes.toString('base64');
            const hashB64 = await PowerAuthCryptoUtils.hashSha256(inputB64);
            expect(isValidBase64(hashB64)).toBe(true);
            expect(b64DecodeLength(hashB64)).toBe(32);
            // Hash must be deterministic
            expect(await PowerAuthCryptoUtils.hashSha256(inputB64)).toBe(hashB64);
            // And should differ for different inputs (very high probability)
            if (previousHash) {
                expect(hashB64).toNotBe(previousHash);
            }
            previousHash = hashB64;
        }

        // 6) Invalid Base64 should fail
        await expect(async () => await PowerAuthCryptoUtils.hashSha256("not base64"))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER });
        await expect(async () => await PowerAuthCryptoUtils.hashSha256("**??=="))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER });
    }

    async testRandomData() {
        // Valid lengths
        const lengths = [1, 2, 3, 4, 5, 16, 32, 33, 64, 127, 128, 256];
        for (const len of lengths) {
            const r1 = await PowerAuthCryptoUtils.randomBytes(len);
            const r2 = await PowerAuthCryptoUtils.randomBytes(len);
            expect(isValidBase64(r1)).toBe(true);
            expect(isValidBase64(r2)).toBe(true);
            expect(b64DecodeLength(r1)).toBe(len);
            expect(b64DecodeLength(r2)).toBe(len);
            // High probability of different values.
            // There is a very small probability that this test fails even for correct implementation.
            // To fix, just re-run the test. If it fails again, go buy a lottery ticket :)
            expect(r1).toNotBe(r2);

            const bytesFromB64 = b64ToUintArray(r1);
            expect(bytesFromB64.length).toBe(len);
            expect(bytesFromB64.length).toBe(b64DecodeLength(r1));
        }

        // Zero length = zero bytes
        const zero = await PowerAuthCryptoUtils.randomBytes(0);
        expect(zero).toBe("");
        expect(b64DecodeLength(zero)).toBe(0);

        // Negative lengths must fail
        await expect(async () => await PowerAuthCryptoUtils.randomBytes(-1)).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER });
        await expect(async () => await PowerAuthCryptoUtils.randomBytes(-128)).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER });
    }

}