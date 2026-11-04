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

/// Base class of the shared bridge modules in Cordova. Cordova calls an action by invoking the plugin method
/// named after the action. The `+Cordova` extensions implement these methods and forward the positional
/// arguments to the shared implementation.
class PAJSModule: CDVPlugin {

    /// Object register shared by all modules. Available once the plugin is initialized.
    var objectRegister: PowerAuthObjectRegister!

    override func pluginInitialize() {
        super.pluginInitialize()
        setUpModule()
    }

    override func dispose() {
        tearDownModule()
        super.dispose()
    }

    /// Called once the plugin is created.
    func setUpModule() {
        objectRegister = commandDelegate.getCommandInstance("PowerAuthObjectRegister") as? PowerAuthObjectRegister
    }

    /// Called when the plugin is disposed.
    func tearDownModule() {
    }

    /// Calls the action with the command's arguments and promise blocks. The result is reported as JSON string
    /// with the `result` envelope, or as JSON error object, which are unwrapped by `NativeCordovaModule`.
    func execute(_ command: CDVInvokedUrlCommand, action: (PAJSArguments, @escaping PAJSResolveBlock, @escaping PAJSRejectBlock) -> Void) {
        let resolve: PAJSResolveBlock = { result in
            let jsonData = try? JSONSerialization.data(withJSONObject: ["result": PAJS.nullable(result)], options: .prettyPrinted)
            self.send(.ok, jsonData.flatMap { String(data: $0, encoding: .utf8) } ?? "", command)
        }
        let reject: PAJSRejectBlock = { code, message, error in
            var errorDict: [String: Any] = ["code": PAJS.nullable(code), "message": PAJS.nullable(message)]
            if let userInfo = error.map({ ($0 as NSError).userInfo }), JSONSerialization.isValidJSONObject(userInfo) {
                errorDict["userInfo"] = userInfo
            }
            let jsonData = try? JSONSerialization.data(withJSONObject: errorDict, options: .prettyPrinted)
            let jsonString = jsonData.flatMap { String(data: $0, encoding: .utf8) }
            self.send(.error, jsonString ?? #"{"code":"SERIALIZATION_ERROR","message":"Failed to serialize error"}"#, command)
        }
        action(PAJSArguments(command: command), resolve, reject)
    }

    private func send(_ status: CDVCommandStatus, _ message: String, _ command: CDVInvokedUrlCommand) {
        commandDelegate.send(CDVPluginResult(status: status, messageAs: message), callbackId: command.callbackId)
    }
}

/// Positional arguments of a Cordova command. Missing arguments and `null` values are `nil`.
struct PAJSArguments {

    let command: CDVInvokedUrlCommand

    subscript(index: Int) -> Any? {
        return command.argument(at: UInt(index))
    }

    func bool(_ index: Int) -> Bool {
        return PAJS.bool(self[index])
    }
}
