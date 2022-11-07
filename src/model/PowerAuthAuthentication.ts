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

import { RawAuthentication } from "../internal/NativeTypes"
import { PasswordType } from "./PowerAuthPassword"

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
     * iOS specific title for a cancel button, displayed to the user.
     */
     readonly cancelButton?: string
    /**
     * iOS specific title for a fallback button, displayed to the user.
     */
     readonly fallbackButton?: string
}

/**
 * Class representing a multi-factor authentication object.
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
     * Indicates that this authentication object should be used for activation commit. 
     */
    get isActivationCommit(): boolean {
        return this.isCommit ?? false
    }

    /**
     * Indicates that this authentication object is for biometric authentication.
     */
    get isBiometricAuthentication(): boolean {
        return this.isBiometry || this.useBiometry
    }

    /**
     * Construct authentication object with combination of factors. 
     * @deprecated Please use static methods to create `PowerAuthAuthentication` object.
     * @param password Password to be used for knowledge factor, or undefined if knowledge factor should not be used.
     * @param biometricPrompt If set, then the biometry factor will be used for the authentication.
     */
    constructor(password: PasswordType | undefined = undefined, biometricPrompt: PowerAuthBiometricPrompt | undefined = undefined) {
        this.password = password
        this.biometricPrompt = biometricPrompt
        this.isBiometry = biometricPrompt !== undefined
        this.isReusable = false
    }

    /**
     * Create object configured to authenticate with possession factor only.
     * @returns Authentication object configured for authentication with possession factor only. 
     */
    static possession(): PowerAuthAuthentication {
        return new PowerAuthAuthentication(undefined, undefined).configure(false)
    }

    /**
     * Create object configured to authenticate with combination of possession and biometry factors.
     * @param biometricPrompt Prompt to be displayed.
     * @returns Authentication object configured to authenticate with possession and biometry factors.
     */
    static biometry(biometricPrompt: PowerAuthBiometricPrompt): PowerAuthAuthentication {
        return new PowerAuthAuthentication(undefined, biometricPrompt ?? FALLBACK_PROMPT).configure(false, true)
    }

    /**
     * Create object configured to authenticate with combination of possession and knowledge factors.
     * @param password User's password.
     * @returns Authentication object configured to authenticate with possession and knowledge factors.
     */
    static password(password: PasswordType): PowerAuthAuthentication {
        return new PowerAuthAuthentication(password, undefined).configure(false)
    }

    /**
     * Create object configured to commit activation with password.
     * @param password User's password. You can provide string or `PowerAuthPassword` object.
     * @returns Object configured to commit activation with password.
     */
    static commitWithPassword(password: PasswordType): PowerAuthAuthentication {
        return new PowerAuthAuthentication(password, undefined).configure(true)
    }

    /**
     * Create object configured to commit activation with password and biometry.
     * @param password User's password. You can provide string or `PowerAuthPassword` object.
     * @param biometricPrompt Required on Android, only when biometry config has `authenticateOnBiometricKeySetup` set to `true`.
     * @returns Object configured to commit activation with password and biometry.
     */
    static commitWithPasswordAndBiometry(password: PasswordType, biometricPrompt: PowerAuthBiometricPrompt | undefined = undefined): PowerAuthAuthentication {
        return new PowerAuthAuthentication(password, biometricPrompt).configure(true, true)
    }


    // Private implementation

    /**
     * Configure object after its construction. The method is private, because we don't want to expose internal flags to
     * application developers. We'll fix this once we remove the deprecated properties in the next major release.
     * @param commit Value for isCommit property. 
     * @param biometry Value for isBiometry property.
     * @param reusable Value for isReusable property. If not provided, then false is used.
     * @returns this
     */
    private configure(commit: boolean | undefined, biometry: boolean = false, reusable: boolean = false): PowerAuthAuthentication {
        this.isCommit = commit
        this.isBiometry = biometry
        this.isReusable = reusable
        return this
    }

    /**
     * Indicates that object should be used for activation commit. If not defined, then the object was
     * constructed with using deprecated properties.
     */
    private isCommit?: boolean
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
     * Construct `PowerAuthBiometricPrompt` object from data available in this authentication object.
     * This is a temporary solution for compatibility with older apps that still use old way of authentication setup.
     * @returns PowerAuthBiometricPrompt object.
     */
    private getBiometricPrompt(): PowerAuthBiometricPrompt {
        if (this.biometricPrompt) {
            return this.biometricPrompt
        }
        // Authentication object was constructed in legacy mode,
        // so create a fallback object.
        return {
            promptMessage: this.biometryMessage ?? FALLBACK_MESSAGE,
            promptTitle: this.biometryTitle ?? FALLBACK_TITLE
        }
    }

    /**
     * If required, then converts a legacy constructed authentication object into
     * object supporting new properties introduced in version 2.3.0. This is a temporary 
     * solution to achieve a compatibility with older apps that still use old way of
     * authentication setup.
     * 
     * > Do not use this function in application code.
     * 
     * @param forCommit If true, this conversion is for activation commit purposes.
     * @returns New authentication object created from the legacy properties, otherwise `this`.
     */
    convertLegacyObject(forCommit: boolean): PowerAuthAuthentication {
        if (this.isCommit === undefined) {
            // This is a legacy object, so we have to create a new one to make sure that
            // the native code will reach to all new properties.
            const prompt = this.useBiometry ? this.getBiometricPrompt() : undefined
            return new PowerAuthAuthentication(this.userPassword, prompt)
                        .configure(forCommit, this.useBiometry, this.isReusable)
        }
        return this
    }

    // Deprecated public properties.

    /**
     * Indicates if a possession factor should be used. The value should be always true.
     * @deprecated Direct access to property is now deprecated, use new static methods to construct `PowerAuthAuthentication` object.
     */
    usePossession: boolean = true
    /**
     * Indicates if a biometry factor should be used.
     * @deprecated Direct access to property is now deprecated, use new static methods to construct `PowerAuthAuthentication` object.
     */
    useBiometry: boolean = false
    /** 
     * Password to be used for knowledge factor, or undefined if knowledge factor should not be used.
     * You can use `PowerAuthPassword` object or regular `string` as an user's password.
     * @deprecated Direct access to property is now deprecated, use new static methods to construct `PowerAuthAuthentication` object.
     */
    userPassword?: PasswordType
    /**
     * Message displayed when prompted for biometric authentication.
     * @deprecated Direct access to property is now deprecated, use new static methods to construct `PowerAuthAuthentication` object.
     */
    biometryMessage?: string
    /**
     * (Android only) Title of biometric prompt.
     * @deprecated Direct access to property is now deprecated, use new static methods to construct `PowerAuthAuthentication` object.
     */
    biometryTitle?: string

    /**
     * Function convert authentication object into immutable object that can be passed to the natrive bridge.
     * You suppose not use this function in the application code.
     * 
     * @returns Frozen object with data for authentication.
     */
    async toRawAuthentication(): Promise<RawAuthentication> {
        const rawPassword = this.password !== undefined
                    ? (typeof this.password === 'string' ? this.password  : await this.password.toRawPassword()) 
                    : undefined
        return Object.freeze({
            password: rawPassword,
            biometricPrompt: this.biometricPrompt,
            biometryKeyId: this.biometryKeyId,
            isCommit: this.isCommit,
            isReusable: this.isReusable,
            isBiometry: this.isBiometry,
        })
    }
}

// Fallback strings

const FALLBACK_TITLE = '< missing title >'
const FALLBACK_MESSAGE = '< missing message >'
const FALLBACK_PROMPT: PowerAuthBiometricPrompt = {
    promptMessage: FALLBACK_MESSAGE,
    promptTitle: FALLBACK_TITLE
}
