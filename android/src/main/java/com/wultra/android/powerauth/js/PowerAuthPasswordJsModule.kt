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
import com.wultra.android.powerauth.bridge.ReadableMap
import com.wultra.android.powerauth.bridge.ReadableType
import com.wultra.android.powerauth.js.PowerAuthEncryptorJsModule.Action
import com.wultra.android.powerauth.js.PowerAuthEncryptorJsModule.InstanceData
import com.wultra.android.powerauth.bridge.BuildConfig

import io.getlime.security.powerauth.core.Password
import java.util.Arrays
import kotlin.math.min

public class PowerAuthPasswordJsModule(private val objectRegister: ObjectRegisterJs) : BaseJavaJsModule {
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
        if (BuildConfig.DEBUG) {
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
    fun addCharacter(objectId: String, character: Int, promise: Promise) {
        withPassword(
            objectId,
            character,
            promise,
            characterAction { password: Password, codePoint: Int ->
                password.addCharacter(codePoint)
                promise.resolve(password.length())
            })
    }

    @JsApiMethod
    fun insertCharacter(objectId: String, character: Int, position: Int, promise: Promise) {
        withPassword(
            objectId,
            character,
            promise,
            characterAction { password: Password, codePoint: Int ->
                if (position >= 0 && position <= password.length()) {
                    password.insertCharacter(codePoint, position)
                    promise.resolve(password.length())
                } else {
                    promise.reject(Errors.EC_WRONG_PARAMETER, "Position is out of range")
                }
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
                val map: ReadableMap = anyPassword.asMap()
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
     * Action to execute with valid code point, when password object is found in object register.
     */
    private interface CharacterAction {
        fun action(password: Password, codePoint: Int)
    }

    private fun characterAction(fce: (Password, Int) -> Unit): CharacterAction {
        return object: CharacterAction {
            override fun action(password: Password, codePoint: Int) {
                fce(password, codePoint)
            }
        }
    }

    /**
     * Execute action when Password is found in object register.
     * @param objectId Password object identifier.
     * @param character Character that represents an unicode code point.
     * @param promise Promise to reject or resolve.
     * @param action Action to execute.
     */
    private fun withPassword(
        objectId: String,
        character: Int,
        promise: Promise,
        action: CharacterAction
    ) {
        if (character < 0 || character > Constants.CODEPOINT_MAX) {
            promise.reject(Errors.EC_WRONG_PARAMETER, "Invalid CodePoint")
            return
        }
        val password = objectRegister.touchObject(objectId, Password::class.java)
        if (password != null) {
            action.action(password, character)
        } else {
            promise.reject(Errors.EC_INVALID_NATIVE_OBJECT, "Password object is no longer valid")
        }
    }
}
