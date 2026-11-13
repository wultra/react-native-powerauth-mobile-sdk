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

@objc(PowerAuthEncryptorModule)
final class PowerAuthEncryptorModule: PAJSModule {

    @objc(initialize:ownerId:resolve:reject:)
    func initialize(_ scope: Any?, ownerId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        let activationScope: Bool
        switch scope as? String {
        case "APPLICATION": activationScope = false
        case "ACTIVATION": activationScope = true
        default:
            reject(PAJSErrorCode.wrongParameter, "scope parameter is missing or contains invalid value", nil)
            return
        }
        guard let sdk = objectRegister.powerAuthSdk(ownerId, reject: reject), let ownerId = ownerId as? String else {
            return
        }
        let callback = { (encryptor: PowerAuthEncryptor?, error: Error?) in
            guard let encryptor = encryptor else {
                PAJS.processError(error, reject: reject)
                return
            }
            let policies: [PAJSReleasePolicy] = [.keepAlive(PAJSConstants.encryptorKeepAliveTime)]
            guard let objectId = self.objectRegister.register(encryptor, ifOwnerMatches: sdk, ownerId: ownerId, policies: policies) else {
                reject(PAJSErrorCode.instanceNotConfigured, "PowerAuth instance is no longer configured", nil)
                return
            }
            resolve(objectId)
        }
        if activationScope {
            _ = sdk.encryptorForActivationScope(callback: callback)
        } else {
            _ = sdk.encryptorForApplicationScope(callback: callback)
        }
    }

    @objc(canEncryptRequest:resolve:reject:)
    func canEncryptRequest(_ encryptorId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        if let encryptor = touchEncryptor(encryptorId, reject: reject) {
            resolve(encryptor.canEncryptRequest)
        }
    }

    @objc(canDecryptResponse:resolve:reject:)
    func canDecryptResponse(_ encryptorId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        if let encryptor = touchEncryptor(encryptorId, reject: reject) {
            resolve(encryptor.canDecryptResponse)
        }
    }

    @objc(encryptRequest:requestBodyBase64:resolve:reject:)
    func encryptRequest(_ encryptorId: Any?, requestBodyBase64: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        var clearBody: Data?
        if let requestBodyBase64 = requestBodyBase64 as? String {
            clearBody = Data(base64Encoded: requestBodyBase64)
            if clearBody == nil {
                reject(PAJSErrorCode.wrongParameter, "Request body is not valid Base64", nil)
                return
            }
        }
        guard let encryptor = touchEncryptor(encryptorId, reject: reject) else {
            return
        }
        do {
            let encryptedRequest = try encryptor.encryptRequest(clearBody)
            resolve([
                "requestBody": encryptedRequest.requestBody.base64EncodedString(),
                "requestHeaders": encryptedRequest.requestHeaders.map { ["name": $0.key, "value": $0.value] },
            ])
        } catch {
            PAJS.processError(error, reject: reject)
        }
    }

    @objc(decryptResponse:responseBodyBase64:resolve:reject:)
    func decryptResponse(_ encryptorId: Any?, responseBodyBase64: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        guard let encryptor = touchEncryptor(encryptorId, reject: reject) else {
            return
        }
        guard let bodyData = (responseBodyBase64 as? String).flatMap({ Data(base64Encoded: $0) }) else {
            objectRegister.releaseObject(withId: encryptorId, as: PowerAuthEncryptor.self)
            reject(PAJSErrorCode.wrongParameter, "Response body is not valid Base64", nil)
            return
        }
        let result = Swift.Result {
            try encryptor.decryptResponse(PowerAuthEncryptedResponse(responseBody: bodyData)).base64EncodedString()
        }
        objectRegister.releaseObject(withId: encryptorId, as: PowerAuthEncryptor.self)
        switch result {
        case .success(let clearResponse): resolve(clearResponse)
        case .failure(let error): PAJS.processError(error, reject: reject)
        }
    }

    // MARK: - Private

    private func touchEncryptor(_ encryptorId: Any?, reject: PAJSRejectBlock) -> PowerAuthEncryptor? {
        guard let encryptor = objectRegister.touchObject(withId: encryptorId, as: PowerAuthEncryptor.self) else {
            reject(PAJSErrorCode.invalidNativeObject, "Encryptor object is no longer valid", nil)
            return nil
        }
        return encryptor
    }
}
