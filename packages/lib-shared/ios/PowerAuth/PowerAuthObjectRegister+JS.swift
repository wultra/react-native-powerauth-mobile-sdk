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

/*
 This extension exports the object register methods to JavaScript.
 The 'debug' methods are available only if library is compiled in DEBUG configuration.
 */
extension PowerAuthObjectRegister {

    @objc(isValidNativeObject:resolve:reject:)
    func isValidNativeObject(_ objectId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        resolve(containsObject(withId: objectId))
    }

    @objc(releaseNativeObject:resolve:reject:)
    func releaseNativeObject(_ objectId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        releaseObject(withId: objectId)
        resolve(nil)
    }

    @objc(debugDump:resolve:reject:)
    func debugDump(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        #if DEBUG
        resolve(debugDumpObjects(withTag: instanceId as? String))
        #else
        resolve(nil)
        #endif
    }

    @objc(debugCommand:options:resolve:reject:)
    func debugCommand(_ command: Any?, options: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        #if DEBUG
        let command = command as? String
        let options = options as? [String: Any] ?? [:]
        let objectId = options["objectId"] as? String
        let objectTag = options["objectTag"] as? String
        let objectType = options["objectType"] as? String

        /// Executes command that accesses an object of the expected type.
        func access<T: AnyObject>(_ type: T.Type) -> Bool? {
            guard let objectId = objectId else {
                return nil
            }
            switch command {
            case "release": return releaseObject(withId: objectId, as: type) != nil
            case "use": return useObject(withId: objectId, as: type) != nil
            case "find": return findObject(withId: objectId, as: type) != nil
            case "touch": return touchObject(withId: objectId, as: type) != nil
            default: return nil
            }
        }

        switch command {
        case "create":
            // The "create" command creates a new instance of managed object and returns its ID to JavaScript.
            let releasePolicy = (options["releasePolicy"] as? [Any])?.compactMap { $0 as? String } ?? []
            let policies: [PAJSReleasePolicy] = releasePolicy.compactMap { policy in
                // The original implementation stored the parameter in an unsigned 24-bit field.
                let param = ((policy.components(separatedBy: " ").last as NSString?)?.integerValue ?? 0) & 0xFF_FFFF
                if policy == "manual" {
                    return .manual
                } else if policy.hasPrefix("afterUse") {
                    return .afterUse(param)
                } else if policy.hasPrefix("keepAlive") {
                    return .keepAlive(param)
                } else if policy.hasPrefix("expire") {
                    return .expire(param)
                }
                return nil
            }
            let instance: AnyObject?
            switch objectType {
            case "data": instance = PowerAuthData(data: Data("TEST-DATA".utf8) as NSData, cleanup: false)
            case "secure-data": instance = PowerAuthData(data: NSMutableData(data: Data("SECURE-DATA".utf8)), cleanup: true)
            case "number": instance = NSNumber(value: 42)
            case "password": instance = PowerAuthMutablePassword()
            default: instance = nil
            }
            if !policies.isEmpty, let instance = instance {
                resolve(register(instance, tag: objectTag, policies: policies))
                return
            }
        case "releaseAll":
            // The "releaseAll" command release all objects with a specified tag. If tag is nil, then releases all objects.
            removeAllObjects(withTag: objectTag)
            resolve(nil)
            return
        case "setPeriod":
            setCleanupPeriod((options["cleanupPeriod"] as? NSNumber)?.intValue ?? 0)
            resolve(nil)
            return
        default:
            // The "release", "use", "find" and "touch" commands return true / false whether the object was found.
            let result: Bool?
            switch objectType {
            case "data", "secure-data": result = access(PowerAuthData.self)
            case "number": result = access(NSNumber.self)
            case "password": result = access(PowerAuthMutablePassword.self)
            case "encryptor": result = access(PowerAuthEncryptor.self)
            default: result = nil
            }
            if let result = result {
                resolve(result)
                return
            }
        }
        reject(PAJSErrorCode.wrongParameter, "Wrong parameter for cmd \(command ?? "(null)"), \(options as NSDictionary)", nil)
        #else
        resolve(nil)
        #endif
    }
}
