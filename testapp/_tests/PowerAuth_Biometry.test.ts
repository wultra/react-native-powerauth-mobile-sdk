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

import { PowerAuthBiometryConfiguration, PowerAuthBiometryStatus } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";
import { CustomActivationHelperPrepareData } from "./helpers/RNActivationHelper";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_BiometryTests extends TestWithActivation {

    customPrepareData(): CustomActivationHelperPrepareData {
        // Use config that allows create activation with biometry key with no user's interaction
        const config = new PowerAuthBiometryConfiguration()
        config.authenticateOnBiometricKeySetup = false
        return {
            useConfigObjects: true,
            useBiometry: true,
            biometryConfig: config,
            password: this.credentials.validPassword
        }
    }

    async beforeEach(): Promise<void> {
        await super.beforeEach()
        let biometryInfo = await this.sdk.getBiometryInfo()
        if (biometryInfo.canAuthenticate !== PowerAuthBiometryStatus.OK) {
            this.reportSkip(`Biometric status is ${biometryInfo.canAuthenticate}`)
        }
    }

    async testAddRemoveBiometryFactor() {
        expect(await this.sdk.hasBiometryFactor()).toBeTruthy()
        expect(await this.sdk.removeBiometryFactor()).toBeTruthy()
        expect(await this.sdk.hasBiometryFactor()).toBeFalsy()
        // TODO: ios returns true, android null
        await this.sdk.addBiometryFactor(this.credentials.validPassword, 'Some title', 'Some description')
        expect(await this.sdk.hasBiometryFactor()).toBeTruthy()

        await this.sdk.addBiometryFactor(this.credentials.validPassword, 'Some title', 'Some description')
        expect(await this.sdk.hasBiometryFactor()).toBeTruthy()
    }
}