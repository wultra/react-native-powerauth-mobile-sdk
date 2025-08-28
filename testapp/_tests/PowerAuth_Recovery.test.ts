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

import { PowerAuthActivation, PowerAuthActivationState, PowerAuthErrorCode, PowerAuthRecoveryActivationData } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_RecoveryTests extends TestWithActivation {

    async testCreateActivationRecovery() {

        if (await this.sdk.hasActivationRecoveryData() == false) {
            this.reportSkip("Recovery data not available on the server")
            return
        }

        // Extract activation recovery
        const rd = await this.sdk.activationRecoveryData(this.credentials.knowledge)
        const originalActivationId = await this.sdk.getActivationIdentifier()

        // Now remove activation locally
        await this.sdk.removeActivationLocal()

        // And create activation with a recovery code
        const activation = PowerAuthActivation.createWithRecoveryCode(rd.recoveryCode, rd.puk, 'Recovery Test')
        await this.sdk.createActivation(activation)
        this.sdk.persistActivation(this.credentials.knowledge)

        const newActivationId = await this.sdk.getActivationIdentifier()
        expect(newActivationId).toBeNotNull()
        expect(originalActivationId).toNotBe(newActivationId)

        // verify server status
        const newStatus = await this.helper.getRegistrationDetail(newActivationId!)
        expect(newStatus).toBeDefined()
        expect(newStatus.registrationStatus).toBe('ACTIVE')

        // Fetch status
        let sdkStatus = await this.sdk.fetchActivationStatus()
        expect(sdkStatus.state).toBe(PowerAuthActivationState.ACTIVE)
    }

    async testConfirmRecoveryCode() {

        if (await this.sdk.hasActivationRecoveryData() == false) {
            this.reportSkip("Recovery data not available on the server")
            return
        }

        // Extract activation recovery
        const rd = await this.sdk.activationRecoveryData(this.credentials.knowledge)

        // We can confirm already confirmed RC, so let's confirm RC created as a part of activation
        let result = await this.sdk.confirmRecoveryCode(rd!.recoveryCode, this.credentials.knowledge)
        expect(result.alreadyConfirmed).toBe(true)

        await expect(async () => this.sdk.confirmRecoveryCode('AAAAA-AAAAA-AAAAA-AAAAA', this.credentials.knowledge)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
        await expect(async () => this.sdk.confirmRecoveryCode(rd!.recoveryCode, this.credentials.invalidKnowledge)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
    }

    async testGetRecoveryData() {
        
        if (await this.sdk.hasActivationRecoveryData() == false) {
            this.reportSkip("Recovery data not available on the server")
            return
        }

        // Extract activation recovery
        const rd = await this.sdk.activationRecoveryData(this.credentials.knowledge)

        const receivedRd = await this.sdk.activationRecoveryData(this.credentials.knowledge)
        expect(receivedRd.puk).toBe(rd.puk)
        expect(receivedRd.recoveryCode).toBe(rd.recoveryCode)

        await expect(async () => await this.sdk.activationRecoveryData(this.credentials.invalidKnowledge)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
    }
}