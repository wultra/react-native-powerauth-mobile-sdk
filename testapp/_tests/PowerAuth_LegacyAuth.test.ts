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
import { expect } from "mobile-testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";
import { CustomConfig } from "../src/IntegrationUtils";

class PowerAuth_LegacyAuthBase extends TestWithActivation {

    constructor(suiteName: string | undefined = undefined, isInteractive: boolean = false) {
        super(suiteName, isInteractive)
    }

    shouldCreateActivationBeforeTest(): boolean {
        return this.context.testName?.startsWith('testWithActivation') ?? false
    }

    provideCustomConfig(): CustomConfig {
        // Use config that allows create activation with biometry key with no user's interaction
        const config = new PowerAuthBiometryConfiguration()
        config.authenticateOnBiometricKeySetup = false
        return {
            biometryConfiguration: config
        }
    }

    protected async persistActivationWithLegacyAuth(useBiometry: boolean): Promise<void> {
        const sdk = await this.helper.sdk
        const activatioData = await this.helper.createActivation()
        const activation = PowerAuthActivation.createWithActivationCode(activatioData.activationCode!, "Test");
        await sdk.createActivation(activation)
        
        // Now persist activation with a legacy authentication
        const persistAuth = new PowerAuthAuthentication()
        persistAuth.usePossession = true
        persistAuth.userPassword = this.credentials.validPassword
        if (useBiometry) {
            persistAuth.useBiometry = true
        }
        await sdk.persistActivation(persistAuth)

        expect(await sdk.hasValidActivation())
    }
}

export class PowerAuth_LegacyAuthTests extends PowerAuth_LegacyAuthBase {

    async testActivationWithLegacyAuth() {
        await this.persistActivationWithLegacyAuth(false)
    }
}

export class PowerAuth_LegacyAuthBiometryTests extends PowerAuth_LegacyAuthBase {

    constructor(suiteName: string | undefined = undefined) {
        super(suiteName, true)
    }

    async testActivationWithLegacyAuth_WithBiometry() {
        await this.persistActivationWithLegacyAuth(true)
    }
}