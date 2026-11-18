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

/// Cordova actions of `PowerAuthEncryptorModule`. Each action reads its arguments in declaration order.
extension PowerAuthEncryptorModule {

    @objc(initialize:)
    func initialize(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            initialize(args[0], ownerId: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(canEncryptRequest:)
    func canEncryptRequest(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            canEncryptRequest(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(canDecryptResponse:)
    func canDecryptResponse(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            canDecryptResponse(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(encryptRequest:)
    func encryptRequest(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            encryptRequest(args[0], requestBodyBase64: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(decryptResponse:)
    func decryptResponse(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            decryptResponse(args[0], responseBodyBase64: args[1], resolve: resolve, reject: reject)
        }
    }
}
