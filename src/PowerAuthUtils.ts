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