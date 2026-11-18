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

import Cordova
import Foundation

/// Cordova actions of `PowerAuthCryptoUtilsModule`. Each action reads its arguments in declaration order.
extension PowerAuthCryptoUtilsModule {

    @objc(hashSha256:)
    func hashSha256(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            hashSha256(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(randomBytes:)
    func randomBytes(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            randomBytes(args[0], resolve: resolve, reject: reject)
        }
    }
}
