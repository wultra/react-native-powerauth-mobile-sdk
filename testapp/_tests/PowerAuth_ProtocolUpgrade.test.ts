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
    PowerAuthConfiguration
} from "react-native-powerauth-mobile-sdk"
import { expect } from "mobile-testbed"
import { importPassword } from "./helpers/PasswordHelper"
import { TestWithActivation } from "./helpers/TestWithActivation"

export class PowerAuth_ProtocolUpgradeTests extends TestWithActivation {

    override shouldCreateActivationBeforeTest(): boolean {
        return false
    }

    async testUpgradePersistedLegacyActivationToProtocol4() {
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
        await this.helper.prepareActiveActivation(this.credentials.validPassword)
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
    }
}
