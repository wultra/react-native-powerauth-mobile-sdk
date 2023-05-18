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
export interface RawNativeObject {
    /**
     * Object's identifier.
     */
    objectId?: string
}

/**
 * Type representing a simple native password identifier wrapped in the object.
 * We need this auxiliary object due to a problematic call to passphrase meter.
 */
export type RawPassword = RawNativeObject;

/**
 * Type representing a raw password object passable to native interface.
 */
export type RawPasswordType = RawPassword | string

/**
 * Object representing a data pased to native methods requiring PowerAuthAuthentication
 * on imput. The `RawAuthentication` must be be created from `PowerAuthAuthentication`
 * instance.
 */
export interface RawAuthentication {
    readonly password?: string | RawPassword
    readonly biometricPrompt?: PowerAuthBiometricPrompt    
    readonly isCommit?: boolean
    readonly isBiometry: boolean
    isReusable: boolean
    biometryKeyId?: string    
}

/**
 * Convert public password type into type passable into native interface.
 * @param password Public password object type.
 * @returns Raw password object type.
 */
export function toRawPassword(password: PasswordType): Promise<RawPasswordType> {
    if (typeof password === 'string') {
        return Promise.resolve(password)
    }
    return password.toRawPassword()
}