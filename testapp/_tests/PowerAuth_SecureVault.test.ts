/*
 * Copyright 2026 Wultra s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    PowerAuthAlgorithm,
    PowerAuthErrorCode,
    PowerAuthSecureVaultKeyId
} from "react-native-powerauth-mobile-sdk"
import { expect } from "mobile-testbed"
import type { CustomConfig } from "../src/IntegrationUtils"
import { TestWithActivation } from "./helpers/TestWithActivation"

export class PowerAuth_SecureVaultTests extends TestWithActivation {

    provideCustomConfig(): CustomConfig {
        return { algorithm: PowerAuthAlgorithm.P384_L3 }
    }

    async testDerivationAndExplicitRelease() {
        expect(await this.sdk.currentAlgorithm).toBe(PowerAuthAlgorithm.P384_L3)

        let knowledgeDerived: string | undefined
        for (const keyIdentifier of [
            PowerAuthSecureVaultKeyId.KNOWLEDGE,
            PowerAuthSecureVaultKeyId.KNOWLEDGE_OR_BIOMETRY
        ]) {
            const vaultKey = await this.sdk.fetchSecureVaultKey(
                this.credentials.knowledge,
                keyIdentifier
            )
            expect(vaultKey.keyIdentifier).toBe(keyIdentifier)

            const first = await vaultKey.deriveKey(7, 16)
            const repeated = await vaultKey.deriveKey(7, 16)
            const different = await vaultKey.deriveKey(8, 16)
            const extended = await vaultKey.deriveKey(7, 32)
            expect(atob(first).length).toBe(16)
            expect(repeated).toBe(first)
            expect(different).toNotBe(first)
            expect(atob(extended).length).toBe(32)
            expect(atob(extended).slice(0, 16)).toNotBe(atob(first))

            if (keyIdentifier === PowerAuthSecureVaultKeyId.KNOWLEDGE) {
                knowledgeDerived = first
            } else {
                expect(knowledgeDerived).toBeDefined()
                expect(first).toNotBe(knowledgeDerived)
            }

            await expect(async () => await vaultKey.deriveKey(-1, 16))
                .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
            await expect(async () => await vaultKey.deriveKey(0.5, 16))
                .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
            await expect(async () => await vaultKey.deriveKey(0, 15))
                .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
            await expect(async () => await vaultKey.deriveKey(0, 2147483648))
                .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })

            await vaultKey.release()
            await vaultKey.release()
            await expect(async () => await vaultKey.deriveKey(7, 16))
                .toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
            await expect(async () => await vaultKey.deriveKey(8, 32))
                .toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })

            const refetchedKey = await this.sdk.fetchSecureVaultKey(
                this.credentials.knowledge,
                keyIdentifier
            )
            try {
                expect(await refetchedKey.deriveKey(7, 16)).toBe(first)
            } finally {
                await refetchedKey.release()
            }
        }
    }

    async testDeconfigurationInvalidatesKey() {
        const configuration = await this.sdk.configuration
        const clientConfiguration = await this.sdk.clientConfiguration
        const biometryConfiguration = await this.sdk.biometryConfiguration
        const keychainConfiguration = await this.sdk.keychainConfiguration
        const sharingConfiguration = await this.sdk.sharingConfiguration
        const vaultKey = await this.sdk.fetchSecureVaultKey(
            this.credentials.knowledge,
            PowerAuthSecureVaultKeyId.KNOWLEDGE
        )

        await this.sdk.deconfigure()
        await expect(async () => await vaultKey.deriveKey(7, 16))
            .toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await vaultKey.release()

        await this.sdk.configure(
            configuration,
            clientConfiguration,
            biometryConfiguration,
            keychainConfiguration,
            sharingConfiguration
        )
    }
}
