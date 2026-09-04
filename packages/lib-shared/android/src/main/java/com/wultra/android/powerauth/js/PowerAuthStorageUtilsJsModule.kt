/*
 * Copyright 2025 Wultra s.r.o.
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
import android.content.SharedPreferences
import androidx.core.content.edit
import com.wultra.android.powerauth.bridge.JsApiMethod
import com.wultra.android.powerauth.bridge.Promise
import io.getlime.security.powerauth.keychain.Keychain
import io.getlime.security.powerauth.keychain.KeychainFactory
import io.getlime.security.powerauth.keychain.KeychainProtection

class PowerAuthStorageUtilsJsModule(
    private val context: Context
) : BaseJavaJsModule {

    companion object {
        private const val STORAGE_TYPE_SECURE = "SECURE"
        private const val STORAGE_TYPE_STANDARD = "STANDARD"
        private const val KEYCHAIN_IDENTIFIER = "com.wultra.powerauth.jssdk.storageutils.secure"
        private const val PREFS_NAME_STANDARD = "com.wultra.powerauth.jssdk.storageutils.standard"
    }

    private var keychain: Keychain? = null
    private var standardPrefs: SharedPreferences? = null

    override fun getName(): String {
        return "PowerAuthStorageUtils"
    }

    @JsApiMethod
    fun setString(key: String, value: String, storageType: String, promise: Promise) {
        try {
            validateKey(key)

            when (storageType) {
                STORAGE_TYPE_SECURE -> {
                    getKeychain().putString(value, key)
                }
                STORAGE_TYPE_STANDARD -> {
                    getStandardPreferences().edit { putString(key, value) }
                }
                else -> throw WrapperException(Errors.EC_WRONG_PARAMETER, "Invalid storage type: $storageType")
            }

            promise.resolve(null)
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        }
    }

    @JsApiMethod
    fun getString(key: String, storageType: String, promise: Promise) {
        try {
            validateKey(key)

            val value = when (storageType) {
                STORAGE_TYPE_SECURE -> {
                    getKeychain().getString(key)
                }
                STORAGE_TYPE_STANDARD -> {
                    getStandardPreferences().getString(key, null)
                }
                else -> throw WrapperException(Errors.EC_WRONG_PARAMETER, "Invalid storage type: $storageType")
            }

            promise.resolve(value)
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        }
    }

    @JsApiMethod
    fun exists(key: String, storageType: String, promise: Promise) {
        try {
            validateKey(key)

            val exists = when (storageType) {
                STORAGE_TYPE_SECURE -> getKeychain().contains(key)
                STORAGE_TYPE_STANDARD -> getStandardPreferences().contains(key)
                else -> throw WrapperException(Errors.EC_WRONG_PARAMETER, "Invalid storage type: $storageType")
            }

            promise.resolve(exists)
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        }
    }

    @JsApiMethod
    fun remove(key: String, storageType: String, promise: Promise) {
        try {
            validateKey(key)

            val existed = when (storageType) {
                STORAGE_TYPE_SECURE -> {
                    val kc = getKeychain()
                    val contains = kc.contains(key)
                    kc.remove(key)

                    contains
                }
                STORAGE_TYPE_STANDARD -> {
                    val prefs = getStandardPreferences()
                    val contains = prefs.contains(key)
                    prefs.edit { remove(key) }

                    contains
                }
                else -> throw WrapperException(Errors.EC_WRONG_PARAMETER, "Invalid storage type: $storageType")
            }

            promise.resolve(existed)
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        }
    }

    private fun validateKey(key: String) {
        if (key.isEmpty()) {
            throw WrapperException(Errors.EC_WRONG_PARAMETER, "Key cannot be empty")
        }
    }

    private fun getKeychain(): Keychain {
        if (keychain == null) {
            keychain = KeychainFactory.getKeychain(context, KEYCHAIN_IDENTIFIER, KeychainProtection.NONE)
        }

        return keychain!!
    }

    private fun getStandardPreferences(): SharedPreferences {
        if (standardPrefs == null) {
            standardPrefs = context.getSharedPreferences(PREFS_NAME_STANDARD, Context.MODE_PRIVATE)
        }

        return standardPrefs!!
    }
}
