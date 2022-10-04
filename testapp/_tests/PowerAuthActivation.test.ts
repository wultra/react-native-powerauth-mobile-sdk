/*
 * Copyright 2022 Wultra s.r.o.
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

import { PowerAuthActivation } from "react-native-powerauth-mobile-sdk";
import { expect, TestSuite } from "../src/testbed";

export class PowerAuthActivationTests extends TestSuite {

    readonly name = 'Test Name'

    testRegularActivation() {
        const a1 = PowerAuthActivation.createWithActivationCode('VVVVV-VVVVV-VVVVV-VTFVA', this.name)
        expect(a1).toBeDefined()
        expect(a1.activationCode).toBe('VVVVV-VVVVV-VVVVV-VTFVA')
        expect(a1.activationName).toBe(this.name)
        expect(a1.additionalActivationOtp).toBeUndefined()
        expect(a1.customAttributes).toBeUndefined()
        expect(a1.extras).toBeUndefined()
        expect(a1.identityAttributes).toBeUndefined()
        expect(a1.recoveryCode).toBeUndefined()
        expect(a1.recoveryPuk).toBeUndefined()

        const a2 = PowerAuthActivation.createWithActivationCode('3PZ2Z-DOXSL-PSSQI-I5VBA#MEQCIHP3LQ7WLDEPe8WCgdQ8CSwyxbErroYlGO+K6pIX1JyhAiAn6wEnaNp1mDdKlWb16Ma8eTKycRcZ+75TYV/zn0yvFw==', this.name)
        expect(a2).toBeDefined()
        expect(a2.activationCode).toBe('3PZ2Z-DOXSL-PSSQI-I5VBA#MEQCIHP3LQ7WLDEPe8WCgdQ8CSwyxbErroYlGO+K6pIX1JyhAiAn6wEnaNp1mDdKlWb16Ma8eTKycRcZ+75TYV/zn0yvFw==')
    }

    testRecoveryActivation() {
        const a1 = PowerAuthActivation.createWithRecoveryCode('VVVVV-VVVVV-VVVVV-VTFVA', '0123456789', this.name)
        expect(a1).toBeDefined()
        expect(a1.activationCode).toBeUndefined()
        expect(a1.activationName).toBe(this.name)
        expect(a1.additionalActivationOtp).toBeUndefined()
        expect(a1.customAttributes).toBeUndefined()
        expect(a1.extras).toBeUndefined()
        expect(a1.identityAttributes).toBeUndefined()
        expect(a1.recoveryCode).toBe('VVVVV-VVVVV-VVVVV-VTFVA')
        expect(a1.recoveryPuk).toBe('0123456789')
    }

    testCustomActivation() {
        const attributes = {
            login: 'juraj',
            password: 'nbusr123'
        }
        const a1 = PowerAuthActivation.createWithIdentityAttributes(attributes, this.name)
        expect(a1).toBeDefined()
        expect(a1).toBeDefined()
        expect(a1.activationCode).toBeUndefined()
        expect(a1.activationName).toBe(this.name)
        expect(a1.additionalActivationOtp).toBeUndefined()
        expect(a1.customAttributes).toBeUndefined()
        expect(a1.extras).toBeUndefined()
        expect(a1.identityAttributes).toBeDefined()
        expect(a1.identityAttributes?.login).toBe('juraj')
        expect(a1.identityAttributes?.password).toBe('nbusr123')
        expect(a1.recoveryCode).toBeUndefined()
        expect(a1.recoveryPuk).toBeUndefined()
    }
}