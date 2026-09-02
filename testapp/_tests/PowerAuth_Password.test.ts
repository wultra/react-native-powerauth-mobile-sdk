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

import { PowerAuth, PowerAuthAuthentication, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { expect } from "mobile-testbed";
import { importPassword } from "./helpers/PasswordHelper";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_PasswordTests extends TestWithActivation {
    async testValidatePassword() {
        // Valid password
        await this.sdk.validatePassword(this.credentials.validPassword)
        // Wrong password
        await expect(async () => await this.sdk.validatePassword(this.credentials.invalidPassword)).toThrow({errorCode: PowerAuthErrorCode.NETWORK_ERROR})
        await expect(async () => await this.sdk.validatePassword('12')).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
    }

    async testValidateSecurePassword() {
        // Valid password
        await this.sdk.validatePassword(await importPassword(this.credentials.validPassword))
        // Wrong password
        await expect(async () => await this.sdk.validatePassword(await importPassword(this.credentials.invalidPassword))).toThrow({errorCode: PowerAuthErrorCode.NETWORK_ERROR})
        await expect(async () => await this.sdk.validatePassword(await importPassword('12'))).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
    }

    async testChangePassword() {
        await this.sdk.changePassword(this.credentials.validPassword, this.credentials.invalidPassword)
        await this.sdk.validatePassword(this.credentials.invalidPassword)
        await expect(async () => await this.sdk.validatePassword(this.credentials.validPassword)).toThrow({errorCode: PowerAuthErrorCode.NETWORK_ERROR})

        // back to original
        await this.sdk.changePassword(this.credentials.invalidPassword, this.credentials.validPassword)
        await this.sdk.validatePassword(this.credentials.validPassword)
        await expect(async () => await this.sdk.validatePassword(this.credentials.invalidPassword)).toThrow({errorCode: PowerAuthErrorCode.NETWORK_ERROR})
    }

    async testChangePasswordInTwoSteps() {
        const changeData = await this.sdk.beginPasswordChange(this.credentials.validPassword)
        await this.sdk.finishPasswordChange(this.credentials.invalidPassword, changeData)
        await this.sdk.validatePassword(this.credentials.invalidPassword)
        await expect(async () =>
            await this.sdk.finishPasswordChange(this.credentials.validPassword, changeData)
        ).toThrow({errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT})

        const restoreData = await this.sdk.beginPasswordChange(this.credentials.invalidPassword)
        await this.sdk.finishPasswordChange(this.credentials.validPassword, restoreData)
        await this.sdk.validatePassword(this.credentials.validPassword)
    }

    async testChangeSecurePasswordInTwoSteps() {
        const changeData = await this.sdk.beginPasswordChange(
            await importPassword(this.credentials.validPassword)
        )
        await this.sdk.finishPasswordChange(
            await importPassword(this.credentials.invalidPassword),
            changeData
        )
        await this.sdk.validatePassword(this.credentials.invalidPassword)

        const restoreData = await this.sdk.beginPasswordChange(
            await importPassword(this.credentials.invalidPassword)
        )
        await this.sdk.finishPasswordChange(
            await importPassword(this.credentials.validPassword),
            restoreData
        )
        await this.sdk.validatePassword(this.credentials.validPassword)
    }

    async testReleasePasswordChangeData() {
        const changeData = await this.sdk.beginPasswordChange(this.credentials.validPassword)
        await changeData.release()
        await changeData.release()
        await expect(async () =>
            await this.sdk.finishPasswordChange(this.credentials.invalidPassword, changeData)
        ).toThrow({errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT})
    }

    async testFailedFinishConsumesPasswordChangeData() {
        const changeData = await this.sdk.beginPasswordChange(this.credentials.validPassword)
        // Fail while resolving the new password without relying on a server-side password policy.
        await expect(async () =>
            await this.sdk.finishPasswordChange(undefined as unknown as string, changeData)
        ).toThrow()
        await expect(async () =>
            await this.sdk.finishPasswordChange(this.credentials.invalidPassword, changeData)
        ).toThrow({errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT})
    }

    async testPasswordChangeDataIsBoundToOwner() {
        const otherSdk = new PowerAuth(`other-${this.sdk.instanceId}`)
        await otherSdk.configure(
            await this.sdk.configuration,
            await this.sdk.clientConfiguration,
            await this.sdk.biometryConfiguration,
            await this.sdk.keychainConfiguration,
            await this.sdk.sharingConfiguration
        )
        try {
            const changeData = await this.sdk.beginPasswordChange(this.credentials.validPassword)
            await expect(async () =>
                await otherSdk.finishPasswordChange(this.credentials.invalidPassword, changeData)
            ).toThrow({errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT})
        } finally {
            await otherSdk.deconfigure()
        }
    }

    async testDeconfigurationInvalidatesPasswordChangeData() {
        const configuration = await this.sdk.configuration
        const clientConfiguration = await this.sdk.clientConfiguration
        const biometryConfiguration = await this.sdk.biometryConfiguration
        const keychainConfiguration = await this.sdk.keychainConfiguration
        const sharingConfiguration = await this.sdk.sharingConfiguration
        const changeData = await this.sdk.beginPasswordChange(this.credentials.validPassword)

        await this.sdk.deconfigure()
        await expect(async () =>
            await this.sdk.finishPasswordChange(this.credentials.invalidPassword, changeData)
        ).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED})

        await this.sdk.configure(
            configuration,
            clientConfiguration,
            biometryConfiguration,
            keychainConfiguration,
            sharingConfiguration
        )
    }

    async testChangeSecurePassword() {
        await this.sdk.changePassword(await importPassword(this.credentials.validPassword), await importPassword(this.credentials.invalidPassword))
        await this.sdk.validatePassword(await importPassword(this.credentials.invalidPassword))
        await expect(async () => await this.sdk.validatePassword(await importPassword(this.credentials.validPassword))).toThrow({errorCode: PowerAuthErrorCode.NETWORK_ERROR})

        // back to original
        await this.sdk.changePassword(await importPassword(this.credentials.invalidPassword), await importPassword(this.credentials.validPassword))
        await this.sdk.validatePassword(await importPassword(this.credentials.validPassword))
        await expect(async () => await this.sdk.validatePassword(await importPassword(this.credentials.invalidPassword))).toThrow({errorCode: PowerAuthErrorCode.NETWORK_ERROR})
    }

    async testChangePasswordUnsafe() {
        await this.sdk.changePasswordUnsafe(this.credentials.validPassword, this.credentials.invalidPassword)
        await this.sdk.validatePassword(this.credentials.invalidPassword)
        await this.sdk.changePasswordUnsafe(this.credentials.invalidPassword, this.credentials.validPassword)
        await this.sdk.validatePassword(this.credentials.validPassword)
    }

    async testChangeSecurePasswordUnsafe() {
        await this.sdk.unsafeChangePassword(await importPassword(this.credentials.validPassword), await importPassword(this.credentials.invalidPassword))
        await this.sdk.validatePassword(await importPassword(this.credentials.invalidPassword))
        await this.sdk.unsafeChangePassword(await importPassword(this.credentials.invalidPassword), await importPassword(this.credentials.validPassword))
        await this.sdk.validatePassword(await importPassword(this.credentials.validPassword))
    }

    async testReusePasswordObject() {
        const pValid = await importPassword(this.credentials.validPassword, false, this.sdk)
        const pInvalid = await importPassword(this.credentials.invalidPassword, false, this.sdk)

        await this.sdk.unsafeChangePassword(pValid, pInvalid)
        await this.sdk.validatePassword(pInvalid)
        await this.sdk.unsafeChangePassword(pInvalid, pValid)
        await this.sdk.validatePassword(pValid)
    }

    async testReuseUsedPasswordObject() {
        const pValid = await importPassword(this.credentials.validPassword, true, this.sdk)
        const pInvalid = await importPassword(this.credentials.invalidPassword, true, this.sdk)

        await this.sdk.unsafeChangePassword(pValid, pInvalid)
        await expect(async () => await this.sdk.validatePassword(pInvalid)).toThrow({errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT})
    }

    async testReusePasswordObjectInAuth() {
        const pValid = await importPassword(this.credentials.validPassword, false, this.sdk)
        const pInvalid = await importPassword(this.credentials.invalidPassword, false, this.sdk)
        
        const validAuth = PowerAuthAuthentication.password(pValid)
        const invalidAuth = PowerAuthAuthentication.password(pInvalid)

        let header = await this.sdk.authenticationHeaderForRequestWithBody(validAuth, 'POST', '/some/uriId', '{}')
        expect((await this.helper.verifySignature('POST', '/some/uriId', '{}', header.value)).signatureValid).toBe(true)
        header = await this.sdk.authenticationHeaderForRequestWithBody(validAuth, 'POST', '/some/uriId', '{}')
        expect((await this.helper.verifySignature('POST', '/some/uriId', '{}', header.value)).signatureValid).toBe(true)

        header = await this.sdk.authenticationHeaderForRequestWithBody(invalidAuth, 'POST', '/some/uriId', '{}')
        expect((await this.helper.verifySignature('POST', '/some/uriId', '{}', header.value)).signatureValid).toBe(false)
        header = await this.sdk.authenticationHeaderForRequestWithBody(invalidAuth, 'POST', '/some/uriId', '{}')
        expect((await this.helper.verifySignature('POST', '/some/uriId', '{}', header.value)).signatureValid).toBe(false)
    }

    async testReuseUsedPasswordObjectInAuth() {
        const pValid = await importPassword(this.credentials.validPassword, true, this.sdk)
        const pInvalid = await importPassword(this.credentials.invalidPassword, true, this.sdk)
        
        const validAuth = PowerAuthAuthentication.password(pValid)
        const invalidAuth = PowerAuthAuthentication.password(pInvalid)

        let header = await this.sdk.authenticationHeaderForRequestWithBody(validAuth, 'POST', '/some/uriId', '{}')
        expect((await this.helper.verifySignature('POST', '/some/uriId', '{}', header.value)).signatureValid).toBe(true)
        await expect(async () => await this.sdk.authenticationHeaderForRequestWithBody(validAuth, 'POST', '/some/uriId', '{}')).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })

        header = await this.sdk.authenticationHeaderForRequestWithBody(invalidAuth, 'POST', '/some/uriId', '{}')
        expect((await this.helper.verifySignature('POST', '/some/uriId', '{}', header.value)).signatureValid).toBe(false)
        await expect(async () => await this.sdk.authenticationHeaderForRequestWithBody(invalidAuth, 'POST', '/some/uriId', '{}')).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
    }
}
