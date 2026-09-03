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

import { PasswordType, PowerAuthBiometricPrompt } from '../index'

/**
 * Interface representing a simple native object identified by string identifier.
 */
export interface PowerAuthRawNativeObject {
    /**
     * Object's identifier.
     */
    objectId?: string
}

/**
 * Type representing a simple native password identifier wrapped in the object.
 * We need this auxiliary object due to a problematic call to passphrase meter.
 */
export type PowerAuthRawPassword = PowerAuthRawNativeObject;

/**
 * Type representing a raw password object passable to native interface.
 */
export type PowerAuthRawPasswordType = PowerAuthRawPassword | string

/**
 * Object representing a data pased to native methods requiring PowerAuthAuthentication
 * on imput. The `RawAuthentication` must be be created from `PowerAuthAuthentication`
 * instance.
 */
export interface PowerAuthRawAuthentication {
    readonly password?: string | PowerAuthRawPassword
    readonly biometricPrompt?: PowerAuthBiometricPrompt
    readonly isPersist?: boolean
    readonly isBiometry: boolean
    isReusable: boolean
    biometryKeyId?: string
    /**
     * `persistActivation` only: true if `password` is a string, or a `PowerAuthPassword` bound to the
     * persisting `PowerAuth` instance. Tells native whether it's safe to mark the activation as using
     * the corrected code point scheme.
     */
    readonly passwordIsSchemeSafe?: boolean
}

/**
 * Convert public password type into type passable into native interface.
 * @param password Public password object type.
 * @returns Raw password object type.
 */
export function toPowerAuthRawPassword(password: PasswordType): Promise<PowerAuthRawPasswordType> {
    if (typeof password === 'string') {
        return Promise.resolve(password)
    }
    return password.toRawPassword()
}