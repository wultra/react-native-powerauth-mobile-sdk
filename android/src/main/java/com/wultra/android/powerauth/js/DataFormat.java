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

package com.wultra.android.powerauth.js;

import android.util.Base64;

import java.nio.charset.StandardCharsets;

/**
 * Defines data format used for encode bytes into the string.
 */
public enum DataFormat {
    /**
     * Application provides data in form of UTF-8 encoded string.
     */
    UTF8,
    /**
     * Application provides data in form of Base64 encoded string.
     */
    BASE64;

    /**
     * Convert format string into this enumeration.
     * @param format Specified data format. If `null` then `UTF8` is returned.
     * @return Enumeration with data format.
     * @throws WrapperException In case of uknown format is specified.
     */
    static DataFormat fromString(String format) throws WrapperException {
        if (format == null) {
            return UTF8;
        } else if ("UTF8".equals(format)) {
            return UTF8;
        } else if ("BASE64".equals(format)) {
            return BASE64;
        }
        throw new WrapperException(Errors.EC_WRONG_PARAMETER, "Invalid data format specified");
    }

    /**
     * Decode bytes from application provided string with using this data format.
     * @param value String with encoded bytes.
     * @return Decoded bytes.
     * @throws WrapperException In case of failure.
     */
    byte[] decodeBytes(String value) throws WrapperException {
        final byte[] result;
        if (value != null) {
            if (this == UTF8) {
                result = value.getBytes(StandardCharsets.UTF_8);
                if (result == null) {
                    throw new WrapperException(Errors.EC_WRONG_PARAMETER, "Failed to convert string into UTF8 encoded data");
                }
            } else {
                try {
                    result = Base64.decode(value, Base64.NO_WRAP);
                } catch (IllegalArgumentException e) {
                    throw new WrapperException(Errors.EC_WRONG_PARAMETER, "Failed to decode Base64 encoded data.", e);
                }
            }
        } else {
            result = new byte[0];
        }
        return result;
    }

    /**
     * Encode bytes into this data format.
     * @param value Bytes to encode.
     * @return Encoded bytes.
     * @throws WrapperException In case of failure.
     */
    String encodeBytes(byte[] value) throws WrapperException {
        if (value == null || value.length == 0) {
            return "";
        }
        if (this == UTF8) {
            try {
                return new String(value, StandardCharsets.UTF_8);
            } catch (Throwable t) {
                throw new WrapperException(Errors.EC_WRONG_PARAMETER, "Failed to create string from UTF-8 encoded data", t);
            }
        } else {
            return Base64.encodeToString(value, Base64.NO_WRAP);
        }
    }
}
