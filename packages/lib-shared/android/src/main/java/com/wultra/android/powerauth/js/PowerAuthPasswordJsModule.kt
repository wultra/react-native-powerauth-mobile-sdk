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
package com.wultra.android.powerauth.js

import com.wultra.android.powerauth.bridge.Dynamic
import com.wultra.android.powerauth.bridge.Promise
import com.wultra.android.powerauth.bridge.JsApiMethod
import com.wultra.android.powerauth.bridge.ReadableArray
import com.wultra.android.powerauth.bridge.ReadableMap
import com.wultra.android.powerauth.bridge.ReadableType

import io.getlime.security.powerauth.core.Password
import java.util.Arrays
import kotlin.math.min

class PowerAuthPasswordJsModule(private val objectRegister: ObjectRegisterJs) : BaseJavaJsModule {
    override fun getName(): String {
        return "PowerAuthPassword"
    }

    // JavaScript methods
    @JsApiMethod
    fun initialize(
        destroyOnUse: Boolean,
        ownerId: String?,
        autoreleaseTime: Int,
        promise: Promise
    ) {
        if (ownerId != null && !objectRegister.containsObject(ownerId)) {
            promise.reject(
                Errors.EC_INSTANCE_NOT_CONFIGURED,
                "PowerAuth instance is not configured"
            )
            return
        }
        var releaseTime = Constants.PASSWORD_KEY_KEEP_ALIVE_TIME
        if (objectRegister.DEBUG) {
            if (autoreleaseTime != 0) {
                releaseTime = min(
                    autoreleaseTime.toDouble(),
                    Constants.PASSWORD_KEY_KEEP_ALIVE_TIME.toDouble()
                )
                    .toInt()
            }
        }
        val instance = createManagedPassword()
        val releasePolicies = if (destroyOnUse
        ) Arrays.asList(ReleasePolicy.afterUse(1), ReleasePolicy.keepAlive(releaseTime))
        else listOf(ReleasePolicy.keepAlive(releaseTime))
        promise.resolve(objectRegister.registerObject(instance, ownerId, releasePolicies))
    }

    @JsApiMethod
    fun clear(objectId: String, promise: Promise) {
        withPassword(objectId, promise) { password ->
            password.clear()
            null
        }
    }

    @JsApiMethod
    fun length(objectId: String, promise: Promise) {
        withPassword(objectId, promise) { password -> password.length() }
    }

    @JsApiMethod
    fun isEqual(id1: String, id2: String, promise: Promise) {
        withPassword(id1, promise) { p1 ->
            val p2 = objectRegister.touchObject(id2, GroupedPassword::class.java)
                ?: throw invalidPasswordObject()
            p1.isEqualTo(p2)
        }
    }

    @JsApiMethod
    fun addCharacter(objectId: String, codePoints: ReadableArray?, promise: Promise) {
        withPassword(objectId, promise) { password ->
            password.addCharacter(toCodePoints(codePoints))
        }
    }

    @JsApiMethod
    fun insertCharacter(objectId: String, codePoints: ReadableArray?, position: Int, promise: Promise) {
        withPassword(objectId, promise) { password ->
            password.insertCharacter(toCodePoints(codePoints), position)
        }
    }

    @JsApiMethod
    fun removeCharacter(objectId: String, position: Int, promise: Promise) {
        withPassword(objectId, promise) { password -> password.removeCharacter(position) }
    }

    @JsApiMethod
    fun removeLastCharacter(objectId: String, promise: Promise) {
        withPassword(objectId, promise) { password -> password.removeLastCharacter() }
    }

    // Native methods

