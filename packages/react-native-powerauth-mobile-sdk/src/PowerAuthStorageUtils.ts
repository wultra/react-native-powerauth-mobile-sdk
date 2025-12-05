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

import { NativeWrapper } from "./internal/NativeWrapper";
import { NativeStorageUtils } from "./internal/NativeStorageUtils";

/**
 * Enum defining the type of storage to use.
 */
export enum PowerAuthStorageType {
    /**
     * Secure storage: Keychain (iOS) / EncryptedSharedPreferences (Android)
     */
    SECURE = "SECURE",
    /**
     * Standard storage: UserDefaults (iOS) / SharedPreferences (Android)
     */
    STANDARD = "STANDARD"
}

/**
 * The `PowerAuthStorageUtils` class provides utility methods for storing and retrieving
 * string values in platform-specific secure and standard storage.
 * 
 * On iOS:
 * - SECURE: Keychain
 * - STANDARD: UserDefaults
 * 
 * On Android:
 * - SECURE: EncryptedSharedPreferences
 * - STANDARD: SharedPreferences
 */
export class PowerAuthStorageUtils {

    /**
     * Stores a string value for the given key in the specified storage type.
     * @param key The key to store the value under.
     * @param value The string value to store.
     * @param storageType The type of storage to use (SECURE or STANDARD).
     * @throws `PowerAuthErrorCode.WRONG_PARAMETER` if key or value is invalid.
     */
    static async setString(key: string, value: string, storageType: PowerAuthStorageType): Promise<void> {
        try {
            return await NativeStorageUtils.setString(key, value, storageType);
        } catch (error) {
            throw NativeWrapper.processException(error);
        }
    }

    /**
     * Retrieves a string value for the given key from the specified storage type.
     * @param key The key to retrieve the value for.
     * @param storageType The type of storage to use (SECURE or STANDARD).
     * @returns The stored string value, or undefined if the key does not exist.
     * @throws `PowerAuthErrorCode.WRONG_PARAMETER` if key is invalid.
     */
    static async getString(key: string, storageType: PowerAuthStorageType): Promise<string | undefined> {
        try {
            const result = await NativeStorageUtils.getString(key, storageType);
            return result ?? undefined;
        } catch (error) {
            throw NativeWrapper.processException(error);
        }
    }

    /**
     * Checks if a value exists for the given key in the specified storage type.
     * @param key The key to check.
     * @param storageType The type of storage to use (SECURE or STANDARD).
     * @returns True if the key exists, false otherwise.
     * @throws `PowerAuthErrorCode.WRONG_PARAMETER` if key is invalid.
     */
    static async exists(key: string, storageType: PowerAuthStorageType): Promise<boolean> {
        try {
            return await NativeStorageUtils.exists(key, storageType);
        } catch (error) {
            throw NativeWrapper.processException(error);
        }
    }

    /**
     * Removes the value for the given key from the specified storage type.
     * @param key The key to remove.
     * @param storageType The type of storage to use (SECURE or STANDARD).
     * @returns True if the key was removed, false if the key did not exist.
     * @throws `PowerAuthErrorCode.WRONG_PARAMETER` if key is invalid.
     */
    static async remove(key: string, storageType: PowerAuthStorageType): Promise<boolean> {
        try {
            return await NativeStorageUtils.remove(key, storageType);
        } catch (error) {
            throw NativeWrapper.processException(error);
        }
    }
}

