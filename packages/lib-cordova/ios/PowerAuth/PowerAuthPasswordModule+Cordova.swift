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

/// Cordova actions of `PowerAuthPasswordModule`. Each action reads its arguments in declaration order.
extension PowerAuthPasswordModule {

    @objc(initialize:)
    func initialize(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            initialize(args.bool(0), ownerId: args[1], autoreleaseTime: args[2], resolve: resolve, reject: reject)
        }
    }

    @objc(clear:)
    func clear(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            clear(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(length:)
    func length(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            length(args[0], resolve: resolve, reject: reject)
        }
    }

    // Cordova dispatches the "isEqual" action to `isEqual:`, which is declared by NSObject.
    override func isEqual(_ object: Any?) -> Bool {
        guard let command = object as? CDVInvokedUrlCommand else {
            return super.isEqual(object)
        }
        execute(command) { args, resolve, reject in
            isEqual(args[0], id2: args[1], resolve: resolve, reject: reject)
        }
        return false
    }

    @objc(addCharacter:)
    func addCharacter(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            addCharacter(args[0], character: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(insertCharacter:)
    func insertCharacter(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            insertCharacter(args[0], character: args[1], position: args[2], resolve: resolve, reject: reject)
        }
    }

    @objc(removeCharacter:)
    func removeCharacter(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            removeCharacter(args[0], position: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(removeLastCharacter:)
    func removeLastCharacter(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            removeLastCharacter(args[0], resolve: resolve, reject: reject)
        }
    }
}
