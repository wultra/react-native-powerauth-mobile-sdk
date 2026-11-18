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

/// Promise resolve block, compatible with React Native's `RCTPromiseResolveBlock`.
typealias PAJSResolveBlock = (Any?) -> Void
/// Promise reject block, compatible with React Native's `RCTPromiseRejectBlock`.
typealias PAJSRejectBlock = (String?, String?, Error?) -> Void

/// Namespace for helper functions shared by all bridge modules.
enum PAJS {

    /// Data format requested by the application.
    enum DataFormat {
        /// Plain string
        case utf8
        /// Base64 encoded string
        case base64
    }

    /// Converts a JavaScript value into a boolean. Values other than numbers and strings are `false`.
    static func bool(_ value: Any?) -> Bool {
        return (value as? NSNumber)?.boolValue ?? (value as? NSString)?.boolValue ?? false
    }

    /// Converts an optional value into a value that is `null` in JavaScript when missing.
    static func nullable(_ value: Any?) -> Any {
        return value ?? NSNull()
    }

    /// Converts data format into `DataFormat`. Missing format means UTF-8. Returns `nil` and
    /// calls the reject block if the format is invalid.
    static func dataFormat(_ format: Any?, reject: PAJSRejectBlock) -> DataFormat? {
        guard let format = format else {
            return .utf8
        }
        switch format as? String {
        case "UTF8": return .utf8
        case "BASE64": return .base64
        default:
            reject(PAJSErrorCode.wrongParameter, "Invalid data format specified", nil)
            return nil
        }
    }

    /// Converts a string into data, depending on data format. Missing value produces empty data.
    /// Returns `nil` and calls the reject block if the conversion failed.
    static func decodeData(_ value: Any?, format: DataFormat, reject: PAJSRejectBlock) -> Data? {
        guard let value = value as? NSString else {
            return Data()
        }
        switch format {
        case .utf8:
            // NSString conversion fails on unpaired surrogates instead of replacing them.
            guard let result = value.data(using: String.Encoding.utf8.rawValue) else {
                reject(PAJSErrorCode.wrongParameter, "Failed to convert string into UTF8 encoded data", nil)
                return nil
            }
            return result
        case .base64:
            guard let result = Data(base64Encoded: value as String, options: .ignoreUnknownCharacters) else {
                reject(PAJSErrorCode.wrongParameter, "Failed to decode Base64 encoded data.", nil)
                return nil
            }
            return result
        }
    }

    /// Removes `NSNull` values from the object and from all nested dictionaries.
    static func patchNull(_ object: Any) -> Any? {
        if object is NSNull {
            return nil
        }
        if let dictionary = object as? [String: Any] {
            return dictionary.compactMapValues { patchNull($0) }
        }
        return object
    }

    /// Converts a JavaScript number into a time interval in milliseconds. A custom interval is accepted only in
    /// DEBUG builds and cannot exceed the default value; release builds always use the default value.
    static func timeInterval(_ anyValue: Any?, defaultValue: Int) -> Int {
        #if DEBUG
        if let time = (anyValue as? NSNumber)?.uintValue, time != 0 {
            return Int(min(time, UInt(defaultValue)))
        }
        #endif
        return defaultValue
    }
}

extension PowerAuthObjectRegister {

    /// Translates an object into `PowerAuthPassword` and marks the registered password as used.
    /// Calls the reject block and returns `nil` if no such conversion is possible.
    func usePassword(_ anyPassword: Any?, reject: PAJSRejectBlock) -> PowerAuthPassword? {
        return findPassword(anyPassword, reject: reject, use: true)
    }

    /// Translates an object into `PowerAuthPassword` and prolongs the registered password's lifetime.
    /// Calls the reject block and returns `nil` if no such conversion is possible.
    func touchPassword(_ anyPassword: Any?, reject: PAJSRejectBlock) -> PowerAuthPassword? {
        return findPassword(anyPassword, reject: reject, use: false)
    }

    /// Translates an instance identifier into a configured `PowerAuthSDK`.
    /// Calls the reject block and returns `nil` if no such instance is configured.
    func powerAuthSdk(_ anyId: Any?, reject: PAJSRejectBlock) -> PowerAuthSDK? {
        guard isValidObjectId(anyId) else {
            reject(PAJSErrorCode.wrongParameter, "PowerAuth instance identifier is missing or empty string", nil)
            return nil
        }
        guard let sdk = findObject(withId: anyId, as: PowerAuthSDK.self) else {
            reject(PAJSErrorCode.instanceNotConfigured, "PowerAuth instance is not configured.", nil)
            return nil
        }
        return sdk
    }

    private func findPassword(_ anyPassword: Any?, reject: PAJSRejectBlock, use: Bool) -> PowerAuthPassword? {
        if let password = anyPassword as? String {
            return PowerAuthPassword(string: password)
        }
        guard let dictionary = anyPassword as? [String: Any] else {
            reject(PAJSErrorCode.wrongParameter, "PowerAuthPassword or string is required", nil)
            return nil
        }
        guard let passwordObjectId = dictionary["objectId"] else {
            // Wrong object is passed, or PowerAuthPassword JavaScript object is not initialized yet.
            reject(PAJSErrorCode.wrongParameter, "PowerAuthPassword is not initialized", nil)
            return nil
        }
        let password = use
            ? useObject(withId: passwordObjectId, as: PowerAuthPassword.self)
            : touchObject(withId: passwordObjectId, as: PowerAuthPassword.self)
        guard let password = password else {
            reject(PAJSErrorCode.invalidNativeObject, "PowerAuthPassword object is no longer valid", nil)
            return nil
        }
        return password
    }
}
