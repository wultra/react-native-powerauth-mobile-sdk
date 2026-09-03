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

import android.content.Context
import com.wultra.android.powerauth.bridge.Dynamic
import com.wultra.android.powerauth.bridge.Promise
import com.wultra.android.powerauth.bridge.JsApiMethod
import com.wultra.android.powerauth.bridge.ReadableArray
import com.wultra.android.powerauth.bridge.ReadableMap
import com.wultra.android.powerauth.bridge.ReadableType
import com.wultra.android.powerauth.js.PowerAuthEncryptorJsModule.Action
import com.wultra.android.powerauth.js.PowerAuthEncryptorJsModule.InstanceData
import com.wultra.android.powerauth.bridge.BuildConfig

import io.getlime.security.powerauth.core.Password
import java.util.Arrays
import kotlin.math.min

class PowerAuthPasswordJsModule(
    private val context: Context,
    private val objectRegister: ObjectRegisterJs
) : BaseJavaJsModule {
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
        val instance = ManagedAny.wrap(Password(), cleanup { obj: Password -> obj.destroy() })
        val releasePolicies = if (destroyOnUse
        ) Arrays.asList(ReleasePolicy.afterUse(1), ReleasePolicy.keepAlive(releaseTime))
        else listOf(ReleasePolicy.keepAlive(releaseTime))
        promise.resolve(objectRegister.registerObject(instance, ownerId, releasePolicies))
    }

    @JsApiMethod
    fun release(objectId: String?, promise: Promise) {
        objectRegister.removeObject(objectId, Password::class.java)
        promise.resolve(null)
    }

    @JsApiMethod
    fun clear(objectId: String, promise: Promise) {
        withPassword(objectId, promise, action { password: Password ->
            password.clear()
            promise.resolve(null)
        })
    }

    @JsApiMethod
    fun length(objectId: String, promise: Promise) {
        withPassword(objectId, promise, action { password: Password ->
            promise.resolve(password.length())
        })
    }

    @JsApiMethod
    fun isEqual(id1: String, id2: String, promise: Promise) {
        withPassword(id1, promise, action { p1: Password ->
            withPassword(id2, promise, action { p2: Password? ->
                promise.resolve(p1.isEqualToPassword(p2))
            })
        })
    }

    @JsApiMethod
    fun addCharacter(objectId: String, codePoints: ReadableArray, instanceId: String?, promise: Promise) {
        withPassword(
            objectId,
            codePoints,
            promise,
            codePointsAction { password: Password, points: List<Int> ->
                val useCorrectedScheme = shouldUseCorrectedPasswordScheme(context, instanceId, objectRegister)
                if (useCorrectedScheme) {
                    for (point in nfcNormalizeCodePoints(points)) {
                        password.addCharacter(point)
                    }
                } else {
                    password.addCharacter(points[0])
                }
                promise.resolve(password.length())
            })
    }

    @JsApiMethod
    fun insertCharacter(objectId: String, codePoints: ReadableArray, position: Int, instanceId: String?, promise: Promise) {
        withPassword(
            objectId,
            codePoints,
            promise,
            codePointsAction { password: Password, points: List<Int> ->
                if (position < 0 || position > password.length()) {
                    promise.reject(Errors.EC_WRONG_PARAMETER, "Position is out of range")
                    return@codePointsAction
                }
                val useCorrectedScheme = shouldUseCorrectedPasswordScheme(context, instanceId, objectRegister)
                if (useCorrectedScheme) {
                    val normalized = nfcNormalizeCodePoints(points)
                    for (i in normalized.indices) {
                        password.insertCharacter(normalized[i], position + i)
                    }
                } else {
                    password.insertCharacter(points[0], position)
                }
                promise.resolve(password.length())
            })
    }

    @JsApiMethod
    fun removeCharacter(objectId: String, position: Int, promise: Promise) {
        withPassword(objectId, promise, action { password: Password ->
            if (position >= 0 && position < password.length()) {
                password.removeCharacter(position)
                promise.resolve(password.length())
            } else {
                promise.reject(Errors.EC_WRONG_PARAMETER, "Position is out of range")
            }
        })
    }

    @JsApiMethod
    fun removeLastCharacter(objectId: String, promise: Promise) {
        withPassword(objectId, promise, action { password: Password ->
            password.removeLastCharacter()
            promise.resolve(password.length())
        })
    }

    // Native methods
    /**
     * Function translate dynamic object type into core Password object. The password object is
     * marked as used or touched depending on required action.
     * @param anyPassword Dynamic object representing a password.
     * @param use If true then password is marked as used, otherwise just is touched.
     * @return Resolved core password.
     * @throws WrapperException In case that Password cannot be created.
     */
    @Throws(WrapperException::class)
    private fun findPassword(anyPassword: Dynamic?, use: Boolean): Password {
        if (anyPassword != null) {
            if (anyPassword.type === ReadableType.String) {
                // Direct string was provided
                return Password(anyPassword.asString())
            }
            if (anyPassword.type === ReadableType.Map) {
                // Object is provided

                // RN 0.80+ added nullable annotations to most of these types - this is a backward compatible fix as it shouldnt even happen
                val map: ReadableMap = anyPassword.asMap()
                    ?: throw WrapperException(
                        Errors.EC_WRONG_PARAMETER,
                        "PowerAuthPassword map is required"
                    )
                val passwordObjectId: String = map.getString("objectId")
                    ?: throw WrapperException(
                        Errors.EC_INVALID_NATIVE_OBJECT,
                        "PowerAuthPassword is not initialized"
                    )
                val password = if (use
                ) objectRegister.useObject(passwordObjectId, Password::class.java)
                else objectRegister.touchObject(passwordObjectId, Password::class.java)
                if (password == null) {
                    throw WrapperException(
                        Errors.EC_INVALID_NATIVE_OBJECT,
                        "PowerAuthPassword object is no longer valid"
                    )
                }
                return password
            }
        }
        throw WrapperException(Errors.EC_WRONG_PARAMETER, "PowerAuthPassword or string is required")
    }

    /**
     * Function translate dynamic object type into core Password object. The password object is
     * marked as used in the object register if exists.
     * @param anyPassword Dynamic object representing a password.
     * @return Resolved core password.
     * @throws WrapperException In case that Password cannot be created.
     */
    @Throws(WrapperException::class)
    fun usePassword(anyPassword: Dynamic?): Password {
        return findPassword(anyPassword, true)
    }

    /**
     * Function translate dynamic object type into core Password object. The password object is
     * marked as touched in the object register if exists.
     * @param anyPassword Dynamic object representing a password.
     * @return Resolved core password.
     * @throws WrapperException In case that Password cannot be created.
     */
    @Throws(WrapperException::class)
    fun touchPassword(anyPassword: Dynamic?): Password {
        return findPassword(anyPassword, false)
    }

    // Private methods

    /**
     * Action to execute when password object is found in object register.
     */
    private interface Action {
        fun action(password: Password)
    }

    private fun action(fce: (Password) -> Unit): Action {
        return object: Action {
            override fun action(password: Password) {
                fce(password)
            }
        }
    }

    /**
     * Execute action when Password is found in object register.
     * @param objectId Password object identifier.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    private fun withPassword(objectId: String, promise: Promise, action: Action) {
        val password = objectRegister.touchObject(objectId, Password::class.java)
        if (password != null) {
            action.action(password)
        } else {
            promise.reject(Errors.EC_INVALID_NATIVE_OBJECT, "Password object is no longer valid")
        }
    }

    /**
     * Action to execute with a valid, non-empty list of code points, when password object is found
     * in object register.
     */
    private interface CodePointsAction {
        fun action(password: Password, codePoints: List<Int>)
    }

    private fun codePointsAction(fce: (Password, List<Int>) -> Unit): CodePointsAction {
        return object: CodePointsAction {
            override fun action(password: Password, codePoints: List<Int>) {
                fce(password, codePoints)
            }
        }
    }

    private fun isValidCodePoint(codePoint: Int): Boolean {
        // 0xD800..0xDFFF (UTF-16 surrogates) aren't valid Unicode scalars - Character.isValidCodePoint()
        // doesn't exclude them, and letting one through would crash nfcNormalizeCodePoints() later.
        return codePoint in 0..Constants.CODEPOINT_MAX && codePoint !in 0xD800..0xDFFF
    }

    /**
     * Validate a raw code points array received from JS, rejecting the promise and returning null on
     * the first invalid element. Otherwise returns the array converted to a Kotlin list.
     * @param codePoints Array of raw (unnormalized) Unicode code points, in the order they should be
     * stored.
     * @param promise Promise to reject if validation fails.
     */
    private fun validateCodePoints(codePoints: ReadableArray, promise: Promise): List<Int>? {
        if (codePoints.size() == 0) {
            promise.reject(Errors.EC_WRONG_PARAMETER, "Empty code points array")
            return null
        }
        val points = ArrayList<Int>(codePoints.size())
        for (i in 0 until codePoints.size()) {
            if (codePoints.getType(i) != ReadableType.Number) {
                promise.reject(Errors.EC_WRONG_PARAMETER, "Invalid CodePoint")
                return null
            }
            val codePoint = codePoints.getInt(i)
            if (!isValidCodePoint(codePoint)) {
                promise.reject(Errors.EC_WRONG_PARAMETER, "Invalid CodePoint")
                return null
            }
            points.add(codePoint)
        }
        return points
    }

    /**
     * Execute action when Password is found in object register.
     * @param objectId Password object identifier.
     * @param codePoints Array of raw (unnormalized) Unicode code points, in the order they should be
     * stored.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    private fun withPassword(
        objectId: String,
        codePoints: ReadableArray,
        promise: Promise,
        action: CodePointsAction
    ) {
        val points = validateCodePoints(codePoints, promise) ?: return
        val password = objectRegister.touchObject(objectId, Password::class.java)
        if (password != null) {
            action.action(password, points)
        } else {
            promise.reject(Errors.EC_INVALID_NATIVE_OBJECT, "Password object is no longer valid")
        }
    }
}
