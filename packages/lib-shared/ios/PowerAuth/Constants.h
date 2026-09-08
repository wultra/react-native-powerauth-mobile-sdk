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

#import "Utilities.h"

/// Time interval in milliseconds to keep pre-authorized biometric
/// key in memory.
#define BIOMETRY_KEY_KEEP_ALIVE_TIME    10000

/// Time interval in milliseconds to keep password object valid
/// in memory.
#define PASSWORD_KEY_KEEP_ALIVE_TIME    (5 * 60 * 1000)

/// Time interval in milliseconds to keep encryptor object alive in memory
#define ENCRYPTOR_KEEP_ALIVE_TIME       (5 * 60 * 1000)
/// Time interval in milliseconds to keep decryptor object alive in memory
#define DECRYPTOR_KEEP_ALIVE_TIME       (5 * 60 * 1000)

/// Upper limit for Unicode Code Point
#define CODEPOINT_MAX                    0x10FFFF

/// Default period in milliseconds for automatic objects cleanup job.
#define CLEANUP_PERIOD_DEFAULT          10000
/// Minimum allowed period for automatic objects cleanup job.
#define CLEANUP_PERIOD_MIN                100
/// Maximum allowed period for automatic objects cleanup job.
#define CLEANUP_PERIOD_MAX              60000
