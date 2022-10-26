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

import { PowerAuthAuthentication, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";
import { importPassword } from "./helpers/PasswordHelper";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_PasswordTests extends TestWithActivation {
    async testValidatePassword() {
        // Valid password
        await this.sdk.validatePassword(this.credentials.validPassword)
        // Wrong password
        await expect(async () => this.sdk.validatePassword(this.credentials.invalidPassword)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
        // TODO: wrong param
        await expect(async () => this.sdk.validatePassword('12')).toThrow({errorCode: PowerAuthErrorCode.SIGNATURE_ERROR})
    }

    async testValidateSecurePassword() {
        // Valid password
        await this.sdk.validatePassword(await importPassword(this.credentials.validPassword))
        // Wrong password
        await expect(async () => this.sdk.validatePassword(await importPassword(this.credentials.invalidPassword))).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
        // TODO: wrong param
        await expect(async () => this.sdk.validatePassword(await importPassword('12'))).toThrow({errorCode: PowerAuthErrorCode.SIGNATURE_ERROR})
    }

    async testChangePassword() {
        await this.sdk.changePassword(this.credentials.validPassword, this.credentials.invalidPassword)
        await this.sdk.validatePassword(this.credentials.invalidPassword)
        await expect(async () => this.sdk.validatePassword(this.credentials.validPassword)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})

        // back to original
        await this.sdk.changePassword(this.credentials.invalidPassword, this.credentials.validPassword)
        await this.sdk.validatePassword(this.credentials.validPassword)
        await expect(async () => this.sdk.validatePassword(this.credentials.invalidPassword)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})

        // TODO: INVALID_ACTIVATION_STATE, WRONG_PARAM expected
        // await expect(async () => this.sdk.changePassword(this.credentials.validPassword, '12')).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
        // TODO: WRONG_PARAM expected
        await expect(async () => this.sdk.changePassword('12', this.credentials.validPassword)).toThrow({errorCode: PowerAuthErrorCode.SIGNATURE_ERROR})
    }

    async testChangeSecurePassword() {
        await this.sdk.changePassword(await importPassword(this.credentials.validPassword), await importPassword(this.credentials.invalidPassword))
        await this.sdk.validatePassword(await importPassword(this.credentials.invalidPassword))
        await expect(async () => this.sdk.validatePassword(await importPassword(this.credentials.validPassword))).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})

        // back to original
        await this.sdk.changePassword(await importPassword(this.credentials.invalidPassword), await importPassword(this.credentials.validPassword))
        await this.sdk.validatePassword(await importPassword(this.credentials.validPassword))
        await expect(async () => this.sdk.validatePassword(this.credentials.invalidPassword)).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})

        // TODO: INVALID_ACTIVATION_STATE, WRONG_PARAM expected
        // await expect(async () => this.sdk.changePassword(this.credentials.validPassword, '12')).toThrow({errorCode: PowerAuthErrorCode.AUTHENTICATION_ERROR})
        // TODO: WRONG_PARAM expected
        await expect(async () => this.sdk.changePassword(await importPassword('12'), this.credentials.validPassword)).toThrow({errorCode: PowerAuthErrorCode.SIGNATURE_ERROR})
    }

    async testChangePasswordUnsafe() {
        await this.sdk.unsafeChangePassword(this.credentials.validPassword, this.credentials.invalidPassword)
        await this.sdk.validatePassword(this.credentials.invalidPassword)
        await this.sdk.unsafeChangePassword(this.credentials.invalidPassword, this.credentials.validPassword)
        await this.sdk.validatePassword(this.credentials.validPassword)

        // TODO: WRONG_PARAM expected
        //await expect(async () => this.sdk.changePassword('12', this.credentials.validPassword)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})
        // TODO: WRONG_PARAM expected
        //await expect(async () => this.sdk.changePassword(this.credentials.validPassword, '12')).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})
    }

    async testChangeSecurePasswordUnsafe() {
        await this.sdk.unsafeChangePassword(await importPassword(this.credentials.validPassword), await importPassword(this.credentials.invalidPassword))
        await this.sdk.validatePassword(await importPassword(this.credentials.invalidPassword))
        await this.sdk.unsafeChangePassword(await importPassword(this.credentials.invalidPassword), await importPassword(this.credentials.validPassword))
        await this.sdk.validatePassword(await importPassword(this.credentials.validPassword))

        // TODO: WRONG_PARAM expected
        //await expect(async () => this.sdk.changePassword('12', this.credentials.validPassword)).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})
        // TODO: WRONG_PARAM expected
        //await expect(async () => this.sdk.changePassword(this.credentials.validPassword, '12')).toThrow({errorCode: PowerAuthErrorCode.INVALID_ACTIVATION_STATE})
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
        const signatureHelper = this.helper.signatureHelper
        
        const validAuth = new PowerAuthAuthentication()
        validAuth.userPassword = pValid
        const invalidAuth = new PowerAuthAuthentication()
        invalidAuth.userPassword = pInvalid

        let header = await this.sdk.requestSignature(validAuth, 'POST', '/some/uriId', '{}')
        expect(await signatureHelper.verifyOnlineSignature('POST', '/some/uriId', '{}', header.value)).toBe(true)
        header = await this.sdk.requestSignature(validAuth, 'POST', '/some/uriId', '{}')
        expect(await signatureHelper.verifyOnlineSignature('POST', '/some/uriId', '{}', header.value)).toBe(true)
        
        header = await this.sdk.requestSignature(invalidAuth, 'POST', '/some/uriId', '{}')
        expect(await signatureHelper.verifyOnlineSignature('POST', '/some/uriId', '{}', header.value)).toBe(false)
        header = await this.sdk.requestSignature(invalidAuth, 'POST', '/some/uriId', '{}')
        expect(await signatureHelper.verifyOnlineSignature('POST', '/some/uriId', '{}', header.value)).toBe(false)
    }

    async testReuseUsedPasswordObjectInAuth() {
        const pValid = await importPassword(this.credentials.validPassword, true, this.sdk)
        const pInvalid = await importPassword(this.credentials.invalidPassword, true, this.sdk)
        const signatureHelper = this.helper.signatureHelper
        
        const validAuth = new PowerAuthAuthentication()
        validAuth.userPassword = pValid
        const invalidAuth = new PowerAuthAuthentication()
        invalidAuth.userPassword = pInvalid

        let header = await this.sdk.requestSignature(validAuth, 'POST', '/some/uriId', '{}')
        expect(await signatureHelper.verifyOnlineSignature('POST', '/some/uriId', '{}', header.value)).toBe(true)
        await expect(async () => this.sdk.requestSignature(validAuth, 'POST', '/some/uriId', '{}')).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })

        header = await this.sdk.requestSignature(invalidAuth, 'POST', '/some/uriId', '{}')
        expect(await signatureHelper.verifyOnlineSignature('POST', '/some/uriId', '{}', header.value)).toBe(false)
        await expect(async () => this.sdk.requestSignature(invalidAuth, 'POST', '/some/uriId', '{}')).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
    }
}