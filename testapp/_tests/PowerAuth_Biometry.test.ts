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

import { Platform } from "react-native";
import { PowerAuthActivation, PowerAuthAuthentication, PowerAuthBiometryConfiguration, PowerAuthBiometryStatus, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";
import { CustomActivationHelperPrepareData } from "./helpers/RNActivationHelper";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_BiometryTests extends TestWithActivation {

    shouldCreateActivationBeforeTest(): boolean {
        const n = this.context.testName
        return !(n == 'androidTestCreateActivationWithRSABiometryKey')
    }

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

    async androidTestCreateActivationWithRSABiometryKey() {
        const sdk = await this.helper.getPowerAuthSdk()
        const activatioData = await this.helper.initActivation()
        const activation = PowerAuthActivation.createWithActivationCode(activatioData.activationCode!, "Test");
        await sdk.createActivation(activation)
        // Now commit activation with a legacy authentication
        const commitAuth = PowerAuthAuthentication.commitWithPasswordAndBiometry(this.credentials.validPassword)
        await sdk.commitActivation(commitAuth)
    }

    async testAddRemoveBiometryFactor() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.sdk.removeBiometryFactor()
        expect(await this.sdk.hasBiometryFactor()).toBe(false)

        await expect(async () => this.sdk.requestSignature(this.credentials.biometry, 'POST', '/some/biometry', '{}')).toThrow({errorCode: PowerAuthErrorCode.BIOMETRY_NOT_CONFIGURED})
        await this.sdk.addBiometryFactor(this.credentials.validPassword)
        expect(await this.sdk.hasBiometryFactor()).toBe(true)

        await this.sdk.addBiometryFactor(this.credentials.validPassword)
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        
        // Now remove factor and try to calculate signature
        await this.sdk.removeBiometryFactor()
        expect(await this.sdk.hasBiometryFactor()).toBe(false)
    }
}