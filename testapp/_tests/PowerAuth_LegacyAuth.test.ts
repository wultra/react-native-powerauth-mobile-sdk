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

import { PowerAuthActivation, PowerAuthAuthentication, PowerAuthBiometryConfiguration } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";
import { CustomActivationHelperPrepareData } from "./helpers/RNActivationHelper";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_LegacyAuthTests extends TestWithActivation {

    shouldCreateActivationBeforeTest(): boolean {
        return this.context.testName?.startsWith('testWithActivation') ?? false
    }

    customPrepareData(): CustomActivationHelperPrepareData {
        const useBiometry = (this.context.testName?.indexOf("Biometry") ?? 0) > 0
        // Use config that allows create activation with biometry key with no user's interaction
        const config = new PowerAuthBiometryConfiguration()
        config.authenticateOnBiometricKeySetup = false
        return {
            useConfigObjects: true,
            useBiometry: useBiometry,
            biometryConfig: useBiometry ? config : undefined,
            password: this.credentials.validPassword
        }
    }

    async testActivationWithLegacyAuth() {
        const sdk = await this.helper.getPowerAuthSdk()
        const activatioData = await this.helper.initActivation()
        const activation = PowerAuthActivation.createWithActivationCode(activatioData.activationCode!, "Test");
        await sdk.createActivation(activation)
        // Now commit activation with a legacy authentication

        const commitAuth = new PowerAuthAuthentication()
        commitAuth.usePossession = true
        commitAuth.userPassword = this.credentials.validPassword
        await sdk.commitActivation(commitAuth)

        expect(await sdk.hasValidActivation())
    }

    async testActivationWithLegacyAuth_WithBiometry() {
        const sdk = await this.helper.getPowerAuthSdk()
        const activatioData = await this.helper.initActivation()
        const activation = PowerAuthActivation.createWithActivationCode(activatioData.activationCode!, "Test");
        await sdk.createActivation(activation)
        // Now commit activation with a legacy authentication

        const commitAuth = new PowerAuthAuthentication()
        commitAuth.usePossession = true
        commitAuth.userPassword = this.credentials.validPassword
        commitAuth.useBiometry = true
        await sdk.commitActivation(commitAuth)

        expect(await sdk.hasValidActivation())
    }

}