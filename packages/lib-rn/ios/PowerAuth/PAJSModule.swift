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
import React

/// Base class of the shared bridge modules in React Native. The modules and their methods are exported
/// to JavaScript by `RCT_EXTERN_MODULE` declarations in the `PowerAuthBridge` directory.
class PAJSModule: NSObject, RCTInitializing, RCTInvalidating {

    /// Module registry injected by React Native.
    @objc weak var moduleRegistry: RCTModuleRegistry?

    /// Object register shared by all modules. Available once the module is initialized.
    var objectRegister: PowerAuthObjectRegister!

    @objc class func requiresMainQueueSetup() -> Bool {
        return false
    }

    func initialize() {
        setUpModule()
    }

    func invalidate() {
        tearDownModule()
    }

    /// Called once the module is created.
    func setUpModule() {
        objectRegister = moduleRegistry?.module(forName: "PowerAuthObjectRegister") as? PowerAuthObjectRegister
    }

    /// Called when the module is disposed, for example when the bridge reloads.
    func tearDownModule() {
    }
}
