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

import { PowerAuthActivation, PowerAuthAuthentication, PowerAuthBiometryConfiguration, PowerAuthBiometryStatus, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { expect } from "mobile-testbed";
import { Platform } from "react-native";
import { TestWithActivation } from "./helpers/TestWithActivation";
import { importPassword } from "./helpers/PasswordHelper";
import { CustomConfig } from "../src/IntegrationUtils";

export class PowerAuth_BiometryTests extends TestWithActivation {

    /**
     * Construct this test suite as interactive to avoid running in CI.
     * @param suiteName Optional test suite name.
     */
    constructor(suiteName: string | undefined = undefined) {
        super(suiteName, true)
    }

    shouldCreateActivationBeforeTest(): boolean {
        return !this.context.testName.startsWith('androidTestCreateActivation')
    }

    provideCustomConfig(): CustomConfig {
        if (this.context.testName.startsWith('androidTestCreateActivation')) {
            const biometryConfiguration = new PowerAuthBiometryConfiguration()
            biometryConfiguration.authenticateOnBiometricKeySetup = false
            return { biometryConfiguration }
        }
        return {}
    }

    async beforeEach(): Promise<void> {
        await super.beforeEach()
        const biometricStatus = await this.sdk.getBiometricStatus()
        if (biometricStatus.systemStatus !== PowerAuthBiometryStatus.OK) {
            this.reportSkip(`Biometric status is ${biometricStatus.systemStatus}`)
        }
    }

    async androidTestCreateActivationWithoutSetupPrompt() {
        const sdk = await this.helper.sdk
        const activatioData = await this.helper.createActivation()
        const activation = PowerAuthActivation.createWithActivationCode(activatioData.activationCode!, "Test");
        await sdk.createActivation(activation)
        // Now persist activation with a legacy authentication
        const persistAuth = PowerAuthAuthentication.persistWithPasswordAndBiometry(this.credentials.validPassword)
        await sdk.persistActivation(persistAuth)
    }

    async androidTestCreateActivationWithOptionalSetupPrompt() {
        const sdk = await this.helper.sdk
        const activationData = await this.helper.createActivation()
        const activation = PowerAuthActivation.createWithActivationCode(activationData.activationCode!, "Test");
        await sdk.createActivation(activation)
        await this.showPrompt('Authenticate to persist activation')
        const persistAuth = PowerAuthAuthentication.persistWithPasswordAndBiometry(
            this.credentials.validPassword,
            {
                promptTitle: 'Persist activation',
                promptSubtitle: 'Optional setup authentication',
                promptMessage: 'Authenticate to persist activation'
            }
        )
        await sdk.persistActivation(persistAuth)
    }

    async testAddRemoveBiometryFactor() {
        expect(await this.sdk.hasBiometryFactor()).toBe(false)
        let status = await this.sdk.getBiometricStatus()
        expect(status.isBiometricFactorConfigured).toBe(false)
        expect(status.isAuthenticationWithBiometricsAvailable).toBe(false)
        expect(await this.sdk.isAuthenticationWithBiometricsAvailable()).toBe(false)

        await expect(async () => this.sdk.authenticationHeaderForRequestWithBody(this.credentials.biometry, 'POST', '/some/biometry', '{}')).toThrow({errorCode: PowerAuthErrorCode.BIOMETRY_NOT_CONFIGURED})
        if (Platform.OS === 'android') {
            await expect(async () => this.sdk.addBiometryFactor(this.credentials.validPassword)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
            await this.showPrompt('Authenticate to add biometric factor')
        }
        const prompt = {
            promptTitle: 'Add biometry',
            promptSubtitle: 'PowerAuth biometric factor',
            promptMessage: 'Authenticate to add biometric factor'
        }
        const password = await importPassword(this.credentials.validPassword, false)
        const addFactor = this.sdk.addBiometryFactor(password, prompt)
        await password.release()
        await addFactor
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        status = await this.sdk.getBiometricStatus()
        expect(status.isBiometricFactorConfigured).toBe(true)
        expect(status.isAuthenticationWithBiometricsAvailable).toBe(true)
        expect(await this.sdk.isAuthenticationWithBiometricsAvailable()).toBe(true)

        if (Platform.OS === 'android') {
            await this.showPrompt('Authenticate to replace biometric factor')
        }
        await this.sdk.addBiometryFactor(this.credentials.validPassword, prompt)
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        
        // Now remove factor and try to calculate signature
        await this.sdk.removeBiometryFactor()
        expect(await this.sdk.hasBiometryFactor()).toBe(false)
        status = await this.sdk.getBiometricStatus()
        expect(status.isBiometricFactorConfigured).toBe(false)
        expect(status.isAuthenticationWithBiometricsAvailable).toBe(false)
        expect(await this.sdk.isAuthenticationWithBiometricsAvailable()).toBe(false)
    }
}
