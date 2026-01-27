//
// Copyright 2022 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { PowerAuthUtils } from "react-native-powerauth-mobile-sdk";
import { TestSuite, expect } from "mobile-testbed";

export class PowerAuthUtilsTests extends TestSuite {
    
    async iosTestEnvironmentInfo() {
        const deviceInfo = await PowerAuthUtils.getEnvironmentInfo();
        console.log(`Device info: ${JSON.stringify(deviceInfo)}`);
        expect(deviceInfo).toBeDefined();
        expect(deviceInfo.systemName).toBe("iOS");
        expect(deviceInfo.systemVersion).toBeDefined();
        expect(deviceInfo.deviceManufacturer).toBe("apple");
        expect(deviceInfo.deviceId).toBeDefined();
        expect(deviceInfo.sdkVersion).toBeDefined();
        expect(deviceInfo.applicationVersion).toBe("1.0");
        expect(deviceInfo.applicationIdentifier).toBeDefined();
    }

    async androidTestEnvironmentInfo() {
        const deviceInfo = await PowerAuthUtils.getEnvironmentInfo();
        console.log(`Device info: ${JSON.stringify(deviceInfo)}`);
        expect(deviceInfo).toBeDefined();
        expect(deviceInfo.systemName).toBe("android");
        expect(deviceInfo.systemVersion).toBeDefined();
        expect(deviceInfo.deviceManufacturer).toBeDefined();
        expect(deviceInfo.deviceId).toBeDefined();
        expect(deviceInfo.sdkVersion).toBeDefined();
        expect(deviceInfo.applicationVersion).toBe("1.0");
        expect(deviceInfo.applicationIdentifier).toBeDefined();
    }
}