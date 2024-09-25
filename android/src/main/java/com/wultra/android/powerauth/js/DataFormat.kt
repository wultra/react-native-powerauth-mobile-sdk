/*
 * Copyright 2023 Wultra s.r.o.
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

import android.util.Base64
import com.wultra.android.powerauth.js.WrapperException
import java.nio.charset.StandardCharsets

/**
 * Defines data format used for encode bytes into the string.
 */
enum class DataFormat {
    /**
     * Application provides data in form of UTF-8 encoded string.
     */
    UTF8,

    /**
     * Application provides data in form of Base64 encoded string.
     */
    BASE64;

    /**
     * Decode bytes from application provided string with using this data format.
     * @param value String with encoded bytes.
     * @return Decoded bytes.
     * @throws WrapperException In case of failure.
     */
    @Throws(WrapperException::class)
    fun decodeBytes(value: String?): ByteArray? {
        val result: ByteArray?
        if (value != null) {
            if (this == UTF8) {
                result = value.toByteArray(StandardCharsets.UTF_8)
                if (result == null) {
                    throw WrapperException(
                        Errors.EC_WRONG_PARAMETER,
                        "Failed to convert string into UTF8 encoded data"
                    )
                }
            } else {
                try {
                    result = Base64.decode(value, Base64.NO_WRAP)
                } catch (e: IllegalArgumentException) {
                    throw WrapperException(
                        Errors.EC_WRONG_PARAMETER,
                        "Failed to decode Base64 encoded data.",
                        e
                    )
                }
            }
        } else {
            result = ByteArray(0)
        }
        return result
    }

    /**
     * Encode bytes into this data format.
     * @param value Bytes to encode.
     * @return Encoded bytes.
     * @throws WrapperException In case of failure.
     */
    @Throws(WrapperException::class)
    fun encodeBytes(value: ByteArray?): String {
        if (value == null || value.size == 0) {
            return ""
        }
        return if (this == UTF8) {
            try {
                String(value, StandardCharsets.UTF_8)
            } catch (t: Throwable) {
                throw WrapperException(
                    Errors.EC_WRONG_PARAMETER,
                    "Failed to create string from UTF-8 encoded data",
                    t
                )
            }
        } else {
            Base64.encodeToString(value, Base64.NO_WRAP)
        }
    }

    companion object {
        /**
         * Convert format string into this enumeration.
         * @param format Specified data format. If `null` then `UTF8` is returned.
         * @return Enumeration with data format.
         * @throws WrapperException In case of uknown format is specified.
         */
        @Throws(WrapperException::class)
        fun fromString(format: String?): DataFormat {
            if (format == null) {
                return UTF8
            } else if ("UTF8" == format) {
                return UTF8
            } else if ("BASE64" == format) {
                return BASE64
            }
            throw WrapperException(Errors.EC_WRONG_PARAMETER, "Invalid data format specified")
        }
    }
}
