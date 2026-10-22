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

import { PowerAuthAuthentication, PowerAuthErrorCode, PowerAuthPassword } from "react-native-powerauth-mobile-sdk";
import { expect } from "mobile-testbed";
import { Register } from "./helpers/NativeObjectRegister";
import { importPassword } from "./helpers/PasswordHelper";
import { TestWithActivation } from "./helpers/TestWithActivation";

/**
 * Create password by adding each string as one character, as an application does when the user types it.
 */
async function typePassword(characters: string[]): Promise<PowerAuthPassword> {
    const password = new PowerAuthPassword()
    for (const c of characters) {
        await password.addCharacter(c)
    }
    return password
}

// Thumbs up with medium skin tone modifier, one character composed of two code points.
const THUMBS_UP = '👍🏽'
// Thumbs up without the modifier, which is what previous versions of the library stored for THUMBS_UP.
const THUMBS_UP_LEGACY = '👍'

export class PowerAuth_PasswordEncodingTests extends TestWithActivation {

    shouldCreateActivationBeforeTest(): boolean {
        return false
    }

    async testMultiCodePointPassword() {
        const typed = ['p', 'i', 'n', THUMBS_UP, '1', '2', '3', '4']
        await this.helper.prepareActiveActivation(await typePassword(typed))

        // All code points are part of the password
        await this.sdk.validatePassword(await typePassword(typed))
        await this.sdk.validatePassword(await importPassword(`pin${THUMBS_UP}1234`))
        await expect(async () => await this.sdk.validatePassword(await importPassword(`pin${THUMBS_UP_LEGACY}1234`)))
            .toThrow({errorCode: PowerAuthErrorCode.NETWORK_ERROR})

        const header = await this.sdk.authenticationHeaderForRequestWithBody(PowerAuthAuthentication.password(await typePassword(typed)), 'POST', '/some/uriId', '{}')
        expect((await this.helper.verifySignature('POST', '/some/uriId', '{}', header.value)).signatureValid).toBe(true)
    }

    async testChangeToMultiCodePointPassword() {
        await this.helper.prepareActiveActivation(this.credentials.validPassword)
        const typed = ['x', THUMBS_UP, 'y', 'z', '1', '2', '3', '4']

        await this.sdk.changePassword(this.credentials.validPassword, await typePassword(typed))

        await this.sdk.validatePassword(await typePassword(typed))
        await this.sdk.validatePassword(await importPassword(`x${THUMBS_UP}yz1234`))
        await expect(async () => await this.sdk.validatePassword(await importPassword(`x${THUMBS_UP_LEGACY}yz1234`)))
            .toThrow({errorCode: PowerAuthErrorCode.NETWORK_ERROR})
    }

    async testLegacyActivation() {
        const typed = ['a', 'b', THUMBS_UP, '1', '2', '3', '4']
        // Persist the password that previous versions of the library produced for the typed characters.
        await this.helper.prepareActiveActivation(await importPassword(`ab${THUMBS_UP_LEGACY}1234`))
        // The activation was persisted by this version, so all typed code points are used.
        await expect(async () => await this.sdk.validatePassword(await typePassword(typed)))
            .toThrow({errorCode: PowerAuthErrorCode.NETWORK_ERROR})

        // Make the activation look like it was persisted by a previous version.
        expect(await Register.resetPasswordEncoding(this.sdk.instanceId)).toBe(true)

        // The typed password now matches the activation.
        await this.sdk.validatePassword(await typePassword(typed))
        const header = await this.sdk.authenticationHeaderForRequestWithBody(PowerAuthAuthentication.password(await typePassword(typed)), 'POST', '/some/uriId', '{}')
        expect((await this.helper.verifySignature('POST', '/some/uriId', '{}', header.value)).signatureValid).toBe(true)
        // Passwords with characters composed of one code point are not affected.
        await this.sdk.validatePassword(await importPassword(`ab${THUMBS_UP_LEGACY}1234`))

        // The activation keeps the legacy encoding after the password change.
        const newTyped = ['n', 'e', 'w', THUMBS_UP, '5', '6', '7', '8']
        await this.sdk.changePassword(await typePassword(typed), await typePassword(newTyped))
        await this.sdk.validatePassword(await typePassword(newTyped))
        await this.sdk.validatePassword(await importPassword(`new${THUMBS_UP_LEGACY}5678`))
    }
}
