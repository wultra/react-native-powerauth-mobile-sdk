//
// Copyright 2026 Wultra s.r.o.
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

import {
    PowerAuthAlgorithm,
    PowerAuthConfiguration,
    PowerAuthAuthentication,
    PowerAuthBiometryStatus
} from "react-native-powerauth-mobile-sdk"
import { Platform } from "react-native"
import { expect } from "mobile-testbed"
import { importPassword } from "./helpers/PasswordHelper"
import { TestWithActivation } from "./helpers/TestWithActivation"

export class PowerAuth_ProtocolUpgradeTests extends TestWithActivation {

    override shouldCreateActivationBeforeTest(): boolean {
        return false
    }

    protected async prepareLegacyUpgrade(withBiometry: boolean = false) {
        const configuration = await this.sdk.configuration
        const clientConfiguration = await this.sdk.clientConfiguration
        const biometryConfiguration = await this.sdk.biometryConfiguration
        const keychainConfiguration = await this.sdk.keychainConfiguration
        const sharingConfiguration = await this.sdk.sharingConfiguration

        await this.sdk.deconfigure()
        await this.sdk.configure(
            new PowerAuthConfiguration(
                configuration.configuration,
                configuration.baseEndpointUrl,
                PowerAuthAlgorithm.LEGACY,
                configuration.offlineAuthenticationCodeComponentLength
            ),
            clientConfiguration,
            biometryConfiguration,
            keychainConfiguration,
            sharingConfiguration
        )
        await this.helper.prepareActiveActivation(this.credentials.validPassword, undefined, withBiometry)
        expect(await this.sdk.currentAlgorithm).toBe(PowerAuthAlgorithm.LEGACY)

        await this.sdk.deconfigure()
        await this.sdk.configure(
            new PowerAuthConfiguration(
                configuration.configuration,
                configuration.baseEndpointUrl,
                PowerAuthAlgorithm.P384_L3,
                configuration.offlineAuthenticationCodeComponentLength
            ),
            clientConfiguration,
            biometryConfiguration,
            keychainConfiguration,
            sharingConfiguration
        )
        expect(await this.sdk.hasValidActivation()).toBe(true)
        expect(await this.sdk.currentAlgorithm).toBe(PowerAuthAlgorithm.LEGACY)

        await this.sdk.fetchActivationStatus()
        expect(await this.sdk.hasProtocolUpgradeAvailable()).toBe(true)
        expect(await this.sdk.hasPendingProtocolUpgrade()).toBe(false)
    }

    async testUpgradePersistedLegacyActivationToProtocol4() {
        await this.prepareLegacyUpgrade()
        const password = await importPassword(this.credentials.validPassword, true, this.sdk)
        const result = await this.sdk.startProtocolUpgrade(password)
        expect(result.biometryFactorRemoved).toBe(false)

        if (result.activationStatusFetchRequired) {
            expect(result.activationFingerprint).toBeNull()
            expect(await this.sdk.hasPendingProtocolUpgrade()).toBe(true)
            await this.sdk.fetchActivationStatus()
        } else {
            expect(result.activationFingerprint).toBeNotNull()
        }

        expect(await this.sdk.hasPendingProtocolUpgrade()).toBe(false)
        expect(await this.sdk.hasProtocolUpgradeAvailable()).toBe(false)
        expect(await this.sdk.currentAlgorithm).toBe(PowerAuthAlgorithm.P384_L3)
        expect(await this.sdk.hasValidActivation()).toBe(true)
        expect(await this.sdk.getActivationFingerprint()).toBeDefined()
        await this.sdk.tokenStore.requestAccessToken('upgrade-knowledge', this.credentials.knowledge)
        await this.sdk.tokenStore.removeAccessToken('upgrade-knowledge')
    }

    async testWrongPasswordDoesNotUpgrade() {
        await this.prepareLegacyUpgrade()
        const failure = await this.sdk.startProtocolUpgrade(this.credentials.invalidPassword)
            .then(() => undefined, error => error)
        expect(failure?.errorData?.httpStatusCode).toBe(401)
        expect(await this.sdk.currentAlgorithm).toBe(PowerAuthAlgorithm.LEGACY)
        expect(await this.sdk.hasPendingProtocolUpgrade()).toBe(false)
    }

    /*
    async testActivationRemainsUsableAfterRejectedUpgrade() {
        await this.testWrongPasswordDoesNotUpgrade()
        await this.sdk.fetchActivationStatus()
        expect(await this.sdk.hasProtocolUpgradeAvailable()).toBe(true)
        await this.sdk.tokenStore.requestAccessToken('upgrade-wrong-password-check', this.credentials.knowledge)
        await this.sdk.tokenStore.removeAccessToken('upgrade-wrong-password-check')
    }
    */

}


/** Requires enrolled biometric hardware and user approval of biometric prompts. */
export class PowerAuth_ProtocolUpgradeBiometryTests extends PowerAuth_ProtocolUpgradeTests {
    constructor(suiteName?: string) {
        super(suiteName, true)
    }

    async beforeEach(): Promise<void> {
        await super.beforeEach()
        const status = await this.sdk.getBiometricStatus()
        if (status.systemStatus !== PowerAuthBiometryStatus.OK) {
            this.reportSkip(`Biometric status is ${status.systemStatus}`)
        }
    }

    async testUpgradeWithEnrolledBiometry() {
        await this.checkBiometricUpgrade(false)
    }

    async androidTestUpgradePreservesBiometryWhenRequested() {
        await this.checkBiometricUpgrade(true)
    }

    private async checkBiometricUpgrade(preserveAndroidBiometry: boolean) {
        await this.showPrompt('Authenticate to prepare an activation with biometry')
        await this.prepareLegacyUpgrade(true)
        expect(await this.sdk.hasBiometryFactor()).toBe(true)
        const result = await this.sdk.startProtocolUpgrade(this.credentials.validPassword, preserveAndroidBiometry)
        if (result.activationStatusFetchRequired) {
            await this.sdk.fetchActivationStatus()
        }
        expect(await this.sdk.currentAlgorithm).toBe(PowerAuthAlgorithm.P384_L3)
        const shouldPreserve = Platform.OS === 'ios' || preserveAndroidBiometry
        expect(result.biometryFactorRemoved).toBe(!shouldPreserve)
        expect(await this.sdk.hasBiometryFactor()).toBe(shouldPreserve)
        if (shouldPreserve) {
            await this.showPrompt('Authenticate with the preserved biometric factor')
            const auth = PowerAuthAuthentication.biometry({promptTitle: 'Protocol upgrade', promptMessage: 'Verify preserved biometric factor'})
            await this.sdk.tokenStore.requestAccessToken('upgrade-biometry', auth)
            await this.sdk.tokenStore.removeAccessToken('upgrade-biometry')
        }
        await this.sdk.tokenStore.requestAccessToken('upgrade-knowledge', this.credentials.knowledge)
        await this.sdk.tokenStore.removeAccessToken('upgrade-knowledge')
    }
}
