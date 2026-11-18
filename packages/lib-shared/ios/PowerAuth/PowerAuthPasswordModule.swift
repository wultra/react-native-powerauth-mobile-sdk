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

@objc(PowerAuthPasswordModule)
final class PowerAuthPasswordModule: PAJSModule {

    @objc(initialize:ownerId:autoreleaseTime:resolve:reject:)
    func initialize(_ destroyAfterUse: Bool, ownerId: Any?, autoreleaseTime: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        let powerAuthInstanceId = ownerId as? String
        // If owning PowerAuth instance is specified, then make sure it still exists
        if let powerAuthInstanceId = powerAuthInstanceId, !objectRegister.containsObject(withId: powerAuthInstanceId) {
            reject(PAJSErrorCode.instanceNotConfigured, "PowerAuth instance is not configured", nil)
            return
        }
        let releaseTime = PAJS.timeInterval(autoreleaseTime, defaultValue: PAJSConstants.passwordKeyKeepAliveTime)
        // Now create and register a new password object
        let policies: [PAJSReleasePolicy] = destroyAfterUse
            ? [.keepAlive(releaseTime), .afterUse(1)]
            : [.keepAlive(releaseTime)]
        resolve(objectRegister.register(PowerAuthMutablePassword(), tag: powerAuthInstanceId, policies: policies))
    }

    @objc(clear:resolve:reject:)
    func clear(_ objectId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPassword(objectId, reject: reject) { password in
            password.clear()
            resolve(nil)
        }
    }

    @objc(length:resolve:reject:)
    func length(_ objectId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPassword(objectId, reject: reject) { password in
            resolve(password.length())
        }
    }

    @objc(isEqual:id2:resolve:reject:)
    func isEqual(_ id1: Any?, id2: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPassword(id1, reject: reject) { password1 in
            withPassword(id2, reject: reject) { password2 in
                resolve(password1.isEqual(to: password2))
            }
        }
    }

    @objc(addCharacter:character:resolve:reject:)
    func addCharacter(_ objectId: Any?, character: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPassword(objectId, character: character, reject: reject) { password, character in
            _ = password.addCharacter(character)
            resolve(password.length())
        }
    }

    @objc(insertCharacter:character:position:resolve:reject:)
    func insertCharacter(_ objectId: Any?, character: Any?, position: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPassword(objectId, character: character, reject: reject) { password, character in
            let position = (position as? NSNumber)?.intValue ?? 0
            if position >= 0 && UInt(position) <= password.length() {
                _ = password.insertCharacter(character, at: UInt(position))
                resolve(password.length())
            } else {
                reject(PAJSErrorCode.wrongParameter, "Position is out of range", nil)
            }
        }
    }

    @objc(removeCharacter:position:resolve:reject:)
    func removeCharacter(_ objectId: Any?, position: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPassword(objectId, reject: reject) { password in
            let position = (position as? NSNumber)?.intValue ?? 0
            if position >= 0 && UInt(position) < password.length() {
                _ = password.removeCharacter(at: UInt(position))
                resolve(password.length())
            } else {
                reject(PAJSErrorCode.wrongParameter, "Position is out of range", nil)
            }
        }
    }

    @objc(removeLastCharacter:resolve:reject:)
    func removeLastCharacter(_ objectId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPassword(objectId, reject: reject) { password in
            _ = password.removeLastCharacter()
            resolve(password.length())
        }
    }

    // MARK: - Private interface

    private func withPassword(_ passwordId: Any?, reject: PAJSRejectBlock, action: (PowerAuthMutablePassword) -> Void) {
        guard let password = objectRegister.touchObject(withId: passwordId, as: PowerAuthMutablePassword.self) else {
            reject(PAJSErrorCode.invalidNativeObject, "Password object is no longer valid", nil)
            return
        }
        action(password)
    }

    private func withPassword(_ passwordId: Any?, character: Any?, reject: PAJSRejectBlock, action: (PowerAuthMutablePassword, UInt32) -> Void) {
        guard let codePoint = (character as? NSNumber)?.uint32Value else {
            reject(PAJSErrorCode.wrongParameter, "Empty or invalid character object", nil)
            return
        }
        guard codePoint <= PAJSConstants.codePointMax else {
            reject(PAJSErrorCode.wrongParameter, "CodePoint is too big", nil)
            return
        }
        withPassword(passwordId, reject: reject) { password in
            action(password, codePoint)
        }
    }
}
