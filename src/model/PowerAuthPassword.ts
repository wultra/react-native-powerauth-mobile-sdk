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

import { PinTestResult, PowerAuthError, PowerAuthErrorCode } from "../index"
import { BaseNativeObject } from "./BaseNativeObject"
import { NativePassphraseMeter } from "../internal/NativePassphraseMeter"
import { NativePassword } from "../internal/NativePassword"
import { RawPassword } from "../internal/NativeTypes"


/**
 * Type representing an user's password. You can use `PowerAuthPassword` object or
 * a simple string as a password.
 */
export type PasswordType = PowerAuthPassword | string

/**
 * Type representing an one character passed to the `PowerAuthPassword` functions.
 * If value is number type, then it representing an Unicode Code Point.  If you use 
 * string, then only the first code point from the string will be processed.
 */
export type CharacterType = string | number

/**
 * The `PowerAuthPassword` class implements safe storage for users' passwords.
 * The class is using an underlying native object to store the user's password securely
 * in the memory. The goal is to keep the user's password in the memory for as short 
 * as possible time. To achieve this, the native object implements the following
 * precautions: 
 * 
 * - If it's constructed with `destroyOnUse` parameter set to `true` then the native
 *   password is automatically destroyed after it's used for the cryptographic operation.
 * 
 * - If it's constructed with `powerAuthInstanceId` then the native object will be
 *   destroyed after the `PowerAuth` class with the same identifier is deconfigured.
 * 
 * - If you leave the instance of `PowerAuthPassword` class as it is, then the native 
 *   password is removed from the memory after 5 minutes of inactivity. The JavaScript
 *   object is still functional, so if you use any API function, then the native
 *   password is re-initialized, but the previous passphrase is lost. You can provide
 *   an optional `onAutomaticCleanup` function to the object's constructor to detect 
 *   the such situation.
 * 
 * - If you call any `PowerAuthPassword` method except `release()`, then the auto-cleanup
 *   timer is reset, so the native password will live for another 5 minutes.
 * 
 * Be aware that this class is effective only if you're using a numeric PIN for the passphrase
 * although its API accepts full Unicode code point at the input. This is because it's quite
 * simple to re-implement the PIN keyboard with your custom UI components. On opposite to that,
 * for the full alphanumeric input, you need to use the system keyboard, which leaves traces
 * of the user's password in memory.
 * 
 * If you're interested in more detail about why the passwords should be protected in 
 * the memory, then you can follow the [Working with passwords securely](https://developers.wultra.com/components/powerauth-mobile-sdk/1.7.x/documentation/PowerAuth-SDK-for-iOS#working-with-passwords-securely)
 * chapter from the PowerAuth mobile SDK.
 */
export class PowerAuthPassword extends BaseNativeObject {
    /**
     * Construct password object and specify whether it's re-usable and/or should be destroyed 
     * together with the owning PowerAuth class instance.
     * @param destroyOnUse If `true` then the native password is destroyed after is used for the cryptograhic operation.
     * @param onAutomaticCleanup If provided, then the closure is called when the native password is restored and the previous content is lost.
     * @param powerAuthInstanceId If specified, then the native password will be destroyed together with PowerAuth instance.
     * @param autoreleaseTime Autorelease timeout in milliseconds. The value is used only for the testing purposes, and is ignored in the release build of library.
     */
    constructor(
        destroyOnUse: boolean = true,
        onAutomaticCleanup: (() => void) | undefined = undefined,
        powerAuthInstanceId: string | undefined = undefined,
        autoreleaseTime: number = 0) {
        super()
        this.destroyOnUse = destroyOnUse
        this.powerAuthInstanceId = powerAuthInstanceId
        this.autoreleaseTime = autoreleaseTime
        this.automaticCleanupCallback = onAutomaticCleanup
    }

    /**
     * Return number of characters stored in the pasword. This method also
     * extends the lifetime of the underlying native password.
     * 
     * @returns Number of characters stored in the password.
     */
    length(): Promise<number> {
        return this.withObjectId(id => NativePassword.length(id))
    }

    /**
     * Clear content of the password.
     */
    clear(): Promise<void> {
        return this.withObjectId(id => NativePassword.clear(id))
    }

    /**
     * Determine whether the stored password is empty. This method also
     * extends the lifetime of the underlying native password.
     * 
     * @returns `true` if password is empty.
     */
    async isEmpty(): Promise<boolean> {
        return (await this.length()) == 0
    }

