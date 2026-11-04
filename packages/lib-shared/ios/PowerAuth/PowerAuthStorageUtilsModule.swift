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

@objc(PowerAuthStorageUtilsModule)
final class PowerAuthStorageUtilsModule: PAJSModule {

    private static let storageTypeSecure = "SECURE"
    private static let storageTypeStandard = "STANDARD"
    private static let keychainServiceName = "com.wultra.powerauth.jssdk.storageutils.secure"
    private static let userDefaultsSuiteName = "com.wultra.powerauth.jssdk.storageutils.standard"

    private lazy var keychain = PowerAuthKeychain(identifier: Self.keychainServiceName)
    private lazy var userDefaults = UserDefaults(suiteName: Self.userDefaultsSuiteName)

    @objc(setString:value:storageType:resolve:reject:)
    func setString(_ key: Any?, value: Any?, storageType: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        // NSString keeps the value unchanged; its UTF-8 conversion fails on unpaired surrogates.
        let value = value as? NSString
        withStorage(key, storageType, reject: reject) { key, secure in
            if secure {
                guard let data = value?.data(using: String.Encoding.utf8.rawValue) else {
                    reject(PAJSErrorCode.wrongParameter, "Failed to convert string into UTF8 encoded data", nil)
                    return
                }
                switch keychain.addValue(data, forKey: key) {
                case .ok:
                    resolve(NSNull())
                case .duplicate:
                    if keychain.updateValue(data, forKey: key) == .ok {
                        resolve(NSNull())
                    } else {
                        reject(PAJSErrorCode.encryptionError, "Failed to update value in Keychain", nil)
                    }
                default:
                    reject(PAJSErrorCode.encryptionError, "Failed to store value in Keychain", nil)
                }
            } else {
                userDefaults?.set(value, forKey: key)
                userDefaults?.synchronize()
                resolve(NSNull())
            }
        }
    }

    @objc(getString:storageType:resolve:reject:)
    func getString(_ key: Any?, storageType: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withStorage(key, storageType, reject: reject) { key, secure in
            if secure {
                if let data = keychain.data(forKey: key, status: nil) {
                    resolve(String(data: data, encoding: .utf8))
                } else {
                    resolve(NSNull())
                }
            } else {
                resolve(PAJS.nullable(userDefaults?.string(forKey: key)))
            }
        }
    }

    @objc(exists:storageType:resolve:reject:)
    func exists(_ key: Any?, storageType: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withStorage(key, storageType, reject: reject) { key, secure in
            resolve(contains(key, secure: secure))
        }
    }

    @objc(remove:storageType:resolve:reject:)
    func remove(_ key: Any?, storageType: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withStorage(key, storageType, reject: reject) { key, secure in
            let existed = contains(key, secure: secure)
            if secure {
                _ = keychain.deleteData(forKey: key)
            } else {
                userDefaults?.removeObject(forKey: key)
                userDefaults?.synchronize()
            }
            resolve(existed)
        }
    }

    // MARK: - Private

    /// Validates the key and storage type, then calls the action with the key and `true` for secure storage.
    private func withStorage(_ key: Any?, _ storageType: Any?, reject: PAJSRejectBlock, action: (String, Bool) -> Void) {
        guard let key = key as? String, !key.isEmpty else {
            reject(PAJSErrorCode.wrongParameter, "Key cannot be empty", nil)
            return
        }
        switch storageType as? String {
        case Self.storageTypeSecure: action(key, true)
        case Self.storageTypeStandard: action(key, false)
        default: reject(PAJSErrorCode.wrongParameter, "Invalid storage type", nil)
        }
    }

    private func contains(_ key: String, secure: Bool) -> Bool {
        return secure ? keychain.containsData(forKey: key) : userDefaults?.object(forKey: key) != nil
    }
}
