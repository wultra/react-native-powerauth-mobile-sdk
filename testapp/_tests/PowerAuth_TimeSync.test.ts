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
        
        // just check if actual non-zero values are returned
        expect(timestamp).toNotBe(0)
        expect(await this.sdk.timeSynchronizationService.localTimeAdjustmentPrecision()).toNotBe(0)

        const date = new Date(timestamp)
        expect(date.getTime()).toBe(timestamp)
    }
}