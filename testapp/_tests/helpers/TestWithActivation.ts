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

import { PowerAuth, PowerAuthAuthentication } from "react-native-powerauth-mobile-sdk";
import { TestSuite } from "mobile-testbed";
import { CustomConfig, IntegrationHelper } from "../../src/IntegrationUtils";

/**
 * Set of various activation credentials.
 */
export interface ActivationCredentials {
    /**
     * Authentication for possession factor only.
     */
    possession: PowerAuthAuthentication
    /**
     * Authentication for possession & knowledge factors.
     */
    knowledge: PowerAuthAuthentication
    /**
     * Authentication for possession & invalid knowledge factors.
     */
    invalidKnowledge: PowerAuthAuthentication
    /**
     * Authentication for persisting activation with a valid password.
     */
    persistence: PowerAuthAuthentication
    /**
     * Authentication for persisting activation with an invalid password.
     */
    invalidPersistence: PowerAuthAuthentication
    /**
     * Authenticatio for posession & biometry factors.
     */
    biometry: PowerAuthAuthentication

    /**
     * String with a valid password.
     */
    validPassword: string
    /**
     * String with an invalid password.
     */
    invalidPassword: string
}

/**
 * Base test suite for tests that require valid activation. You can override the default behafior by changing
 * `automaticallyCreateActivationHelper` and `automaticallyCreateActivation` in the custom `beforeAll()` method.
 */
export class TestWithActivation extends TestSuite {
    
    /**
     * Overridable method. If returns true, then helper will automatically create an activation in `beforeEach()` method.
     */
    shouldCreateActivationBeforeTest(): boolean {
        return true
    }

    /**
     * Overridable method. Provides custom configuration for the test.
     */
    provideCustomConfig(): CustomConfig {
        return { }
    }

    /** Overridable method. If returns true, then helper will use biometric authentication during the activation setup. */
    activateWithBiometrics(): boolean {
        return false
    }

    protected helper!: IntegrationHelper
    protected sdk!: PowerAuth
    protected credentials!: ActivationCredentials

    /**
     * Function generate a set of PowerAuthAuthentication credentials.
     * @returns Object containing various credentials.
     */
    generateActivationCredentials(): ActivationCredentials {
        const availablePasswords = [ "VerySecure", "1234", "nbusr123", "39h132v,kJdfvAl", "98765", "correct horse battery staple" ]
        const validIndex = Math.floor(Math.random() * availablePasswords.length)
        const validPassword = availablePasswords[validIndex]
        const invalidPassword = availablePasswords[(validIndex + 1) % availablePasswords.length]
        return {
            possession: PowerAuthAuthentication.possession(),
            knowledge: PowerAuthAuthentication.password(validPassword),
            invalidKnowledge: PowerAuthAuthentication.password(invalidPassword),
            persistence: PowerAuthAuthentication.persistWithPassword(validPassword),
            invalidPersistence: PowerAuthAuthentication.persistWithPassword(invalidPassword),
            biometry: PowerAuthAuthentication.biometry({
                promptTitle: 'Authenticate',
                promptMessage: 'Please authenticate with biometry'
            }),
            validPassword: validPassword,
            invalidPassword: invalidPassword
        }
    }

    // Overrided methods

    async beforeEach() {
        await super.beforeEach()

        this.credentials = this.generateActivationCredentials()
        this.sdk = new PowerAuth(IntegrationHelper.randomString(30))
        this.helper = new IntegrationHelper(this.sdk)
        await this.helper.configure(this.provideCustomConfig())
        if (this.shouldCreateActivationBeforeTest()) {
            await this.helper.prepareActiveActivation(this.credentials.validPassword, undefined, this.activateWithBiometrics())
        }
    }

    async afterEach() {
        await super.afterEach()
        await this.helper?.cleanup()
    }
}
