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

package com.wultra.android.powerauth.reactnative;

class Constants {
    /**
     * Default period in milliseconds for automatic objects cleanup job.
     */
    static final int CLEANUP_PERIOD_DEFAULT         = 10_000;
    /**
     * Minimum allowed period for automatic objects cleanup job.
     */
    static final int CLEANUP_PERIOD_MIN             = 100;
    /**
     * Maximum allowed period for automatic objects cleanup job.
     */
    static final int CLEANUP_PERIOD_MAX             = 60_000;
    /**
     * Keep object in memory for one more second after the explicit remove.
     */
    static final int CLEANUP_REMOVE_DELAY           = 1_000;
    /**
     * Time interval in milliseconds to keep pre-authorized biometric key in memory.
     */
    static final int BIOMETRY_KEY_KEEP_ALIVE_TIME   = 10_000;
    /**
     * Time interval in milliseconds to keep password object valid in memory.
     */
    static final int PASSWORD_KEY_KEEP_ALIVE_TIME   = 5 * 60 * 1_000;
    /**
     * Time interval in milliseconds to keep encryptor object valid in memory.
     */
    static final int ENCRYPTOR_KEY_KEEP_ALIVE_TIME  = 5 * 60 * 1_000;
    /**
     * Time interval in milliseconds to keep decryptor object valid in memory.
     */
    static final int DECRYPTOR_KEY_KEEP_ALIVE_TIME  = 5 * 60 * 1_000;
    /**
     * Upper limit for Unicode Code Point.
     */
    static final int CODEPOINT_MAX                  = 0x10FFFF;

    // Fallback strings

    /**
     * Fallback string used in biometric authentication when no title is
     * provided to authentication dialog.
     */
    static final String MISSING_REQUIRED_STRING     = "< missing >";
}
