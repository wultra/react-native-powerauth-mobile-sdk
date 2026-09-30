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

import { PowerAuthAuthentication, PowerAuthBiometricPrompt, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { TestSuite, expect } from "mobile-testbed";

const prompt: PowerAuthBiometricPrompt = {
    promptTitle: 'Authenticate',
    promptMessage: 'Please authenticate with biometry'
}

const removedMembers = [
    'usePossession',
    'useBiometry',
    'userPassword',
    'biometryMessage',
    'biometryTitle',
    'convertLegacyObject'
]

export class PowerAuthAuthenticationTests extends TestSuite {

    async testConstructorIsNotPublic() {
        // @ts-expect-error The constructor must not be public.
        await expect(async () => new PowerAuthAuthentication()).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })

        // Plain JavaScript code can bypass TypeScript visibility.
        const UntypedAuthentication = PowerAuthAuthentication as any
        await expect(async () => new UntypedAuthentication()).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => new UntypedAuthentication('1234')).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => new UntypedAuthentication('1234', prompt)).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => new UntypedAuthentication(Symbol('PowerAuthAuthentication.factory'), false, false, '1234', undefined))
            .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
    }

    async testLegacyMembersAreRemoved() {
        const auth = PowerAuthAuthentication.password('1234')
        // @ts-expect-error The legacy mutable property must not exist.
        expect(auth.userPassword).toBeUndefined()
        for (const member of removedMembers) {
            expect(member in auth).toBe(false)
        }
    }

    async testFactories() {
        const possession = PowerAuthAuthentication.possession()
        expect(possession.isActivationPersist).toBe(false)
        expect(possession.isBiometricAuthentication).toBe(false)
        expect(possession.password).toBeUndefined()
        expect(possession.biometricPrompt).toBeUndefined()
        await this.expectRaw(possession, undefined, false, false, undefined)

        const password = PowerAuthAuthentication.password('1234')
        expect(password.isActivationPersist).toBe(false)
        expect(password.isBiometricAuthentication).toBe(false)
        expect(password.password).toBe('1234')
        expect(password.biometricPrompt).toBeUndefined()
        await this.expectRaw(password, '1234', false, false, undefined)

        const biometry = PowerAuthAuthentication.biometry(prompt)
        expect(biometry.isActivationPersist).toBe(false)
        expect(biometry.isBiometricAuthentication).toBe(true)
        expect(biometry.password).toBeUndefined()
        expect(biometry.biometricPrompt).toBe(prompt)
        await this.expectRaw(biometry, undefined, false, true, prompt)

        const persist = PowerAuthAuthentication.persistWithPassword('1234')
        expect(persist.isActivationPersist).toBe(true)
        expect(persist.isBiometricAuthentication).toBe(false)
        expect(persist.password).toBe('1234')
        expect(persist.biometricPrompt).toBeUndefined()
        await this.expectRaw(persist, '1234', true, false, undefined)

        const persistBio = PowerAuthAuthentication.persistWithPasswordAndBiometry('1234', prompt)
        expect(persistBio.isActivationPersist).toBe(true)
        expect(persistBio.isBiometricAuthentication).toBe(true)
        expect(persistBio.password).toBe('1234')
        expect(persistBio.biometricPrompt).toBe(prompt)
        await this.expectRaw(persistBio, '1234', true, true, prompt)

        const persistBioNoPrompt = PowerAuthAuthentication.persistWithPasswordAndBiometry('1234')
        expect(persistBioNoPrompt.isActivationPersist).toBe(true)
        expect(persistBioNoPrompt.isBiometricAuthentication).toBe(true)
        expect(persistBioNoPrompt.biometricPrompt).toBeUndefined()
        await this.expectRaw(persistBioNoPrompt, '1234', true, true, undefined)
    }

    private async expectRaw(
        auth: PowerAuthAuthentication,
        password: string | undefined,
        isPersist: boolean,
        isBiometry: boolean,
        biometricPrompt: PowerAuthBiometricPrompt | undefined
    ) {
        const raw = await auth.toRawAuthentication()
        expect(raw.password).toBe(password)
        expect(raw.isPersist).toBe(isPersist)
        expect(raw.isBiometry).toBe(isBiometry)
        expect(raw.isReusable).toBe(false)
        expect(raw.biometryKeyId).toBeUndefined()
        expect(raw.biometricPrompt).toBe(biometricPrompt)
    }
}