    /**
     * Append character to the end of the password. This method also
     * extends the lifetime of the underlying native password.
     * 
     * @param character Character to add at the end of password.
     * @returns Number of characters stored in the password.
     */
    addCharacter(character: CharacterType): Promise<number> {
        return this.withObjectId(id => NativePassword.addCharacter(id, getCodePoint(character)))
    }

    /**
     * Insert character at the specified position. This method also
     * extends the lifetime of the underlying native password.
     * 
     * @param character Character to insert.
     * @param at Position where character will be inserted. Must be in range 0, upt to length, otherwise `PowerAuthErrorCode.WRONG_PARAMETER` error is reported.
     * @returns Number of characters stored in the password.
     */
    insertCharacter(character: CharacterType, at: number): Promise<number> {
        return this.withObjectId(id => NativePassword.insertCharacter(id, getCodePoint(character), at))
    }

    /**
     * Remove character at the specified position. This method also
     * extends the lifetime of the underlying native password.
     * 
     * @param position Position of character to be removed. Must be in range 0 up to length - 1, otherwise `PowerAuthErrorCode.WRONG_PARAMETER` error is reported.
     * @returns Remaining number of characters stored in the password.
     */
    removeCharacterAt(position: number): Promise<number> {
        return this.withObjectId(id => NativePassword.removeCharacter(id, position))
    }

    /**
     * Remove last character and return the number of remaining characters stored in the password.
     * This method also extends the lifetime of the underlying native password.
     * 
     * @returns Remaining number of characters stored in the password.
     */
    removeLastCharacter(): Promise<number> {
        return this.withObjectId(id => NativePassword.removeLastCharacter(id))
    }

    /**
     * Compare two passwords. This method also extends the lifetime of the both underlying
     * native passwords.
     * 
     * @param password Password to compare with this instance.
     * @returns true if both passwords contains an equal passphrase.
     */
    isEqualTo(password: PowerAuthPassword): Promise<boolean> {
        return this.withObjectId(id1 => password.withObjectId(id2 => NativePassword.isEqual(id1, id2)))
    }

    /**
     * If object contains numeric digits only, then you can test the streingt of PIN
     * stored in the object.
     * @returns `PinTestResult` object.
     * @throws `PowerAuthErrorCode.WRONG_PARAM` if PIN contains other characters than digits or its length is less than 4. 
     */
    async testPinStrength(): Promise<PinTestResult> {
        return this.withObjectId(_ => NativePassphraseMeter.testPin(this.toRawObject()))
    }

    /**
     * Convert this password object into RawPassword object that can be passed safely to a native call.
     * @returns Frozen RawPassword object.
     */
    toRawPassword(): Promise<RawPassword> {
        return this.resolveRawObject()
    }

    /**
     * If true, then the underlying native password will be destroyed immediately after is used
     * for the cryptographic operation.
     */
    private readonly destroyOnUse: boolean
    /**
     * InstanceId of PowerAuth object that created this password.
     */
    private readonly powerAuthInstanceId?: string
    /**
     * Autorelease timeout in milliseconds. The value is used only for testing purposes, and is ignored in release build of library.
     */
    private readonly autoreleaseTime: number
    /**
     * Closure called when native object is restored and the content of previously stored password is lost.
     */
    private readonly automaticCleanupCallback?: () => void

    // BaseNativeObject impl.

    protected override onCreate(): Promise<string> {
        return NativePassword.initialize(this.destroyOnUse, this.powerAuthInstanceId, this.autoreleaseTime)
    }

    protected override onRelease(objectId: string): Promise<void> {
        return NativePassword.release(objectId)
    }

    protected override onAutomaticCleanup(): void {
        if (this.automaticCleanupCallback != undefined) {
            this.automaticCleanupCallback()
        }
    }
}

/**
 * Function translate string or number into unicode code point. If string parameter is provided,
 * then the `codePointAt(0)` is returned.
 * @param character CharacterType to translate. 
 * @returns number with Unicode Code Point.
 */
function getCodePoint(character: CharacterType): number {
    let c: number
    if (typeof character === 'string') {
        if (character.length === 0) {
            throw new PowerAuthError(undefined, "String is empty", PowerAuthErrorCode.WRONG_PARAMETER)
        }
        const cp = character.codePointAt(0)
        if (cp === undefined) {
            throw new PowerAuthError(undefined, "Failed to extract 1st. code point", PowerAuthErrorCode.WRONG_PARAMETER)
        }
        c = cp
    } else {
        c = character
    }
    return c
}