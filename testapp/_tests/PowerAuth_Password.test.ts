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

import { PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";
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
}