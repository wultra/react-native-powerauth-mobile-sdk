//
// Copyright 2025 Wultra s.r.o.
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

import { PowerAuthError, PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { expect } from "mobile-testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_ErrorDataTests extends TestWithActivation {

    async testErrorContainsParsedData() {
        let errorThrown = false
        try {
            await this.sdk.validatePassword(this.credentials.invalidPassword)
        } catch (e) {
            errorThrown = true
            expect(e instanceof PowerAuthError).toBe(true)
            const error = e as PowerAuthError

            expect(error.code).toBe(PowerAuthErrorCode.AUTHENTICATION_ERROR)
            expect(error.errorData).toBeDefined()
            expect(typeof error.errorData.httpStatusCode).toBe('number')
            expect(error.errorData.httpStatusCode).toBe(401)
            expect(typeof error.errorData.responseBody).toBe('string')
        }
        expect(errorThrown).toBe(true)
    }

    async testResponseErrorContainsParsedData() {
        let errorThrown = false
        try {
            await this.sdk.confirmRecoveryCode('AAAAA-AAAAA-AAAAA-AAAAA', this.credentials.knowledge)
        } catch (e) {
            errorThrown = true
            expect(e instanceof PowerAuthError).toBe(true)
            const error = e as PowerAuthError

            expect(error.code === PowerAuthErrorCode.RESPONSE_ERROR || error.code === PowerAuthErrorCode.AUTHENTICATION_ERROR).toBe(true)
            expect(error.errorData).toBeDefined()
            expect(typeof error.errorData.httpStatusCode).toBe('number')
        }
        expect(errorThrown).toBe(true)
    }
}
