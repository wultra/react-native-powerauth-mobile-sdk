/*
 * Copyright 2025 Wultra s.r.o.
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

import { TestWithActivation } from "./helpers/TestWithActivation";

import { PowerAuthStorageUtils, PowerAuthStorageType, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";

export class PowerAuth_StorageUtilsTest extends TestWithActivation {
    override shouldCreateActivationBeforeTest(): boolean {
        return false;
    }

    private uniqueKey(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async testSecureStorageSetAndGet() {
        const key = this.uniqueKey("test_secure");
        const value = "secure_value_123";

        await PowerAuthStorageUtils.setString(key, value, PowerAuthStorageType.SECURE);

        const retrieved = await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.SECURE);
        expect(retrieved).toBe(value);

        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.SECURE);
    }

    async testStandardStorageSetAndGet() {
        const key = this.uniqueKey("test_standard");
        const value = "standard_value_456";

        await PowerAuthStorageUtils.setString(key, value, PowerAuthStorageType.STANDARD);

        const retrieved = await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.STANDARD);
        expect(retrieved).toBe(value);

        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.STANDARD);
    }

    async testSecureStorageExists() {
        const key = this.uniqueKey("test_exists_secure");
        const value = "exists_test";

        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.SECURE)).toBe(false);

        await PowerAuthStorageUtils.setString(key, value, PowerAuthStorageType.SECURE);

        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.SECURE)).toBe(true);

        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.SECURE);
    }

    async testStandardStorageExists() {
        const key = this.uniqueKey("test_exists_standard");
        const value = "exists_test";

        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.STANDARD)).toBe(false);

        await PowerAuthStorageUtils.setString(key, value, PowerAuthStorageType.STANDARD);

        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.STANDARD)).toBe(true);

        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.STANDARD);
    }

    async testSecureStorageRemove() {
        const key = this.uniqueKey("test_remove_secure");
        const value = "remove_test";

        await PowerAuthStorageUtils.setString(key, value, PowerAuthStorageType.SECURE);
        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.SECURE)).toBe(true);

        const removed = await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.SECURE);
        expect(removed).toBe(true);

        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.SECURE)).toBe(false);

        const removedAgain = await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.SECURE);
        expect(removedAgain).toBe(false);
    }

    async testStandardStorageRemove() {
        const key = this.uniqueKey("test_remove_standard");
        const value = "remove_test";

        await PowerAuthStorageUtils.setString(key, value, PowerAuthStorageType.STANDARD);
        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.STANDARD)).toBe(true);

        const removed = await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.STANDARD);
        expect(removed).toBe(true);

        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.STANDARD)).toBe(false);

        const removedAgain = await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.STANDARD);
        expect(removedAgain).toBe(false);
    }

    async testGetNonExistentKey() {
        const key = this.uniqueKey("non_existent");

        const secureValue = await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.SECURE);
        expect(secureValue).toBe(undefined);

        const standardValue = await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.STANDARD);
        expect(standardValue).toBe(undefined);
    }


    async testEmptyStringValue() {
        const key = this.uniqueKey("test_empty");
        const emptyValue = "";

        await PowerAuthStorageUtils.setString(key, emptyValue, PowerAuthStorageType.SECURE);
        
        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.SECURE)).toBe(true);
        
        expect(await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.SECURE)).toBe(emptyValue);

        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.SECURE);
    }

    async testJsonValue() {
        const key = this.uniqueKey("test_json");
        const jsonObject = { name: "test", value: 123, nested: { array: [1, 2, 3] } };
        const jsonValue = JSON.stringify(jsonObject);

        await PowerAuthStorageUtils.setString(key, jsonValue, PowerAuthStorageType.SECURE);

        const retrieved = await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.SECURE);

        expect(retrieved).toBe(jsonValue);
        
        const parsed = JSON.parse(retrieved!);
        expect(parsed.name).toBe("test");
        expect(parsed.value).toBe(123);
        expect(parsed.nested.array.length).toBe(3);

        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.SECURE);
    }

    async testEmptyKeyFails() {
        await expect(async () => {
            await PowerAuthStorageUtils.setString("", "value", PowerAuthStorageType.SECURE);
        }).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER });

        await expect(async () => {
            await PowerAuthStorageUtils.getString("", PowerAuthStorageType.SECURE);
        }).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER });

        await expect(async () => {
            await PowerAuthStorageUtils.exists("", PowerAuthStorageType.SECURE);
        }).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER });

        await expect(async () => {
            await PowerAuthStorageUtils.remove("", PowerAuthStorageType.SECURE);
        }).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER });
    }

    async testStorageTypesIsolation() {
        const key = this.uniqueKey("test_isolation");

        const secureValue = "secure_isolation_test";
        const standardValue = "standard_isolation_test";

        await PowerAuthStorageUtils.setString(key, secureValue, PowerAuthStorageType.SECURE);
        await PowerAuthStorageUtils.setString(key, standardValue, PowerAuthStorageType.STANDARD);

        expect(await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.SECURE)).toBe(secureValue);
        expect(await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.STANDARD)).toBe(standardValue);

        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.SECURE);
        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.SECURE)).toBe(false);
        expect(await PowerAuthStorageUtils.exists(key, PowerAuthStorageType.STANDARD)).toBe(true);

        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.STANDARD);
    }

    async testLongValue() {
        const key = this.uniqueKey("test_long");
        const longValue = "x".repeat(10 * 1024);

        await PowerAuthStorageUtils.setString(key, longValue, PowerAuthStorageType.SECURE);

        const value = await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.SECURE);
        expect(value).toBe(longValue);
        expect(value!.length).toBe(10 * 1024);

        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.SECURE);
    }

    async testOverwriteValue() {
        const key = this.uniqueKey("test_overwrite");
        const value1 = "first_value";
        const value2 = "second_value";

        await PowerAuthStorageUtils.setString(key, value1, PowerAuthStorageType.SECURE);
        expect(await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.SECURE)).toBe(value1);

        await PowerAuthStorageUtils.setString(key, value2, PowerAuthStorageType.SECURE);
        expect(await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.SECURE)).toBe(value2);

        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.SECURE);
    }

    async testUnicodeValues() {
        const key = this.uniqueKey("test_unicode");
        const unicodeValue = "Test 🌍 ñ č ř ž";

        await PowerAuthStorageUtils.setString(key, unicodeValue, PowerAuthStorageType.SECURE);
        expect(await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.SECURE)).toBe(unicodeValue);
        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.SECURE);

        await PowerAuthStorageUtils.setString(key, unicodeValue, PowerAuthStorageType.STANDARD);
        expect(await PowerAuthStorageUtils.getString(key, PowerAuthStorageType.STANDARD)).toBe(unicodeValue);
        await PowerAuthStorageUtils.remove(key, PowerAuthStorageType.STANDARD);
    }
}
