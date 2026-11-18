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

/// Error codes reported to JavaScript.
enum PAJSErrorCode {
    static let networkError = "NETWORK_ERROR"
    static let signatureError = "SIGNATURE_ERROR"
    static let wrongSignature = "WRONG_SIGNATURE"
    static let invalidActivationState = "INVALID_ACTIVATION_STATE"
    static let invalidActivationData = "INVALID_ACTIVATION_DATA"
    static let missingActivation = "MISSING_ACTIVATION"
    static let pendingActivation = "PENDING_ACTIVATION"
    static let operationCanceled = "OPERATION_CANCELED"
    static let invalidToken = "INVALID_TOKEN"
    static let encryptionError = "ENCRYPTION_ERROR"
    static let wrongParameter = "WRONG_PARAMETER"
    static let protocolUpgrade = "PROTOCOL_UPGRADE"
    static let pendingProtocolUpgrade = "PENDING_PROTOCOL_UPGRADE"
    static let upgradeSdk = "UPGRADE_SDK"
    static let watchConnectivity = "WATCH_CONNECTIVITY"
    static let biometryCancel = "BIOMETRY_CANCEL"
    static let biometryFallback = "BIOMETRY_FALLBACK"
    static let biometryFailed = "BIOMETRY_FAILED"
    static let biometryNotAvailable = "BIOMETRY_NOT_AVAILABLE"
    static let other = "OTHER"
    static let unknownError = "UNKNOWN_ERROR"
    static let reactNativeError = "REACT_NATIVE_ERROR"
    static let invalidActivationObject = "INVALID_ACTIVATION_OBJECT"
    static let invalidActivationCode = "INVALID_ACTIVATION_CODE"
    static let invalidCharacter = "INVALID_CHARACTER"
    static let localTokenNotAvailable = "LOCAL_TOKEN_NOT_AVAILABLE"
    static let instanceNotConfigured = "INSTANCE_NOT_CONFIGURED"
    static let invalidNativeObject = "INVALID_NATIVE_OBJECT"
    static let externalPendingOperation = "EXTERNAL_PENDING_OPERATION"
    static let timeSynchronization = "TIME_SYNCHRONIZATION"
}

extension PAJS {

    /// Translates `PowerAuthErrorCode` into its JavaScript representation.
    static func translate(_ code: PowerAuthErrorCode) -> String {
        switch code {
        case .networkError: return PAJSErrorCode.networkError
        case .signatureError: return PAJSErrorCode.signatureError
        case .wrongSignature: return PAJSErrorCode.wrongSignature
        case .invalidActivationState: return PAJSErrorCode.invalidActivationState
        case .invalidActivationData: return PAJSErrorCode.invalidActivationData
        case .missingActivation: return PAJSErrorCode.missingActivation
        case .activationPending: return PAJSErrorCode.pendingActivation
        case .biometryCancel: return PAJSErrorCode.biometryCancel
        case .operationCancelled: return PAJSErrorCode.operationCanceled
        case .invalidActivationCode: return PAJSErrorCode.invalidActivationCode
        case .invalidToken: return PAJSErrorCode.invalidToken
        case .encryption: return PAJSErrorCode.encryptionError
        case .wrongParameter: return PAJSErrorCode.wrongParameter
        case .protocolUpgrade: return PAJSErrorCode.protocolUpgrade
        case .pendingProtocolUpgrade: return PAJSErrorCode.pendingProtocolUpgrade
        case .upgradeSDK: return PAJSErrorCode.upgradeSdk
        case .biometryNotAvailable: return PAJSErrorCode.biometryNotAvailable
        case .watchConnectivity: return PAJSErrorCode.watchConnectivity
        case .biometryFailed: return PAJSErrorCode.biometryFailed
        case .biometryFallback: return PAJSErrorCode.biometryFallback
        case .timeSynchronization: return PAJSErrorCode.timeSynchronization
        case .externalPendingOperation: return PAJSErrorCode.externalPendingOperation
        case .other: return PAJSErrorCode.other
        default: return PAJSErrorCode.unknownError
        }
    }

    /// Translates a native error into a JavaScript error code and reports it to the reject block.
    static func processError(_ error: Error?, reject: PAJSRejectBlock) {
        guard let error = error.map({ $0 as NSError }) else {
            reject(PAJSErrorCode.unknownError, "Native code failed with unspecified error", nil)
            return
        }
        let message = error.localizedDescription
        let errorCode: String
        var reportedError = error
        let paErrorCode = error.powerAuthErrorCode
        if paErrorCode != .NA {
            errorCode = translate(paErrorCode)
            if let responseObject = error.powerAuthRestApiErrorResponse {
                // The JavaScript bridge cannot serialize custom objects stored in NSError,
                // so create a new error containing only plain serializable data.
                var userInfo: [String: Any] = [
                    NSLocalizedDescriptionKey: message,
                    "httpStatusCode": responseObject.httpStatusCode,
                ]
                if let responseData = error.userInfo[PowerAuthErrorInfoKey_ResponseData] as? Data {
                    if let responseBody = String(data: responseData, encoding: .utf8) {
                        userInfo["responseBody"] = responseBody
                    }
                } else if let additionalInfo = error.userInfo[PowerAuthErrorInfoKey_AdditionalInfo],
                          JSONSerialization.isValidJSONObject(additionalInfo),
                          let jsonData = try? JSONSerialization.data(withJSONObject: additionalInfo),
                          let responseBody = String(data: jsonData, encoding: .utf8) {
                    userInfo["responseBody"] = responseBody
                }
                if let serverResponseCode = responseObject.responseObject?.code {
                    userInfo["serverResponseCode"] = serverResponseCode
                }
                if let serverResponseMessage = responseObject.responseObject?.message {
                    userInfo["serverResponseMessage"] = serverResponseMessage
                }
                reportedError = NSError(domain: PowerAuthErrorDomain, code: error.code, userInfo: userInfo)
            }
        } else if error.domain == NSURLErrorDomain {
            errorCode = PAJSErrorCode.networkError
        } else {
            errorCode = PAJSErrorCode.unknownError
        }
        reject(errorCode, message, reportedError)
    }
}
