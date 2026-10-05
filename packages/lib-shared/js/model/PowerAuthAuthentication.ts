/*
 * Copyright 2021 Wultra s.r.o.
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

import { PowerAuthRawAuthentication } from "./PowerAuthNativeTypes"
import { PasswordType } from "./PowerAuthPassword"
import { PowerAuthError, PowerAuthErrorCode } from "./PowerAuthError"

/**
 * Interface defines strings used to display platform specific biometric authentication dialog.
 */
export interface PowerAuthBiometricPrompt {
    /**
     * Prompt displayed to the user.
     * 
     * For example: "Please authorize the payment with the biometric sensor"
     */
    readonly promptMessage: string
    /**
     * Android specific title, displayed to the user. You have to provide this value on Android platform.
     * 
     * For example: "Payment authorization"
     */
    readonly promptTitle?: string
    /**
     * Android specific subtitle, displayed to the user.
     */
    readonly promptSubtitle?: string
    /**
     * iOS specific title for a cancel button, displayed to the user.
     */
    readonly cancelButtonTitle?: string
    /**
     * iOS specific title for a fallback button, displayed to the user.
     */
    readonly fallbackButtonTitle?: string
    /**
     * iOS specific title for a cancel button, displayed to the user.
     * @deprecated Use `cancelButtonTitle`.
     */
    readonly cancelButton?: string
    /**
     * iOS specific title for a fallback button, displayed to the user.
     * @deprecated Use `fallbackButtonTitle`.
     */
    readonly fallbackButton?: string
}

/**
 * Token that allows only the static factory methods to construct `PowerAuthAuthentication`.
 */
const FACTORY_TOKEN = Symbol('PowerAuthAuthentication.factory')

/**
 * Class representing a multi-factor authentication object.
 *
 * Use static factory methods to create an instance. The constructor is not public.
 */
export class PowerAuthAuthentication {
    /**
     * Password to be used for knowledge factor, or undefined if knowledge factor should not be used.
     */
    readonly password?: PasswordType
    /**
     * If set, then the biometry factor will be used for the authentication.
     */
    readonly biometricPrompt?: PowerAuthBiometricPrompt
    /**
     * Indicates that this authentication object should be used for activation persist. 
     */
    get isActivationPersist(): boolean {
        return this.isPersist
    }

    /**
     * Indicates that this authentication object is for biometric authentication.
     */
    get isBiometricAuthentication(): boolean {
        return this.isBiometry
    }

    /**
     * Create object configured to authenticate with possession factor only.
     * @returns Authentication object configured for authentication with possession factor only. 
     */
    static possession(): PowerAuthAuthentication {
        return new PowerAuthAuthentication(FACTORY_TOKEN, false, false, undefined, undefined)
    }

    /**
     * Create object configured to authenticate with combination of possession and biometry factors.
     * @param biometricPrompt Prompt to be displayed.
     * @returns Authentication object configured to authenticate with possession and biometry factors.
     */
    static biometry(biometricPrompt: PowerAuthBiometricPrompt): PowerAuthAuthentication {
        return new PowerAuthAuthentication(FACTORY_TOKEN, false, true, undefined, biometricPrompt ?? PowerAuthAuthentication.FALLBACK_PROMPT)
    }

    /**
     * Create object configured to authenticate with combination of possession and knowledge factors.
     * @param password User's password.
     * @returns Authentication object configured to authenticate with possession and knowledge factors.
     */
    static password(password: PasswordType): PowerAuthAuthentication {
        return new PowerAuthAuthentication(FACTORY_TOKEN, false, false, password, undefined)
    }

    /**
     * Create object configured to persist activation with password.
     * @param password User's password. You can provide string or `PowerAuthPassword` object.
     * @returns Object configured to persist activation with password.
     */
    static persistWithPassword(password: PasswordType): PowerAuthAuthentication {
        return new PowerAuthAuthentication(FACTORY_TOKEN, true, false, password, undefined)
    }

    /**
     * Create object configured to persist activation with password and biometry.
     * @param password User's password. You can provide string or `PowerAuthPassword` object.
     * @param biometricPrompt Required on Android, only when biometry config has `authenticateOnBiometricKeySetup` set to `true`.
     * @returns Object configured to persist activation with password and biometry.
     */
    static persistWithPasswordAndBiometry(password: PasswordType, biometricPrompt: PowerAuthBiometricPrompt | undefined = undefined): PowerAuthAuthentication {
        return new PowerAuthAuthentication(FACTORY_TOKEN, true, true, password, biometricPrompt)
    }

    // Private implementation

    /**
     * Construct authentication object. Use static factory methods instead.
     * @param token Token allowing construction only from static factory methods.
     * @param isPersist Value for isPersist property.
     * @param isBiometry Value for isBiometry property.
     * @param password Password to be used for knowledge factor.
     * @param biometricPrompt Prompt for biometric authentication.
     */
    private constructor(token: symbol, isPersist: boolean, isBiometry: boolean, password: PasswordType | undefined, biometricPrompt: PowerAuthBiometricPrompt | undefined) {
        if (token !== FACTORY_TOKEN) {
            // Plain JavaScript code can still call the constructor.
            throw new PowerAuthError(undefined, 'PowerAuthAuthentication constructor is not public. Use static factory methods to create the object.', PowerAuthErrorCode.WRONG_PARAMETER)
        }
        this.password = password
        this.biometricPrompt = biometricPrompt
        this.isPersist = isPersist
        this.isBiometry = isBiometry
        this.isReusable = false
    }

    /**
     * Indicates that object should be used for activation persist.
     */
    private isPersist: boolean
    /**
     * Indicate that object use biometric authentication.
     */
    private isBiometry: boolean
    /**
     * Indicate that this object has reusable biometry.
     */
    private isReusable: boolean
    /**
     * Contains identifier for data object containing biometry key, allocated 
     * in native code. Check `AuthResolver.ts` for more details.
     */
    private biometryKeyId?: string

    /**
     * Function convert authentication object into immutable object that can be passed to the natrive bridge.
     * You suppose not use this function in the application code.
     * 
     * @returns Frozen object with data for authentication.
     */
    async toRawAuthentication(): Promise<PowerAuthRawAuthentication> {
        const rawPassword = this.password !== undefined
                    ? (typeof this.password === 'string' ? this.password  : await this.password.toRawPassword()) 
                    : undefined
        return Object.freeze({
            password: rawPassword,
            biometricPrompt: this.biometricPrompt,
            biometryKeyId: this.biometryKeyId,
            isPersist: this.isPersist,
            isReusable: this.isReusable,
            isBiometry: this.isBiometry,
        })
    }

    // Fallback strings

    private static FALLBACK_PROMPT: PowerAuthBiometricPrompt = {
        promptMessage: '< missing message >',
        promptTitle: '< missing title >'
    }
}
