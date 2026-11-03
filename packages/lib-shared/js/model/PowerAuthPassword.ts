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
import { NativeObjectHandle } from "../internal/NativeObjectHandle"
import { NativePassphraseMeter } from "../internal/NativePassphraseMeter"
import { NativePassword } from "../internal/NativePassword"
import { PowerAuthRawPassword } from "./PowerAuthNativeTypes"


/**
 * Type representing an user's password. You can use `PowerAuthPassword` object or
 * a simple string as a password.
 */
export type PasswordType = PowerAuthPassword | string

/**
 * Options for creating a `PowerAuthPassword` object.
 */
export interface PowerAuthPasswordOptions {
    /**
     * If `true`, then the native password is destroyed after it's used for the cryptographic operation.
     * Default is `true`.
     */
    destroyOnUse?: boolean
    /**
     * If specified, then the native password is destroyed together with the `PowerAuth` instance
     * with the same identifier.
     */
    powerAuthInstanceId?: string
    /**
     * Autorelease timeout in milliseconds. The value is used only for the testing purposes. The release
     * build of the library ignores it, and the debug build caps it to the default 5 minutes.
     */
    autoReleaseTimeMillis?: number
}

/**
 * The `PowerAuthPassword` class implements safe storage for users' passwords.
 * The class is using an underlying native object to store the user's password securely
 * in the memory. The goal is to keep the user's password in the memory for as short 
 * as possible time. To achieve this, the native object implements the following
 * precautions: 
 * 
 * - The native password is created when you first use the object.
 * 
 * - If it's constructed with `destroyOnUse` option set to `true` then the native
 *   password is automatically destroyed after it's used for the cryptographic operation.
 *   This is the default setting.
 * 
 * - If it's constructed with `powerAuthInstanceId` then the native object will be
 *   destroyed after the `PowerAuth` class with the same identifier is deconfigured.
 * 
 * - The native password is removed from the memory after 5 minutes of inactivity. If you
 *   call any `PowerAuthPassword` method except `release()`, then the auto-cleanup timer
 *   is reset, so the native password will live for another 5 minutes.
 * 
 * - A call to `release()` destroys the native password immediately.
 * 
 * After the native password is destroyed or released, any other use of the object reports
 * `PowerAuthErrorCode.INVALID_NATIVE_OBJECT`. Create a new `PowerAuthPassword` object when
 * you need the password again.
 * 
 * The native password is resolved before the method arguments are validated. A released password
 * therefore reports `PowerAuthErrorCode.INVALID_NATIVE_OBJECT`, and a password owned by an unconfigured
 * `PowerAuth` instance reports `PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED`, even if an argument is also
 * invalid. `PowerAuthErrorCode.WRONG_PARAMETER` is reported only for a valid native password.
 * 
 * The password is stored as a sequence of Unicode code points, the same way as in the native
 * PowerAuth mobile SDK. The length and all positions are counted in code points, not in visible
 * characters. For example, a character such as `'👍🏽'` consists of two code points (`0x1F44D`
 * and `0x1F3FD`), so it increases the length by 2. If you build the password from your own
 * input, then you're responsible for adding the same code points each time the user enters
 * the same password.
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
export class PowerAuthPassword {
    /**
     * If true, then the underlying native password will be destroyed immediately after is used
     * for the cryptographic operation.
     */
    readonly destroyOnUse: boolean
    /**
     * InstanceId of PowerAuth object that owns this password.
     */
    readonly powerAuthInstanceId?: string
    /**
     * Autorelease timeout in milliseconds. The value is used only for testing purposes, and is ignored in release build of library.
     */
    readonly autoReleaseTimeMillis?: number

    private readonly handle: NativeObjectHandle

    /**
     * Construct password object and specify whether it's re-usable and/or should be destroyed 
     * together with the owning PowerAuth class instance. The underlying native password is
     * created when the object is first used.
     * @param options Optional password options.
     */
    constructor(options: PowerAuthPasswordOptions = {}) {
        // Reject legacy positional arguments, including a trailing owner after an undefined first argument.
        validateOptions(options, arguments.length > 1)
        this.destroyOnUse = options.destroyOnUse ?? true
        this.powerAuthInstanceId = options.powerAuthInstanceId
        this.autoReleaseTimeMillis = options.autoReleaseTimeMillis
        this.handle = NativeObjectHandle.lazy(() => NativePassword.initialize(
            this.destroyOnUse,
            this.powerAuthInstanceId,
            this.autoReleaseTimeMillis ?? 0
        ))
    }

    /**
     * Creating password from already obtained string. Each Unicode code point of the string
     * is added to the password, so the resulting length is the number of code points in the string.
     * 
     * Note that this is not recommended. Do this only when you retrieve the whole string from a text input.
     * If adding the code points fails, then the partially filled native password is released.
     * 
     * @param password Password string.
     * @param options Optional password options.
     */
    static async fromString(password: string, options: PowerAuthPasswordOptions = {}): Promise<PowerAuthPassword> {
        validateOptions(options, arguments.length > 2)
        const pwd = new PowerAuthPassword(options)
        try {
            await pwd.addCodePoints(password)
        } catch (error) {
            // The caller never receives the password, so release the code points added so far.
            await pwd.release()
            throw error
        }
        return pwd
    }

    /**
     * Return number of code points stored in the password. This method also
     * extends the lifetime of the underlying native password.
     * 
     * @returns Number of code points stored in the password.
     */
    length(): Promise<number> {
        return this.handle.withObjectId(id => NativePassword.length(id))
    }

    /**
     * Clear content of the password.
     */
    clear(): Promise<void> {
        return this.handle.withObjectId(id => NativePassword.clear(id))
    }

    /**
     * Release the underlying native password. Any subsequent use of this object reports
     * `PowerAuthErrorCode.INVALID_NATIVE_OBJECT`. Releasing an object that was never used
     * does nothing.
     */
    release(): Promise<void> {
        return this.handle.release()
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
     * Append Unicode code point to the end of the password. This method also
     * extends the lifetime of the underlying native password.
     * 
     * If a character typed by the user consists of multiple code points, then add each
     * code point separately. For example, `'👍🏽'` must be added as `0x1F44D` and `0x1F3FD`.
     * 
     * @param codePoint Unicode code point to add at the end of password. Must be an integer in range 0 up to 0x10FFFF, otherwise `PowerAuthErrorCode.WRONG_PARAMETER` error is reported.
     * @returns Number of code points stored in the password.
     */
    addCodePoint(codePoint: number): Promise<number> {
        return this.handle.withObjectId(id => NativePassword.addCharacter(id, validateCodePoint(codePoint)))
    }

    /**
     * Append all Unicode code points of the string to the end of the password. This method also
     * extends the lifetime of the underlying native password.
     * 
     * Note that this is not recommended. Do this only when you retrieve the whole string from a text input.
     * If the operation fails, then the password may contain only some of the code points.
     * 
     * Code points are added one by one, so the operation is not atomic. If you modify the password
     * before the returned promise is resolved, then your changes may land between the added code points.
     * 
     * An empty string doesn't create the native password if it wasn't created yet.
     * 
     * @param text String with code points to add at the end of password. If it's not a string, then `PowerAuthErrorCode.WRONG_PARAMETER` error is reported.
     * @returns Number of code points stored in the password.
     */
    async addCodePoints(text: string): Promise<number> {
        if (typeof text !== 'string') {
            throw new PowerAuthError(undefined, "Text must be a string", PowerAuthErrorCode.WRONG_PARAMETER)
        }
        // Empty string keeps the native password uncreated, so it doesn't fail on an unconfigured instance.
        if (text === '' && this.handle.isUninitialized) {
            return 0
        }
        let length: number | undefined
        for (const c of text) {
            // Iterating a string yields whole code points, so `codePointAt(0)` is always defined.
            length = await this.addCodePoint(c.codePointAt(0)!)
        }
        return length ?? await this.length()
    }

    /**
     * Insert Unicode code point at the specified position. This method also
     * extends the lifetime of the underlying native password.
     * 
     * @param codePoint Unicode code point to insert. Must be an integer in range 0 up to 0x10FFFF, otherwise `PowerAuthErrorCode.WRONG_PARAMETER` error is reported.
     * @param at Position in code points where the code point will be inserted. Must be an integer in range 0 up to length, otherwise `PowerAuthErrorCode.WRONG_PARAMETER` error is reported.
     * @returns Number of code points stored in the password.
     */
    insertCodePoint(codePoint: number, at: number): Promise<number> {
        return this.handle.withObjectId(id => NativePassword.insertCharacter(id, validateCodePoint(codePoint), validatePosition(at)))
    }

    /**
     * Remove code point at the specified position. This method also
     * extends the lifetime of the underlying native password.
     * 
     * If a character consists of multiple code points, then remove each of its code points. For
     * example, removing `'👍🏽'` requires two calls.
     * 
     * @param position Position of code point to be removed. Must be an integer in range 0 up to length - 1, otherwise `PowerAuthErrorCode.WRONG_PARAMETER` error is reported.
     * @returns Remaining number of code points stored in the password.
     */
    removeCodePointAt(position: number): Promise<number> {
        return this.handle.withObjectId(id => NativePassword.removeCharacter(id, validatePosition(position)))
    }

    /**
     * Remove last code point and return the number of remaining code points stored in the password.
     * This method also extends the lifetime of the underlying native password.
     * 
     * If the last character consists of multiple code points, then this method removes only its last
     * code point. For example, it removes only the skin tone modifier from `'👍🏽'`.
     * 
     * @returns Remaining number of code points stored in the password.
     */
    removeLastCodePoint(): Promise<number> {
        return this.handle.withObjectId(id => NativePassword.removeLastCharacter(id))
    }

    /**
     * Compare two passwords. This method also extends the lifetime of the both underlying
     * native passwords.
     * 
     * @param password Password to compare with this instance.
     * @returns true if both passwords contains an equal passphrase.
     */
    isEqualTo(password: PowerAuthPassword): Promise<boolean> {
        return this.handle.withObjectId(id1 => password.handle.withObjectId(id2 => NativePassword.isEqual(id1, id2)))
    }

    /**
     * If object contains numeric digits only, then you can test the streingt of PIN
     * stored in the object.
     * @returns `PinTestResult` object.
     * @throws `PowerAuthErrorCode.WRONG_PARAM` if PIN contains other characters than digits or its length is less than 4. 
     */
    testPinStrength(): Promise<PinTestResult> {
        return this.handle.withObjectId(id => NativePassphraseMeter.testPin(toRawPasswordObject(id)))
    }

    /**
     * Convert this password object into RawPassword object that can be passed safely to a native call.
     * @returns Frozen RawPassword object.
     */
    toRawPassword(): Promise<PowerAuthRawPassword> {
        return this.handle.withObjectId(id => Promise.resolve(toRawPasswordObject(id)))
    }

}

function validateOptions(options: unknown, hasExtraArguments: boolean) {
    if (hasExtraArguments || typeof options !== 'object' || options === null || Array.isArray(options)) {
        throw new PowerAuthError(undefined, "PowerAuthPassword options must be a single object", PowerAuthErrorCode.WRONG_PARAMETER)
    }
}

function validateCodePoint(codePoint: number): number {
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10FFFF) {
        throw new PowerAuthError(undefined, "Code point must be an integer in range 0 up to 0x10FFFF", PowerAuthErrorCode.WRONG_PARAMETER)
    }
    return codePoint
}

function validatePosition(position: number): number {
    // Native bridges silently truncate fractions, convert NaN to 0 and wrap values above 32-bit range.
    if (!Number.isInteger(position) || position < 0 || position > 0x7FFFFFFF) {
        throw new PowerAuthError(undefined, "Position must be an integer in range 0 up to 0x7FFFFFFF", PowerAuthErrorCode.WRONG_PARAMETER)
    }
    return position
}

function toRawPasswordObject(objectId: string): PowerAuthRawPassword {
    return Object.freeze({ objectId: objectId })
}
