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

import { ActivationStatus } from "powerauth-js-test-client";
import { PowerAuthActivation, PowerAuthActivationState, PowerAuthErrorCode, PowerAuthRecoveryActivationData } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_RecoveryTests extends TestWithActivation {

    get recoveryData(): PowerAuthRecoveryActivationData {
        const activationResult = this.helper.prepareActivationResult
        const rd = activationResult.activationRecovery
        expect(rd).toBeDefined()
        return rd!
    }

    async testCreateActivationRecovery() {
        expect(await this.sdk.hasActivationRecoveryData()).toBe(true)

        // Extract activation recovery
        let activationResult = this.helper.prepareActivationResult
        const rd = this.recoveryData

        // Test original activation
        let status = await this.helper.getActivationStatus()
        expect(status).toBe(ActivationStatus.ACTIVE)

        // Now remove activation locally
        await this.sdk.removeActivationLocal()

        // And create activation with a recovery code
        const activation = PowerAuthActivation.createWithRecoveryCode(rd.recoveryCode, rd.puk, 'Recovery Test')
        activationResult = await this.sdk.createActivation(activation)
        this.sdk.commitActivation(this.credentials.knowledge)

        const newActivationId = await this.sdk.getActivationIdentifier()
        expect(newActivationId).toBeNotNull()

        const newStatus = await this.serverApi.getActivationDetil(newActivationId!)
        expect(newStatus).toBeDefined()
        expect(newStatus.activationStatus).toBe(ActivationStatus.ACTIVE)

        // Test original activation
        status = await this.helper.getActivationStatus()
        expect(status).toBe(ActivationStatus.REMOVED)

        // Fetch status
        let sdkStatus = await this.sdk.fetchActivationStatus()
        expect(sdkStatus.state).toBe(PowerAuthActivationState.ACTIVE)
    }

    async testConfirmRecoveryCode() {
        expect(await this.sdk.hasActivationRecoveryData()).toBe(true)

        // Extract activation recovery
        const rd = this.recoveryData

        // We can confirm already confirmed RC, so let's confirm RC created as a part of activation
        let result = await this.sdk.confirmRecoveryCode(rd!.recoveryCode, this.credentials.knowledge)
        expect(result.alreadyConfirmed).toBe(true)

        await expect(async () => this.sdk.confirmRecoveryCode('AAAAA-AAAAA-AAAAA-AAAAA', this.credentials.knowledge)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
        await expect(async () => this.sdk.confirmRecoveryCode(rd!.recoveryCode, this.credentials.invalidKnowledge)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
    }

    async testGetRecoveryData() {
        expect(await this.sdk.hasActivationRecoveryData()).toBe(true)
        
        // Extract activation recovery
        const rd = this.recoveryData

        const receivedRd = await this.sdk.activationRecoveryData(this.credentials.knowledge)
        expect(receivedRd.puk).toBe(rd.puk)
        expect(receivedRd.recoveryCode).toBe(rd.recoveryCode)

        await expect(async () => await this.sdk.activationRecoveryData(this.credentials.invalidKnowledge)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
    }
}