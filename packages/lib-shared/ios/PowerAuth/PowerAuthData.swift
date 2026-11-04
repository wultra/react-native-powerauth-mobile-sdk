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

import Foundation
import PowerAuth2

/// Object that wraps data managed from JavaScript.
@objc(PowerAuthData)
final class PowerAuthData: NSObject {

    private let data: NSData?
    private let cleanup: Bool

    /// Contains managed secure data when the object represents a cryptographic key.
    let secureData: PowerAuthSecureData?

    /// Initialize object with data. If `cleanup` is set, then mutable data is zeroed when the object is released.
    init(data: NSData, cleanup: Bool) {
        self.data = data
        self.cleanup = cleanup
        self.secureData = nil
        super.init()
    }

    /// Initialize object with data already protected by PowerAuth SDK.
    init(secureData: PowerAuthSecureData) {
        self.data = nil
        self.cleanup = false
        self.secureData = secureData
        super.init()
    }

    deinit {
        if cleanup, let mutableData = data as? NSMutableData {
            memset(mutableData.mutableBytes, 0, mutableData.length)
        }
    }
}
