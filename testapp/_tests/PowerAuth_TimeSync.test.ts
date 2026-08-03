//
// Copyright 2025 Wultra s.r.o.
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

import { expect } from "mobile-testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_TimeSyncTests extends TestWithActivation {

    async testTimeSynchronization() {
        // time is synchronized during the activation
        expect(await this.sdk.timeSynchronizationService.isTimeSynchronized()).toBe(true)

        // desynchronize time
        expect(await this.sdk.timeSynchronizationService.resetTimeSynchronization()).toSucceed()
        expect(await this.sdk.timeSynchronizationService.isTimeSynchronized()).toBe(false)

        // sync again
        expect(await this.sdk.timeSynchronizationService.synchronizeTime()).toSucceed()
        expect(await this.sdk.timeSynchronizationService.isTimeSynchronized()).toBe(true)

        const timestamp = await this.sdk.timeSynchronizationService.currentTime()
        const localTimeAdjustment = await this.sdk.timeSynchronizationService.localTimeAdjustment()
        const localTimeAdjustmentPrecision = await this.sdk.timeSynchronizationService.localTimeAdjustmentPrecision()
        
        // All time values must cross both native bridges as finite JavaScript numbers.
        // Cordova Android transports 64-bit-safe values as strings internally.
        expect(Number.isFinite(timestamp)).toBe(true)
        expect(Number.isFinite(localTimeAdjustment)).toBe(true)
        expect(Number.isFinite(localTimeAdjustmentPrecision)).toBe(true)

        // Epoch milliseconds must not overflow a 32-bit integer in the native bridge.
        expect(timestamp).toBeGreaterThan(0x7fffffff)
        expect(localTimeAdjustmentPrecision).toBeGreaterThanOrEqual(0)

        const date = new Date(timestamp)
        expect(date.getTime()).toBe(timestamp)

        // Allow for the short delay between the two native calls and reading local time.
        const expectedCurrentTime = Date.now() + localTimeAdjustment
        expect(Math.abs(timestamp - expectedCurrentTime)).toBeLessThan(5000)
    }
}