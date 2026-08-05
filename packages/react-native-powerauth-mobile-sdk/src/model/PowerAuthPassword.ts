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
import { PowerAuthRawPassword } from "./PowerAuthNativeTypes"


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
     * @param destroyOnUse If `true` then the native password is destroyed after is used for the cryptographic operation. Default is `true`.
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
     * Creating password from already obtained string.
     * 
     * Note that this is not recommended. Do this only when you retrieve the whole string from a text input.
     * 
     * @param destroyOnUse If `true` then the native password is destroyed after is used for the cryptographic operation. Default is `true`.
     * @param onAutomaticCleanup If provided, then the closure is called when the native password is restored and the previous content is lost.
     * @param powerAuthInstanceId If specified, then the native password will be destroyed together with PowerAuth instance.
     * @param autoreleaseTime Autorelease timeout in milliseconds. The value is used only for the testing purposes, and is ignored in the release build of library.
     */
    static async fromString(
        password: string,
        destroyOnUse: boolean = true,
        onAutomaticCleanup: (() => void) | undefined = undefined,
        powerAuthInstanceId: string | undefined = undefined,
        autoreleaseTime: number = 0): Promise<PowerAuthPassword> {
        const pwd = new PowerAuthPassword(destroyOnUse, onAutomaticCleanup, powerAuthInstanceId, autoreleaseTime)
        for (const c of password) {
            await pwd.addCharacter(c)
        }
        return pwd
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
     * A `character` string may expand into more than one code point (e.g. a multi-code-point emoji
     * or a decomposed diacritic); how many actually get stored is decided natively, per activation -
     * see `PasswordCodePointScheme` on each platform.
     *
     * @param character Character to add at the end of password.
     * @returns Number of characters stored in the password.
     */
    addCharacter(character: CharacterType): Promise<number> {
        return this.withObjectId(id => NativePassword.addCharacter(id, this.resolveCodePoints(character), this.powerAuthInstanceId))
    }

    /**
     * Insert character at the specified position. This method also
     * extends the lifetime of the underlying native password.
     *
     * See `addCharacter` for how a single `character` may expand into more than one stored code point.
     *
     * @param character Character to insert.
     * @param at Position where character will be inserted. Must be in range 0, upt to length, otherwise `PowerAuthErrorCode.WRONG_PARAMETER` error is reported.
     * @returns Number of characters stored in the password.
     */
    insertCharacter(character: CharacterType, at: number): Promise<number> {
        return this.withObjectId(id => NativePassword.insertCharacter(id, this.resolveCodePoints(character), at, this.powerAuthInstanceId))
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
    toRawPassword(): Promise<PowerAuthRawPassword> {
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

    /**
     * Translates a string or number into a list of Unicode code points to send to the native side.
     *
     * Purely mechanical - never decides how many of the code points actually get stored, that's a
     * native, per-activation decision (see `PasswordCodePointScheme` on each platform). A string is
     * first normalized to NFC (composing e.g. a base letter + combining mark into one code point where
     * possible); any code points left after that - such as ZWJ/flag/skin-tone emoji sequences, which
     * have no NFC composition - are kept as-is.
     *
     * @param character CharacterType to translate.
     * @returns Array with one or more Unicode code points, in the order they should be stored.
     */
    private resolveCodePoints(character: CharacterType): number[] {
        if (typeof character !== 'string') {
            return [character]
        }
        if (character.length === 0) {
            throw new PowerAuthError(undefined, "String is empty", PowerAuthErrorCode.WRONG_PARAMETER)
        }
        // `Array.from` with a mapper iterates the string by code point (correctly handling UTF-16
        // surrogate pairs), so `c` here is always exactly one code point and `codePointAt(0)` is safe.
        const codePoints = Array.from(character.normalize('NFC'), c => c.codePointAt(0) as number)
        if (codePoints.length === 0) {
            throw new PowerAuthError(undefined, "Failed to extract code points", PowerAuthErrorCode.WRONG_PARAMETER)
        }
        return codePoints
    }
}
