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

import {PowerAuthUserAddress, PowerAuthUserInfo} from "./model/PowerAuthUserInfo";
import { NativeWrapper } from "./internal/NativeWrapper";
import { SDK_VERSION } from "./internal/SDKVersion";

/**
 * The `PowerAuthUtils` class provides utility methods for the PowerAuth SDK.
 */
export class PowerAuthUtils {
    /**
     * Returns information about the current environment, such as system name, version, device ID,
     * and the PowerAuth SDK version.
     *
     * @returns A promise that resolves to an object containing environment information.
     */
    static async getEnvironmentInfo(): Promise<PowerAuthEnvironmentInfo> {
        const info = (await NativeWrapper.staticCall("getEnvironmentInfo")) as PowerAuthEnvironmentInfo
        return { ...info, sdkVersion: SDK_VERSION } as PowerAuthEnvironmentInfo;
    }

    /**
     * Method expands the `userInfo` object properties with values returned from the SDK (that only fills `allClaims` property).
     *
     * @param userInfo The `userInfo` object to expand.
     * @returns The expanded `userInfo` object.
     * */
    static expandUserInfoObject(userInfo: PowerAuthUserInfo): PowerAuthUserInfo {
        const claims = userInfo.allClaims;
        if (!claims) {
            return userInfo;
        }

        const result: PowerAuthUserInfo = {
            subject: claims.sub,
            name: claims.name,
            givenName: claims.given_name,
            familyName: claims.family_name,
            middleName: claims.middle_name,
            nickname: claims.nickname,
            preferredUsername: claims.preferred_username,
            profileUrl: claims.profile,
            pictureUrl: claims.picture,
            websiteUrl: claims.website,
            email: claims.email,
            isEmailVerified: claims.email_verified,
            phoneNumber: claims.phone_number,
            isPhoneNumberVerified: claims.phone_number_verified,
            gender: claims.gender,
            birthdate: claims.birthdate, // expected format: yyyy-MM-dd
            zoneInfo: claims.zoneinfo,
            locale: claims.locale,
            userAddress: PowerAuthUtils.expandUserInfoAddress(claims.address),
            updatedAt: timestampToDate(claims.updated_at),
            allClaims: claims,
        };

        return result;
    }

    /**
     * Method expands the `address` object properties with values returned from the SDK (that only fills `allClaims` property).
     * @param address The `address` object to expand.
     * @returns The expanded `address` object.
     */
    static expandUserInfoAddress(address: any | undefined): PowerAuthUserAddress | undefined {
        if (!address) {
            return;
        }

        const formatted: string | undefined = address.formatted?.replace(/\r\n/g, "\n");

        const result: PowerAuthUserAddress = {
            formatted,
            street: address.street_address,
            locality: address.locality,
            region: address.region,
            postalCode: address.postal_code,
            country: address.country,
            allClaims: {...address},
        };
        return result;
    }
}

/**
 * Interface representing the environment information for the PowerAuth SDK.
 * This includes system details, application version or device information.
 */
export interface PowerAuthEnvironmentInfo {

    /** System name, for example "iOS", "Android", "iPadOS", ... */
    systemName: string
    /** Version of the system */
    systemVersion: string
    
    /** Application version, e.g. "1.0.0". */
    applicationVersion?: string
    /** Host application identifier, for example "com.wultra.demoapp" */
    applicationIdentifier?: string

    /** For example "apple" or "Samsung" */
    deviceManufacturer: string
    /** Device ID, for example "iPhone9,2" */
    deviceId: string

    /** PowerAuth JS SDK version, for example "4.0.0" */
    sdkVersion: string
}

/**
 * Method converts a timestamp value to a `Date` object. String and number values are supported.
 * @param value in seconds to convert.
 * */
function timestampToDate(value: unknown): Date | undefined {
    try {
        if (typeof value === "string") {
            const num = parseInt(value, 10);
            if (isNaN(num)) return undefined;
            return new Date(num * 1000);
        }

        if (typeof value === "number") {
            return new Date(value * 1000);
        }
    } catch {
        return undefined;
    }
}