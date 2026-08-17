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

import com.wultra.android.powerauth.bridge.JsApiMethod
import com.wultra.android.powerauth.bridge.Promise
import io.getlime.security.powerauth.core.CryptoUtils
import android.util.Base64

class PowerAuthCryptoUtilsJsModule() : BaseJavaJsModule {
    override fun getName(): String {
        return "PowerAuthCryptoUtils"
    }

    @JsApiMethod
    fun hashSha256(input: String, promise: Promise) {
        try {
            val decodedBytes: ByteArray = Base64.decode(input, Base64.NO_WRAP)
            val hash = CryptoUtils.hashSha256(decodedBytes)
            val encodedHash = Base64.encodeToString(hash, Base64.NO_WRAP)
            promise.resolve(encodedHash)
        } catch (e: IllegalArgumentException) {
            Errors.rejectPromise(promise, WrapperException(Errors.EC_WRONG_PARAMETER, "Input is not valid Base64.", e))
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        }
    }

    @JsApiMethod
    fun randomBytes(length: Int, promise: Promise) {
        try {
            if (length < 0) {
                throw WrapperException(Errors.EC_WRONG_PARAMETER, "Length must be a non-negative integer")
            }
            // Handle zero-length explicitly to avoid calling underlying generator with 0,
            // and to return a valid Base64 for empty data (empty string)
            if (length == 0) {
                promise.resolve("")
                return
            }
            val randomBytes = CryptoUtils.randomBytes(length)
            val encodedBytes = Base64.encodeToString(randomBytes, Base64.NO_WRAP)
            promise.resolve(encodedBytes)
        } catch (t: Throwable) {
            Errors.rejectPromise(promise, t)
        }
    }
}
