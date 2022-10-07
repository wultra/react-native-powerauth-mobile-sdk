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

import { 
    PowerAuth,
    PowerAuthActivation,
    PowerAuthAuthentication,
    PowerAuthCreateActivationResult } from "react-native-powerauth-mobile-sdk";
import {
    Activation,
    ActivationStatus } from "powerauth-js-test-client";
import { 
    RNActivationHelper,
    createActivationHelper,
    CustomActivationHelperPrepareData } from "./RNActivationHelper";
import { TestWithServer } from "./TestWithServer";

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
export class TestWithActivation extends TestWithServer {

    /**
     * Overridable method. If returns true, then `RNActivationHelper` is automatically created in `beforeAll()` method.
     * If you return this variable to false, then you have to provide your own object to `helperInstance` property.
     */
    shouldCreateActivationHelper(): boolean {
        return true
    }
    /**
     * Overridable method. If returns true, then helper will automatically create an activation in `beforeEach()` method.
     */
    shouldCreateActivationBeforeTest(): boolean {
        return true
    }

    /**
     * Overridable method. If returns true, then helper will automatically remove local activation in `beforeEach()` method.
     * This is recommended to set to `true`. You normally don't need to keep activation between the tests.
     */
    shouldRemoveActivationBeforeTest(): boolean {
        return true
    }

    /**
     * Overridable method. If returns true, then helper will automatically remove local activation in `afterEach()` method.
     * This is recommended to set to `true`. You normally don't need to keep activation between the tests.
     */
    shouldRemoveActivationAfterTest(): boolean {
        return true
    }
    

    protected helperInstance?: RNActivationHelper
    protected credentialsData?: ActivationCredentials

    /**
     * Contains instance of `RNActivationHelper`. Throws an error if no such instance is available yet.
     */
    get helper(): RNActivationHelper {
        if (!this.helperInstance) {
            throw new Error('RNActivationHelper instance is not set')
        }
        return this.helperInstance
    }

    /**
     * Contains `Activation` data once the activation is created.
     */
    get activation(): Activation {
        return this.helper.activation
    }

    /**
     * Contains `PowerAuthCreateActivationResult` once the activation is created.
     */
    get activationResult(): PowerAuthCreateActivationResult {
        return this.helper.prepareActivationResult
    }

    /**
     * Contains instnace of `PowerAuth` if helper created such instance.
     */
    get sdk(): PowerAuth {
        return this.helper.powerAuthSdk
    }

    /**
     * Contains ActivationCredentials generated for each test. 
     */
    get credentials(): ActivationCredentials {
        if (!this.credentialsData) {
            this.credentialsData = this.generateActivationCredentials()
        }
        return this.credentialsData
    }

    /**
     * Create PowerAuth instance.
     * @returns Promise with PowerAuth result.
     */
     createSdk(): Promise<PowerAuth> {
        return this.helper.getPowerAuthSdk(this.customPrepareData())
    }

    /**
     * Function generate a set of PowerAuthAuthentication credentials.
     * @returns 
     */
    generateActivationCredentials(): ActivationCredentials {
        const availablePasswords = [ "VerySecure", "1234", "nbusr123", "39h132v,kJdfvAl", "98765", "correct horse battery staple" ]
        const validIndex = Math.floor(Math.random() * availablePasswords.length)
        const invalidIndex = (validIndex + 1) % availablePasswords.length

        const possession = new PowerAuthAuthentication()
        possession.usePossession = true
        
        const knowledge = new PowerAuthAuthentication()
        knowledge.usePossession = true
        knowledge.userPassword = availablePasswords[validIndex]

        const biometry = new PowerAuthAuthentication()
        biometry.usePossession = true
        biometry.useBiometry = true
        biometry.biometryTitle = "Authenticate with biometry"
        biometry.biometryMessage = "Please authenticate with biometry"
        
        const invalid = new PowerAuthAuthentication()
        invalid.usePossession = true
        invalid.userPassword = availablePasswords[invalidIndex]

        return {
            possession: possession,
            knowledge: knowledge,
            invalidKnowledge: invalid,
            biometry: biometry,
            validPassword: knowledge.userPassword!,
            invalidPassword: invalid.userPassword!
        }
    }

    /**
     * Overridable method that can provide `CustomActivationHelperPrepareData`.
     * @returns `undefined` in default implementation.
     */
    customPrepareData(): CustomActivationHelperPrepareData {
        return {
            password: this.credentials.validPassword
        }
    }

    /**
     * Overridable method that can adjust `PowerAuthActivation` before the activation is created.
     * @param activation Activation creation data.
     */
    beforeCreateActivation(activation: PowerAuthActivation): void { 
        // EMPTY
    }


    // Overrided methods

    async beforeEach() {
        await super.beforeEach()
        // Invalidate credentials to generate set of passwords for each test.
        this.credentialsData = undefined
        // If automatic activation creation is set, then do it.
        if (this.shouldCreateActivationHelper()) {
            this.debugInfo('Creating activation helper')
            const helper = await createActivationHelper(this.serverApi, this.context.config, (activation) => this.beforeCreateActivation(activation))
            this.helperInstance = helper
            const prepareData = this.customPrepareData()
            if (this.shouldRemoveActivationBeforeTest()) {
                await this.cleanupActivation(prepareData)
            }
            if (this.shouldCreateActivationBeforeTest()) {
                await this.helper.createActivation(undefined, prepareData)
                this.debugInfo(`Using activation ${this.activation.activationId}`)
            }
        }
    }

    async afterEach() {
        await super.afterEach()
        if (this.helperInstance !== undefined) {
            const sdk = await this.helperInstance.getPowerAuthSdk(this.customPrepareData())
            if (this.shouldRemoveActivationAfterTest()) {
                await this.cleanupActivation(this.customPrepareData())
            }
        }
    }

    private async cleanupActivation(prepareData: CustomActivationHelperPrepareData) {
        if (this.helperInstance === undefined) {
            return
        }
        const sdk = await this.helperInstance.getPowerAuthSdk(prepareData)
        if (await sdk.hasValidActivation()) {
            const activationId = await sdk.getActivationIdentifier()
            this.debugInfo(`Removing activation ${activationId}`)
            const status = (await this.serverApi.getActivationDetil(activationId)).activationStatus
            // If status is not 'REMOVED' then remove the activation on the server.
            if (status !== ActivationStatus.REMOVED) {
                await this.serverApi.activationRemove(activationId)
            }
            // And then remove the activation locally
            await sdk.removeActivationLocal()
        }
        // Otherwise just cleanup the activation if activation is in right state.
        await this.helperInstance.cleanup()
    }
}