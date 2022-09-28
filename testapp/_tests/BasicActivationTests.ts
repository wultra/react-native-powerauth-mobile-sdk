/*
 * Copyright 2022 Wultra s.r.o.
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

import { TestWithActivation } from "./TestWithActivation";
import { expect } from "../src/testbed";
import { PowerAuthActivationState } from "react-native-powerauth-mobile-sdk";

export class BasicActivationTests extends TestWithActivation {
    async testActivationStatus() {
        expect(await this.sdk.hasValidActivation()).toBeTruthy()

        let status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.ACTIVE)
        await this.helper.blockActivation()

        status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.BLOCKED)

        await this.helper.unblockActivation()
        status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.ACTIVE)

        await this.helper.removeActivation()
        status = await this.sdk.fetchActivationStatus()
        expect(status.state).toBe(PowerAuthActivationState.REMOVED)
        expect(await this.sdk.hasValidActivation()).toBeTruthy()

        await this.sdk.removeActivationLocal()
        expect(await this.sdk.hasValidActivation()).toBeFalsy()
    }

    async testActivationRemove() {
        await this.sdk.removeActivationWithAuthentication(this.credentials.knowledge)
        expect(await this.sdk.hasValidActivation()).toBeFalsy()
    }
}