    /**
     * Return an immutable password owned by the caller. The password object is marked as used
     * in the object register.
     * @param anyPassword Dynamic object representing a password.
     * @param useLegacyEncoding Evaluated only when the password's full and legacy encodings
     * differ. Return `true` to get the password in the legacy encoding.
     * @return Resolved core password. The caller is responsible for destroying it.
     * @throws WrapperException In case that Password cannot be created.
     */
    @Throws(WrapperException::class)
    fun usePasswordCopy(anyPassword: Dynamic?, useLegacyEncoding: () -> Boolean = { false }): Password {
        return resolvePassword(anyPassword) { passwordObjectId ->
            val copies = objectRegister.useObjectAndTransform(
                passwordObjectId,
                GroupedPassword::class.java
            ) { it.copies() } ?: throw invalidPasswordObject()
            copies.select(useLegacyEncoding)
        }
    }

    /**
     * Return an immutable password with all code points, owned by the caller. The password
     * object's lifetime is extended in the object register.
     * @param anyPassword Dynamic object representing a password.
     * @return Resolved core password. The caller is responsible for destroying it.
     * @throws WrapperException In case that Password cannot be created.
     */
    @Throws(WrapperException::class)
    fun touchPasswordCopy(anyPassword: Dynamic?): Password {
        return resolvePassword(anyPassword) { passwordObjectId ->
            val password = objectRegister.touchObject(passwordObjectId, GroupedPassword::class.java)
                ?: throw invalidPasswordObject()
            password.copyFull()
        }
    }

    // Private methods

    /**
     * Create password from a string, or from a password object using the provided function.
     */
    @Throws(WrapperException::class)
    private fun resolvePassword(anyPassword: Dynamic?, fromObject: (String) -> Password): Password {
        if (anyPassword != null) {
            if (anyPassword.type === ReadableType.String) {
                // Direct string was provided. The string constructor returns an immutable, exclusively owned password.
                return Password(anyPassword.asString())
            }
            if (anyPassword.type === ReadableType.Map) {
                // RN 0.80+ added nullable annotations to most of these types - this is a backward compatible fix as it shouldnt even happen
                val map: ReadableMap = anyPassword.asMap()
                    ?: throw WrapperException(
                        Errors.EC_WRONG_PARAMETER,
                        "PowerAuthPassword map is required"
                    )
                val passwordObjectId = map.getString("objectId")
                    ?: throw WrapperException(
                        Errors.EC_INVALID_NATIVE_OBJECT,
                        "PowerAuthPassword is not initialized"
                    )
                return fromObject(passwordObjectId)
            }
        }
        throw WrapperException(Errors.EC_WRONG_PARAMETER, "PowerAuthPassword or string is required")
    }

    private fun invalidPasswordObject(): WrapperException {
        return WrapperException(Errors.EC_INVALID_NATIVE_OBJECT, "PowerAuthPassword object is no longer valid")
    }

    /**
     * Execute action when password is found in object register and resolve promise with its result.
     */
    private fun withPassword(objectId: String, promise: Promise, action: (GroupedPassword) -> Any?) {
        try {
            val password = objectRegister.touchObject(objectId, GroupedPassword::class.java)
                ?: throw invalidPasswordObject()
            promise.resolve(action(password))
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        }
    }

    /**
     * Convert array with one character's Unicode code points into validated integers.
     */
    @Throws(WrapperException::class)
    private fun toCodePoints(array: ReadableArray?): IntArray {
        val size = array?.size() ?: 0
        if (size == 0) {
            throw WrapperException(Errors.EC_WRONG_PARAMETER, "Empty or invalid character object")
        }
        return IntArray(size) { index ->
            val value = if (array!!.getType(index) == ReadableType.Number) array.getDouble(index) else -1.0
            if (value < 0 || value > Constants.CODEPOINT_MAX || value != Math.floor(value)) {
                throw WrapperException(Errors.EC_WRONG_PARAMETER, "Invalid CodePoint")
            }
            value.toInt()
        }
    }

    companion object {
        /**
         * Create a new password managed by the object register.
         */
        internal fun createManagedPassword(): IManagedObject<GroupedPassword> {
            return ManagedAny.wrap(GroupedPassword(), cleanup { obj: GroupedPassword -> obj.destroy() })
        }
    }
}
