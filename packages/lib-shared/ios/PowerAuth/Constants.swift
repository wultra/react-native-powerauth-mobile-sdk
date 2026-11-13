/*
 * Copyright 2026 Wultra s.r.o.
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

/// Constants shared by all bridge modules. Time intervals are in milliseconds.
enum PAJSConstants {
    /// Time interval to keep pre-authorized biometric key in memory.
    static let biometryKeyKeepAliveTime = 10000
    /// Time interval to keep password object valid in memory.
    static let passwordKeyKeepAliveTime = 5 * 60 * 1000
    /// Maximum lifetime of password-change data if the operation is abandoned.
    static let passwordChangeDataExpireTime = 5 * 60 * 1000
    /// Time interval to keep encryptor object alive in memory.
    static let encryptorKeepAliveTime = 5 * 60 * 1000
    /// Time interval to keep a Secure Vault base key in memory.
    static let secureVaultKeyKeepAliveTime = 5 * 60 * 1000
    /// Upper limit for Unicode Code Point.
    static let codePointMax: UInt32 = 0x10FFFF
    /// Default period for automatic objects cleanup job.
    static let cleanupPeriodDefault = 10000
    /// Minimum allowed period for automatic objects cleanup job.
    static let cleanupPeriodMin = 100
    /// Maximum allowed period for automatic objects cleanup job.
    static let cleanupPeriodMax = 60000
}
