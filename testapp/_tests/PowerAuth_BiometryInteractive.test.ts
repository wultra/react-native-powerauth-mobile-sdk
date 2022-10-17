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

import { TestWithActivation } from "./helpers/TestWithActivation";
import { CustomActivationHelperPrepareData } from "./helpers/RNActivationHelper";
import { expect, UserPromptDuration } from "../src/testbed";
import { PowerAuthBiometryConfiguration, PowerAuthBiometryStatus, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";

export class PowerAuth_BiometryInteractiveTests extends TestWithActivation {

    /**
     * Construct this test suite as interactive
     * @param suiteName Optional test stuite name
     */
    constructor(suiteName: string | undefined = undefined) {
        super(suiteName, true)
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

    async testGroupedBiometricAuthentication() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Please authenticate with biometry.')
        await this.sdk.groupedBiometricAuthentication(this.credentials.biometry, async reusableAuth => {
            //
            await this.showPrompt('Biometric dialog should not be displayed.', UserPromptDuration.QUICK)
            // Calculate signature 
            let data = '{}'
            let uriId = '/some/uriId'
            let header = await this.sdk.requestSignature(reusableAuth, 'POST', uriId, data)
            // Verify signature
            let result = await this.helper.signatureHelper.verifyOnlineSignature('POST', uriId, data, header.value)
            expect(result).toBe(true)
            //
            await this.showPrompt('Biometric dialog should not be displayed.', UserPromptDuration.QUICK)
            // Calculate yet another signature and verify
            data = '{"value":true}'
            uriId = '/another/uriId'

            header = await this.sdk.requestSignature(reusableAuth, 'POST', uriId, data)
            result = await this.helper.signatureHelper.verifyOnlineSignature('POST', uriId, data, header.value)
            expect(result).toBe(true)
        })
    }

    async testRemoveActivationWithBiometry() {
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        await this.showPrompt('Authenticate to remove activation')
        await this.sdk.removeActivationWithAuthentication(this.credentials.biometry)
    }
    

    // TODO: On iOS emulator you cannot cancel biometry

    // async testCancelBiometry() {
    //     expect(await this.sdk.hasBiometryFactor()).toBe(true)
    //     await this.showPrompt('Please cancel authentication dialog')    
    //     await expect(async () => this.sdk.requestSignature(this.credentials.biometry, 'POST', '/some/uriId', '{}')).toThrow({ errorCode: PowerAuthErrorCode.BIOMETRY_CANCEL })
    // }
}