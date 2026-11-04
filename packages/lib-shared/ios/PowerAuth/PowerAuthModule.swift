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
import LocalAuthentication
import PowerAuth2
import UIKit

/// Keeps password-change data registered in the object register and clears it when released.
@objc(PA2PasswordChangeDataHandle)
private final class PasswordChangeDataHandle: NSObject {

    private(set) var changeData: PowerAuthPasswordChangeData?

    init(changeData: PowerAuthPasswordChangeData) {
        self.changeData = changeData
        super.init()
    }

    func clear() {
        changeData?.secureClear()
        changeData = nil
    }

    deinit {
        clear()
    }
}

@objc(PowerAuthModule)
final class PowerAuthModule: PAJSModule {

    // MARK: - Configuration

    @objc(isConfigured:resolve:reject:)
    func isConfigured(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        if validateInstanceId(instanceId, reject: reject) != nil {
            resolve(objectRegister.findObject(withId: instanceId, as: PowerAuthSDK.self) != nil)
        }
    }

    @objc(cleanupInstanceData:configuration:keychainConfiguration:sharingConfiguration:resolve:reject:)
    func cleanupInstanceData(_ instanceId: Any?, configuration: Any?, keychainConfiguration: Any?, sharingConfiguration: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        synchronized {
            guard let instanceId = validateInstanceId(instanceId, reject: reject) else {
                return
            }
            if objectRegister.findObject(withId: instanceId, as: PowerAuthSDK.self) != nil {
                reject(PAJSErrorCode.wrongParameter, "Cannot clean up data for a configured PowerAuth instance.", nil)
                return
            }
            guard let config = Self.buildConfiguration(instanceId, configuration, sharingConfiguration, reject: reject) else {
                return
            }
            do {
                try PowerAuthSDK.cleanupInstanceData(configuration: config, keychainConfiguration: Self.buildKeychainConfiguration(keychainConfiguration))
                resolve(nil)
            } catch {
                PAJS.processError(error, reject: reject)
            }
        }
    }

    @objc(getConfiguration:resolve:reject:)
    func getConfiguration(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            let configuration = powerAuth.configuration
            guard let algorithm = Self.algorithmToString(configuration.algorithm) else {
                reject(PAJSErrorCode.wrongParameter, "Native SDK returned an unknown PowerAuth algorithm.", nil)
                return
            }
            resolve([
                "configuration": configuration.configuration,
                "baseEndpointUrl": configuration.baseEndpointUrl,
                "algorithm": algorithm,
                "offlineAuthenticationCodeComponentLength": configuration.offlineAuthenticationCodeComponentLength,
            ])
        }
    }

    @objc(getCurrentAlgorithm:resolve:reject:)
    func getCurrentAlgorithm(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            if let algorithm = Self.algorithmToString(powerAuth.currentAlgorithm) {
                resolve(algorithm)
            } else {
                reject(PAJSErrorCode.wrongParameter, "Native SDK returned an unknown PowerAuth algorithm.", nil)
            }
        }
    }

    @objc(getClientConfiguration:resolve:reject:)
    func getClientConfiguration(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            let configuration = powerAuth.clientConfiguration
            resolve([
                "enableUnsecureTraffic": configuration.sslValidationStrategy is PowerAuthClientSslNoValidationStrategy,
                "connectionTimeout": configuration.defaultRequestTimeout,
                "readTimeout": configuration.defaultRequestTimeout,
            ])
        }
    }

    @objc(getBiometryConfiguration:resolve:reject:)
    func getBiometryConfiguration(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            let configuration = powerAuth.biometricConfiguration
            resolve([
                "invalidateBiometricFactorAfterChange": configuration.invalidateBiometricFactorAfterChange,
                "fallbackToDevicePasscode": configuration.allowFallbackToDevicePasscode,
                "confirmBiometricAuthentication": false,
                "authenticateOnBiometricKeySetup": true,
                "fallbackToSharedBiometryKey": true,
                "useLegacySymmetricKey": false,
            ])
        }
    }

    @objc(getKeychainConfiguration:resolve:reject:)
    func getKeychainConfiguration(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { _, _ in
            resolve(nil)
        }
    }

    @objc(getSharingConfiguration:resolve:reject:)
    func getSharingConfiguration(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let configuration = powerAuth.configuration.sharingConfiguration else {
                resolve(nil)
                return
            }
            var result: [String: Any] = [
                "appGroup": configuration.appGroup,
                "appIdentifier": configuration.appIdentifier,
                "keychainAccessGroup": configuration.keychainAccessGroup,
            ]
            result["sharedMemoryIdentifier"] = configuration.sharedMemoryIdentifier
            resolve(result)
        }
    }

    @objc(configure:configuration:clientConfiguration:biometryConfiguration:keychainConfiguration:sharingConfiguration:resolve:reject:)
    func configure(_ instanceId: Any?, configuration: Any?, clientConfiguration: Any?, biometryConfiguration: Any?, keychainConfiguration: Any?, sharingConfiguration: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        synchronized {
            guard let instanceId = validateInstanceId(instanceId, reject: reject),
                  let config = Self.buildConfiguration(instanceId, configuration, sharingConfiguration, reject: reject) else {
                return
            }

            // HTTP client config
            let clientConfiguration = clientConfiguration as? [String: Any]
            let clientConfig = PowerAuthClientConfiguration.sharedInstance().copy() as! PowerAuthClientConfiguration
            clientConfig.defaultRequestTimeout = (clientConfiguration?["connectionTimeout"] as? NSNumber)?.doubleValue ?? 0
            if (clientConfiguration?["enableUnsecureTraffic"] as? NSNumber)?.boolValue == true {
                clientConfig.sslValidationStrategy = PowerAuthClientSslNoValidationStrategy()
            }

            // Interceptors
            var interceptors = [PowerAuthHttpRequestInterceptor]()
            // Custom HTTP headers
            for case let header as [String: Any] in clientConfiguration?["customHttpHeaders"] as? [Any] ?? [] {
                if let name = header["name"] as? String, let value = header["value"] as? String {
                    interceptors.append(PowerAuthCustomHeaderRequestInterceptor(headerKey: name, value: value))
                }
            }
            // Basic Authentication
            if let basicAuth = clientConfiguration?["basicHttpAuthentication"] as? [String: Any],
               let username = basicAuth["username"] as? String,
               let password = basicAuth["password"] as? String {
                interceptors.append(PowerAuthBasicHttpAuthenticationRequestInterceptor(username: username, password: password))
            }
            clientConfig.requestInterceptors = interceptors

            // Preserve deprecated Apple keychain settings for existing applications. New applications
            // should use PowerAuthSharingConfiguration.
            let keychainConfig = Self.buildKeychainConfiguration(keychainConfiguration)

            let biometryConfiguration = biometryConfiguration as? [String: Any]
            let biometricConfig = PowerAuthBiometricConfiguration()
            if let invalidateAfterChange = biometryConfiguration?["invalidateBiometricFactorAfterChange"] as? NSNumber
                ?? biometryConfiguration?["linkItemsToCurrentSet"] as? NSNumber {
                biometricConfig.invalidateBiometricFactorAfterChange = invalidateAfterChange.boolValue
            }
            if let fallbackToDevicePasscode = biometryConfiguration?["fallbackToDevicePasscode"] as? NSNumber {
                biometricConfig.allowFallbackToDevicePasscode = fallbackToDevicePasscode.boolValue
            }

            // Now register the instance in the thread safe manner.
            var initializationError: Error?
            let registered = objectRegister.register(withId: instanceId, tag: instanceId, policies: [.manual]) {
                do {
                    return try PowerAuthSDK(configuration: config,
                                            biometricConfiguration: biometricConfig,
                                            clientConfiguration: clientConfig,
                                            keychainConfiguration: keychainConfig)
                } catch {
                    initializationError = error
                    return nil
                }
            }
            if registered {
                resolve(true)
            } else if let initializationError = initializationError {
                PAJS.processError(initializationError, reject: reject)
            } else {
                // Instance is already configured
                reject(PAJSErrorCode.reactNativeError, "PowerAuth object with this instanceId is already configured.", nil)
            }
        }
    }

    @objc(deconfigure:resolve:reject:)
    func deconfigure(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        synchronized {
            if let instanceId = validateInstanceId(instanceId, reject: reject) {
                objectRegister.removeAllObjects(withTag: instanceId)
                resolve(true)
            }
        }
    }

    // MARK: - Activation

    @objc(hasValidActivation:resolve:reject:)
    func hasValidActivation(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.hasValidActivation())
        }
    }

    @objc(canStartActivation:resolve:reject:)
    func canStartActivation(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.canStartActivation())
        }
    }

    @objc(hasPendingActivation:resolve:reject:)
    func hasPendingActivation(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.hasPendingActivation())
        }
    }

    @objc(getExternalPendingOperation:resolve:reject:)
    func getExternalPendingOperation(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let pendingOperation = powerAuth.externalPendingOperation else {
                resolve(nil)
                return
            }
            resolve([
                "externalOperationType": pendingOperation.externalOperationType == .activation ? "ACTIVATION" : "PROTOCOL_UPGRADE",
                "externalApplicationId": pendingOperation.externalApplicationId,
            ])
        }
    }

    @objc(fetchActivationStatus:resolve:reject:)
    func fetchActivationStatus(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            _ = powerAuth.fetchActivationStatus { status, error in
                guard error == nil, let status = status else {
                    PAJS.processError(error, reject: reject)
                    return
                }
                resolve([
                    "state": Self.activationStateToString(status.state),
                    "failCount": status.failCount,
                    "maxFailCount": status.maxFailCount,
                    "remainingAttempts": status.remainingAttempts,
                    "customObject": PAJS.nullable(status.customObject),
                ])
            }
        }
    }

    @objc(hasProtocolUpgradeAvailable:resolve:reject:)
    func hasProtocolUpgradeAvailable(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.hasProtocolUpgradeAvailable())
        }
    }

    @objc(hasPendingProtocolUpgrade:resolve:reject:)
    func hasPendingProtocolUpgrade(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.hasPendingProtocolUpgrade())
        }
    }

    @objc(startProtocolUpgrade:password:upgradeBiometry:resolve:reject:)
    func startProtocolUpgrade(_ instanceId: Any?, password: Any?, upgradeBiometry: Bool, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let corePassword = objectRegister.usePassword(password, reject: reject)?.copyToImmutable() else {
                return
            }
            // Apple platforms preserve the biometric factor automatically, so `upgradeBiometry` is ignored.
            _ = powerAuth.startProtocolUpgrade(password: corePassword) { result, error in
                // Keep the immutable password alive until the asynchronous operation completes.
                withExtendedLifetime(corePassword) {}
                if let error = error {
                    PAJS.processError(error, reject: reject)
                } else if let result = result {
                    resolve([
                        "activationStatusFetchRequired": result.activationStatusFetchRequired,
                        "activationFingerprint": PAJS.nullable(result.activationFingerprint),
                        "biometryFactorRemoved": false,
                    ])
                } else {
                    reject(PAJSErrorCode.reactNativeError, "PowerAuth SDK returned neither a protocol upgrade result nor an error.", nil)
                }
            }
        }
    }

    @objc(createActivation:activation:resolve:reject:)
    func createActivation(_ instanceId: Any?, activation: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            let activation = activation as? [String: Any] ?? [:]
            let name = activation["activationName"] as? String
            var paActivation: PowerAuthActivation?
            if let activationCode = activation["activationCode"] as? String {
                paActivation = try? PowerAuthActivation(activationCode: activationCode, name: name)
            } else if let identityAttributes = Self.stringDictionary(activation["identityAttributes"]) {
                paActivation = try? PowerAuthActivation(identityAttributes: identityAttributes, name: name)
            } else if let oidcParameters = activation["oidcParameters"] as? [String: Any] {
                guard let providerId = oidcParameters["providerId"] as? String,
                      let code = oidcParameters["code"] as? String,
                      let nonce = oidcParameters["nonce"] as? String else {
                    reject(PAJSErrorCode.invalidActivationObject, "OIDC parameters are invalid.", nil)
                    return
                }
                do {
                    paActivation = try PowerAuthActivation(oidcProviderId: providerId, code: code, nonce: nonce, codeVerifier: oidcParameters["codeVerifier"] as? String)
                } catch {
                    reject(PAJSErrorCode.invalidActivationObject, "OIDC Activation object is invalid.", error)
                    return
                }
                if let name = name {
                    _ = paActivation?.with(activationName: name)
                }
            }
            guard let paActivation = paActivation else {
                reject(PAJSErrorCode.invalidActivationObject, "Activation object is invalid.", nil)
                return
            }
            if let extras = activation["extras"] as? String {
                _ = paActivation.with(extras: extras)
            }
            if let customAttributes = activation["customAttributes"] as? [String: Any] {
                _ = paActivation.with(customAttributes: customAttributes)
            }
            if let additionalActivationOtp = activation["additionalActivationOtp"] as? String {
                _ = paActivation.with(additionalActivationOtp: additionalActivationOtp)
            }
            _ = powerAuth.createActivation(paActivation) { result, error in
                guard error == nil, let result = result else {
                    PAJS.processError(error, reject: reject)
                    return
                }
                var response: [String: Any] = ["activationFingerprint": result.activationFingerprint]
                response["customAttributes"] = result.customAttributes
                response["userInfo"] = result.userInfo.map { ["allClaims": $0.allClaims] }
                resolve(PAJS.patchNull(response))
            }
        }
    }

    @objc(persistActivation:authentication:resolve:reject:)
    func persistActivation(_ instanceId: Any?, authentication: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authentication, reject: reject) else {
                return
            }
            _ = powerAuth.persistActivation(with: auth) { error in
                // Keep authentication and its sensitive values alive until the asynchronous operation completes.
                withExtendedLifetime(auth) {}
                Self.complete(error, resolve: resolve, reject: reject)
            }
        }
    }

    @objc(activationIdentifier:resolve:reject:)
    func activationIdentifier(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.activationIdentifier)
        }
    }

    @objc(activationFingerprint:resolve:reject:)
    func activationFingerprint(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.activationFingerprint)
        }
    }

    @objc(removeActivationWithAuthentication:authDict:resolve:reject:)
    func removeActivationWithAuthentication(_ instanceId: Any?, authDict: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authDict, reject: reject) else {
                return
            }
            _ = powerAuth.removeActivation(with: auth) { error in
                // Keep authentication and its sensitive values alive until the asynchronous operation completes.
                withExtendedLifetime(auth) {}
                Self.complete(error, result: true, resolve: resolve, reject: reject)
            }
        }
    }

    @objc(removeActivationLocal:resolve:reject:)
    func removeActivationLocal(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            powerAuth.removeActivationLocal()
            resolve(nil)
        }
    }

    // MARK: - Authentication codes and signatures

    @objc(authenticationHeaderForRequestWithParams:authDict:method:uriId:params:resolve:reject:)
    func authenticationHeaderForRequestWithParams(_ instanceId: Any?, authDict: Any?, method: Any?, uriId: Any?, params: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authDict, reject: reject) else {
                return
            }
            do {
                let header = try powerAuth.authenticationHeaderForRequestWithParams(with: auth, method: method as? String ?? "", uriId: uriId as? String ?? "", params: Self.stringDictionary(params))
                resolve(Self.headerToDictionary(header))
            } catch {
                PAJS.processError(error, reject: reject)
            }
        }
    }

    @objc(authenticationHeaderForRequestWithBody:authDict:method:uriId:body:resolve:reject:)
    func authenticationHeaderForRequestWithBody(_ instanceId: Any?, authDict: Any?, method: Any?, uriId: Any?, body: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authDict, reject: reject) else {
                return
            }
            do {
                let header = try powerAuth.authenticationHeaderForRequestWithBody(with: auth, method: method as? String ?? "", uriId: uriId as? String ?? "", body: Self.utf8Data(body))
                resolve(Self.headerToDictionary(header))
            } catch {
                PAJS.processError(error, reject: reject)
            }
        }
    }

    @objc(offlineAuthenticationCode:authDict:uriId:body:nonce:resolve:reject:)
    func offlineAuthenticationCode(_ instanceId: Any?, authDict: Any?, uriId: Any?, body: Any?, nonce: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authDict, reject: reject) else {
                return
            }
            _ = powerAuth.offlineAuthenticationCode(with: auth, uriId: uriId as? String ?? "", body: Self.utf8Data(body), nonce: nonce as? String ?? "") { authenticationCode, error in
                // Keep authentication and its sensitive values alive until the asynchronous operation completes.
                withExtendedLifetime(auth) {}
                Self.complete(authenticationCode, error, missing: "an offline authentication code", missingCode: PAJSErrorCode.reactNativeError, resolve: resolve, reject: reject)
            }
        }
    }

    @objc(verifyDigitalSignature:signature:data:signatureKeyId:resolve:reject:)
    func verifyDigitalSignature(_ instanceId: Any?, signature: Any?, data: Any?, signatureKeyId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let decodedSignature = PAJS.decodeData(signature, format: .base64, reject: reject),
                  let decodedData = PAJS.decodeData(data, format: .base64, reject: reject),
                  let keyId = Self.parseSignatureKeyId(signatureKeyId, reject: reject) else {
                return
            }
            do {
                try powerAuth.verifyDigitalSignature(signature: decodedSignature, forData: decodedData, withKey: keyId)
                resolve(nil)
            } catch {
                PAJS.processError(error, reject: reject)
            }
        }
    }

    @objc(calculateDigitalSignature:authDict:data:signatureKeyId:resolve:reject:)
    func calculateDigitalSignature(_ instanceId: Any?, authDict: Any?, data: Any?, signatureKeyId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authDict, reject: reject),
                  let decodedData = PAJS.decodeData(data, format: .base64, reject: reject),
                  let keyId = Self.parseSignatureKeyId(signatureKeyId, reject: reject) else {
                return
            }
            _ = powerAuth.calculateDigitalSignature(authentication: auth, forData: decodedData, withKey: keyId) { signature, error in
                // Keep authentication and its sensitive values alive until the asynchronous operation completes.
                withExtendedLifetime(auth) {}
                Self.complete(signature?.base64EncodedString(), error, missing: "a digital signature", resolve: resolve, reject: reject)
            }
        }
    }

    @objc(exportDevicePublicKeys:format:resolve:reject:)
    func exportDevicePublicKeys(_ instanceId: Any?, format: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            let nativeFormat: PowerAuthDevicePublicKeyFormat
            switch format as? String {
            case "der": nativeFormat = .der
            case "raw": nativeFormat = .raw
            default:
                reject(PAJSErrorCode.wrongParameter, "Unknown device public key format: \(Self.describe(format))", nil)
                return
            }
            let keys: [PowerAuthDevicePublicKeyData]
            do {
                keys = try powerAuth.exportDevicePublicKeys(format: nativeFormat)
            } catch {
                PAJS.processError(error, reject: reject)
                return
            }
            var result = [[String: Any]]()
            for key in keys {
                let keyType: String
                switch key.keyType {
                case .EC: keyType = "ec"
                case .ML_DSA: keyType = "mlDsa"
                default:
                    reject(PAJSErrorCode.unknownError, "PowerAuth SDK returned an unknown signature key type.", nil)
                    return
                }
                result.append([
                    "keyType": keyType,
                    "keyAlgorithm": key.keyAlgorithm,
                    "keyData": key.keyData.base64EncodedString(),
                ])
            }
            resolve(result)
        }
    }

    @objc(verifyJwsSignature:signature:compact:strict:signatureKeyId:resolve:reject:)
    func verifyJwsSignature(_ instanceId: Any?, signature: Any?, compact: Bool, strict: Bool, signatureKeyId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let keyId = Self.parseSignatureKeyId(signatureKeyId, reject: reject) else {
                return
            }
            do {
                try powerAuth.verifyJwsSignature(signature: signature as? String ?? "", compact: compact, strict: strict, withKey: keyId)
                resolve(nil)
            } catch {
                PAJS.processError(error, reject: reject)
            }
        }
    }

    @objc(calculateJwsSignature:authDict:data:dataType:compact:signatureKeyId:resolve:reject:)
    func calculateJwsSignature(_ instanceId: Any?, authDict: Any?, data: Any?, dataType: Any?, compact: Bool, signatureKeyId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authDict, reject: reject),
                  let decodedData = PAJS.decodeData(data, format: .base64, reject: reject),
                  let keyId = Self.parseSignatureKeyId(signatureKeyId, reject: reject) else {
                return
            }
            _ = powerAuth.calculateJwsSignature(authentication: auth, forData: decodedData, dataType: dataType as? String, compact: compact, withKey: keyId) { signature, error in
                // Keep authentication and its sensitive values alive until the asynchronous operation completes.
                withExtendedLifetime(auth) {}
                Self.complete(signature, error, missing: "a JWS signature", resolve: resolve, reject: reject)
            }
        }
    }

    @objc(createCertificateSigningRequest:authDict:distinguishedNames:subjectAltNames:signatureKeyId:resolve:reject:)
    func createCertificateSigningRequest(_ instanceId: Any?, authDict: Any?, distinguishedNames: Any?, subjectAltNames: Any?, signatureKeyId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authDict, reject: reject),
                  let keyId = Self.parseSignatureKeyId(signatureKeyId, reject: reject) else {
                return
            }
            _ = powerAuth.createCertificateSigningRequest(authentication: auth,
                                                          distinguishedNames: Self.stringDictionary(distinguishedNames) ?? [:],
                                                          subjectAltNames: (subjectAltNames as? [Any])?.compactMap { $0 as? String },
                                                          keyIdentifier: keyId) { csr, error in
                // Keep authentication and its sensitive values alive until the asynchronous operation completes.
                withExtendedLifetime(auth) {}
                Self.complete(csr, error, missing: "a certificate signing request", resolve: resolve, reject: reject)
            }
        }
    }

    @objc(verifyServerSignedData:data:signature:masterKey:resolve:reject:)
    func verifyServerSignedData(_ instanceId: Any?, data: Any?, signature: Any?, masterKey: Bool, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let decodedSignature = (signature as? String).flatMap({ Data(base64Encoded: $0) }) else {
                resolve(false)
                return
            }
            let keyId: PowerAuthSignatureKeyId = masterKey ? .master_EC : .server_EC
            resolve((try? powerAuth.verifyDigitalSignature(signature: decodedSignature, forData: Self.utf8Data(data), withKey: keyId)) != nil)
        }
    }

    @objc(signDataWithDevicePrivateKey:authDict:data:dataFormat:resolve:reject:)
    func signDataWithDevicePrivateKey(_ instanceId: Any?, authDict: Any?, data: Any?, dataFormat: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authDict, reject: reject),
                  let format = PAJS.dataFormat(dataFormat, reject: reject),
                  let decodedData = PAJS.decodeData(data, format: format, reject: reject) else {
                return
            }
            _ = powerAuth.calculateDigitalSignature(authentication: auth, forData: decodedData, withKey: .device_EC) { signature, error in
                // Keep authentication and its sensitive values alive until the asynchronous operation completes.
                withExtendedLifetime(auth) {}
                if let signature = signature {
                    resolve(signature.base64EncodedString())
                } else {
                    PAJS.processError(error, reject: reject)
                }
            }
        }
    }

    // MARK: - Passwords

    @objc(beginPasswordChange:oldPassword:resolve:reject:)
    func beginPasswordChange(_ instanceId: Any?, oldPassword: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, instanceId in
            guard let immutableOldPassword = objectRegister.usePassword(oldPassword, reject: reject)?.copyToImmutable() else {
                return
            }
            _ = powerAuth.beginPasswordChange(oldPassword: immutableOldPassword) { changeData, error in
                if let error = error {
                    immutableOldPassword.secureClear()
                    PAJS.processError(error, reject: reject)
                    return
                }
                guard let changeData = changeData else {
                    immutableOldPassword.secureClear()
                    reject(PAJSErrorCode.reactNativeError, "PowerAuth SDK returned neither password-change data nor an error.", nil)
                    return
                }
                let handle = PasswordChangeDataHandle(changeData: changeData)
                let policies: [PAJSReleasePolicy] = [.expire(PAJSConstants.passwordChangeDataExpireTime)]
                guard let objectId = self.objectRegister.register(handle, ifOwnerMatches: powerAuth, ownerId: instanceId, policies: policies) else {
                    handle.clear()
                    reject(PAJSErrorCode.instanceNotConfigured, "PowerAuth instance is no longer configured.", nil)
                    return
                }
                resolve(objectId)
            }
        }
    }

    @objc(finishPasswordChange:newPassword:passwordChangeDataId:resolve:reject:)
    func finishPasswordChange(_ instanceId: Any?, newPassword: Any?, passwordChangeDataId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, instanceId in
            guard let handle = objectRegister.takeObject(withId: passwordChangeDataId, as: PasswordChangeDataHandle.self, ifOwnerMatches: powerAuth, ownerId: instanceId),
                  let changeData = handle.changeData else {
                reject(PAJSErrorCode.invalidNativeObject, "Password-change data object is no longer valid.", nil)
                return
            }
            guard let immutableNewPassword = objectRegister.usePassword(newPassword, reject: reject)?.copyToImmutable() else {
                handle.clear()
                return
            }
            _ = powerAuth.finishPasswordChange(newPassword: immutableNewPassword, changeData: changeData) { error in
                immutableNewPassword.secureClear()
                handle.clear()
                Self.complete(error, resolve: resolve, reject: reject)
            }
        }
    }

    @objc(unsafeChangePassword:oldPassword:newPassword:resolve:reject:)
    func unsafeChangePassword(_ instanceId: Any?, oldPassword: Any?, newPassword: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let coreOldPassword = objectRegister.usePassword(oldPassword, reject: reject),
                  let coreNewPassword = objectRegister.usePassword(newPassword, reject: reject) else {
                return
            }
            resolve(powerAuth.unsafeChangePassword(from: coreOldPassword, to: coreNewPassword))
        }
    }

    @objc(changePassword:oldPassword:newPassword:resolve:reject:)
    func changePassword(_ instanceId: Any?, oldPassword: Any?, newPassword: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let coreOldPassword = objectRegister.usePassword(oldPassword, reject: reject),
                  let coreNewPassword = objectRegister.usePassword(newPassword, reject: reject) else {
                return
            }
            let immutableOldPassword = coreOldPassword.copyToImmutable()
            let immutableNewPassword = coreNewPassword.copyToImmutable()
            _ = powerAuth.changePassword(from: immutableOldPassword, to: immutableNewPassword) { error in
                immutableOldPassword.secureClear()
                immutableNewPassword.secureClear()
                Self.complete(error, result: true, resolve: resolve, reject: reject)
            }
        }
    }

    @objc(validatePassword:password:resolve:reject:)
    func validatePassword(_ instanceId: Any?, password: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let immutablePassword = objectRegister.usePassword(password, reject: reject)?.copyToImmutable() else {
                return
            }
            // Validation needs no registered handle; clear the native temporary data before returning.
            _ = powerAuth.beginPasswordChange(oldPassword: immutablePassword) { changeData, error in
                if let changeData = changeData {
                    changeData.secureClear()
                } else {
                    immutablePassword.secureClear()
                }
                if let error = error {
                    PAJS.processError(error, reject: reject)
                } else if changeData == nil {
                    reject(PAJSErrorCode.reactNativeError, "PowerAuth SDK returned neither password-change data nor an error.", nil)
                } else {
                    resolve(nil)
                }
            }
        }
    }

    // MARK: - Biometry

    @objc(addBiometryFactor:password:foo:resolve:reject:)
    func addBiometryFactor(_ instanceId: Any?, password: Any?, foo: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let corePassword = objectRegister.usePassword(password, reject: reject)?.copyToImmutable() else {
                return
            }
            _ = powerAuth.addBiometryFactor(password: corePassword) { error in
                // Keep the immutable password alive until the asynchronous operation completes.
                withExtendedLifetime(corePassword) {}
                Self.complete(error, resolve: resolve, reject: reject)
            }
        }
    }

    @objc(hasBiometryFactor:resolve:reject:)
    func hasBiometryFactor(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.hasBiometryFactor())
        }
    }

    @objc(removeBiometryFactor:resolve:reject:)
    func removeBiometryFactor(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            _ = powerAuth.removeBiometryFactor { error in
                Self.complete(error, resolve: resolve, reject: reject)
            }
        }
    }

    @objc(getBiometricStatus:resolve:reject:)
    func getBiometricStatus(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            let status = powerAuth.biometricStatus
            resolve([
                "isAuthenticationWithBiometricsAvailable": status.isAuthenticationWithBiometricsAvailable,
                "isBiometricFactorConfigured": status.isBiometricFactorConfigured,
                "systemStatus": Self.biometryStatusToString(status.systemStatus),
                "biometryType": Self.biometryTypeToString(status.biometryType),
            ])
        }
    }

    @objc(isAuthenticationWithBiometricsAvailable:resolve:reject:)
    func isAuthenticationWithBiometricsAvailable(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.isAuthenticationWithBiometricsAvailable)
        }
    }

    @objc(getBiometryInfo:resolve:reject:)
    func getBiometryInfo(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        let info = PowerAuthKeychain.biometricAuthenticationInfo
        resolve([
            "isAvailable": PowerAuthKeychain.canUseBiometricAuthentication,
            "biometryType": Self.biometryTypeToString(info.biometryType),
            "canAuthenticate": Self.biometryStatusToString(info.currentStatus),
        ])
    }

    @objc(authenticateWithBiometry:prompt:makeReusable:resolve:reject:)
    func authenticateWithBiometry(_ instanceId: Any?, prompt: Any?, makeReusable: Bool, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, instanceId in
            let prompt = prompt as? [String: Any]
            guard let promptMessage = prompt?["promptMessage"] as? String, !promptMessage.isEmpty else {
                reject(PAJSErrorCode.wrongParameter, "Biometric prompt message is required on iOS.", nil)
                return
            }
            let context = LAContext()
            context.localizedReason = promptMessage
            context.localizedCancelTitle = prompt?["cancelButtonTitle"] as? String ?? prompt?["cancelButton"] as? String
            // Empty string hides the fallback button.
            context.localizedFallbackTitle = prompt?["fallbackButtonTitle"] as? String ?? prompt?["fallbackButton"] as? String ?? ""
            _ = powerAuth.authenticateUsingBiometry(withContext: context) { authentication, error in
                guard let authentication = authentication else {
                    if let error = error {
                        PAJS.processError(error, reject: reject)
                    } else {
                        reject(PAJSErrorCode.reactNativeError, "Biometric authentication returned no result.", nil)
                    }
                    return
                }
                guard let customBiometryKey = authentication.customBiometryKey else {
                    reject(PAJSErrorCode.reactNativeError, "Biometric key is missing after successful authentication.", nil)
                    return
                }
                // Own an independent secure-data copy beyond the callback authentication lifetime.
                let managedData = PowerAuthData(secureData: PowerAuthSecureData(withData: customBiometryKey.sensitiveData))
                // If reusable authentication is going to be created, then "keep alive" release policy is applied.
                // Basically, the data will be available up to 10 seconds from the last access.
                // If authentication is not reusable, then dispose biometric key after its 1st use. We still need
                // to combine it with "expire" policy to make sure that key don't remain in memory forever.
                let releasePolicy: [PAJSReleasePolicy] = makeReusable
                    ? [.keepAlive(PAJSConstants.biometryKeyKeepAliveTime)]
                    : [.afterUse(1), .expire(PAJSConstants.biometryKeyKeepAliveTime)]
                if let managedId = self.objectRegister.register(managedData, ifOwnerMatches: powerAuth, ownerId: instanceId, policies: releasePolicy) {
                    resolve(managedId)
                } else {
                    reject(PAJSErrorCode.instanceNotConfigured, "PowerAuth instance is no longer configured.", nil)
                }
            }
        }
    }

    // MARK: - Encryption keys

    @objc(fetchEncryptionKey:authDict:index:resolve:reject:)
    func fetchEncryptionKey(_ instanceId: Any?, authDict: Any?, index: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authDict, reject: reject) else {
                return
            }
            _ = powerAuth.fetchEncryptionKey(auth, index: (index as? NSNumber)?.uint64Value ?? 0) { encryptionKey, error in
                // Keep authentication and its sensitive values alive until the asynchronous operation completes.
                withExtendedLifetime(auth) {}
                if let encryptionKey = encryptionKey {
                    resolve(encryptionKey.sensitiveData.base64EncodedString(options: .endLineWithLineFeed))
                } else {
                    PAJS.processError(error, reject: reject)
                }
            }
        }
    }

    @objc(fetchSecureVaultKey:authDict:keyIdentifierValue:resolve:reject:)
    func fetchSecureVaultKey(_ instanceId: Any?, authDict: Any?, keyIdentifierValue: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, instanceId in
            let keyIdentifier: PowerAuthSecureVaultKeyId
            switch keyIdentifierValue as? String {
            case "knowledge": keyIdentifier = .knowledge
            case "knowledgeOrBiometry": keyIdentifier = .knowledgeOrBiometry
            default:
                reject(PAJSErrorCode.wrongParameter, "Unknown Secure Vault key identifier: \(Self.describe(keyIdentifierValue))", nil)
                return
            }
            guard let auth = constructAuthentication(authDict, reject: reject) else {
                return
            }
            _ = powerAuth.fetchSecureVaultKey(authentication: auth, keyIdentifier: keyIdentifier) { vaultKey, error in
                // Keep authentication and its sensitive values alive until the asynchronous operation completes.
                withExtendedLifetime(auth) {}
                if let error = error {
                    PAJS.processError(error, reject: reject)
                    return
                }
                guard let vaultKey = vaultKey else {
                    reject(PAJSErrorCode.unknownError, "PowerAuth SDK returned neither a Secure Vault key nor an error.", nil)
                    return
                }
                let policies: [PAJSReleasePolicy] = [.keepAlive(PAJSConstants.secureVaultKeyKeepAliveTime)]
                guard let objectId = self.objectRegister.register(vaultKey, ifOwnerMatches: powerAuth, ownerId: instanceId, policies: policies) else {
                    reject(PAJSErrorCode.instanceNotConfigured, "PowerAuth instance is no longer configured.", nil)
                    return
                }
                resolve(objectId)
            }
        }
    }

    @objc(deriveSecureVaultKey:index:keySize:resolve:reject:)
    func deriveSecureVaultKey(_ objectId: Any?, index: Any?, keySize: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        // Index/keySize bounds are validated in PowerAuthSecureVaultKey.deriveKey (JS), matching Flutter.
        guard let vaultKey = objectRegister.touchObject(withId: objectId, as: PowerAuthSecureVaultKey.self) else {
            reject(PAJSErrorCode.invalidNativeObject, "Secure Vault key object is no longer valid.", nil)
            return
        }
        do {
            let derivedKey = try vaultKey.deriveKey(withIndex: (index as? NSNumber)?.uint64Value ?? 0, keySize: (keySize as? NSNumber)?.uint64Value ?? 0)
            resolve(derivedKey.sensitiveData.base64EncodedString())
        } catch {
            PAJS.processError(error, reject: reject)
        }
    }

    // MARK: - Activation code

    @objc(parseActivationCode:resolve:reject:)
    func parseActivationCode(_ activationCode: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        guard let code = PowerAuthActivationCodeUtil.parse(fromActivationCode: activationCode as? String ?? "") else {
            reject(PAJSErrorCode.invalidActivationCode, "Invalid activation code.", nil)
            return
        }
        var result: [String: Any] = ["activationCode": code.activationCode]
        result["activationSignature"] = code.activationSignature
        resolve(result)
    }

    @objc(validateActivationCode:resolve:reject:)
    func validateActivationCode(_ activationCode: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        resolve(PowerAuthActivationCodeUtil.validateActivationCode(activationCode as? String ?? ""))
    }

    @objc(validateTypedCharacter:resolve:reject:)
    func validateTypedCharacter(_ utfCodepoint: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        resolve(PowerAuthActivationCodeUtil.validateTypedCharacter((utfCodepoint as? NSNumber)?.uint32Value ?? 0))
    }

    @objc(correctTypedCharacter:resolve:reject:)
    func correctTypedCharacter(_ utfCodepoint: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        let corrected = PowerAuthActivationCodeUtil.validateAndCorrectTypedCharacter((utfCodepoint as? NSNumber)?.uint32Value ?? 0)
        if corrected == 0 {
            reject(PAJSErrorCode.invalidCharacter, "Invalid character cannot be corrected.", nil)
        } else {
            resolve(corrected)
        }
    }

    // MARK: - Tokens

    @objc(requestAccessToken:tokenName:authDict:resolve:reject:)
    func requestAccessToken(_ instanceId: Any?, tokenName: Any?, authDict: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            guard let auth = constructAuthentication(authDict, reject: reject) else {
                return
            }
            _ = powerAuth.tokenStore.requestAccessToken(withName: tokenName as? String ?? "", authentication: auth) { token, error in
                // Keep authentication and its sensitive values alive until the asynchronous operation completes.
                withExtendedLifetime(auth) {}
                guard error == nil, let token = token else {
                    PAJS.processError(error, reject: reject)
                    return
                }
                resolve(Self.tokenToDictionary(token))
            }
        }
    }

    @objc(removeAccessToken:tokenName:resolve:reject:)
    func removeAccessToken(_ instanceId: Any?, tokenName: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            _ = powerAuth.tokenStore.removeAccessToken(withName: tokenName as? String ?? "") { removed, error in
                if removed {
                    resolve(nil)
                } else {
                    PAJS.processError(error, reject: reject)
                }
            }
        }
    }

    @objc(hasLocalToken:tokenName:resolve:reject:)
    func hasLocalToken(_ instanceId: Any?, tokenName: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.tokenStore.hasLocalToken(withName: tokenName as? String ?? ""))
        }
    }

    @objc(getLocalToken:tokenName:resolve:reject:)
    func getLocalToken(_ instanceId: Any?, tokenName: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            if let token = powerAuth.tokenStore.localToken(withName: tokenName as? String ?? "") {
                resolve(Self.tokenToDictionary(token))
            } else {
                reject(PAJSErrorCode.localTokenNotAvailable, "Token with this name is not in the local store.", nil)
            }
        }
    }

    @objc(removeLocalToken:tokenName:resolve:reject:)
    func removeLocalToken(_ instanceId: Any?, tokenName: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            powerAuth.tokenStore.removeLocalToken(withName: tokenName as? String ?? "")
            resolve(nil)
        }
    }

    @objc(removeAllLocalTokens:resolve:reject:)
    func removeAllLocalTokens(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            powerAuth.tokenStore.removeAllLocalTokens()
            resolve(nil)
        }
    }

    @objc(generateAuthenticationHeaderForToken:tokenName:resolve:reject:)
    func generateAuthenticationHeaderForToken(_ instanceId: Any?, tokenName: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            _ = powerAuth.tokenStore.generateAuthenticationHeader(withName: tokenName as? String ?? "") { header, error in
                if let header = header {
                    resolve(Self.headerToDictionary(header))
                } else {
                    PAJS.processError(error, reject: reject)
                }
            }
        }
    }

    // MARK: - Environment and user info

    @objc(getEnvironmentInfo:reject:)
    func getEnvironmentInfo(_ resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        let currentDevice = UIDevice.current
        let infoDictionary = Bundle.main.infoDictionary
        resolve([
            "systemName": currentDevice.systemName,
            "systemVersion": currentDevice.systemVersion,
            "applicationVersion": PAJS.nullable(infoDictionary?["CFBundleShortVersionString"]),
            "applicationIdentifier": PAJS.nullable(infoDictionary?["CFBundleIdentifier"]),
            "deviceManufacturer": "apple",
            "deviceId": currentDevice.model,
        ])
    }

    @objc(fetchUserInfo:resolve:reject:)
    func fetchUserInfo(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            _ = powerAuth.fetchUserInfo { userInfo, error in
                if error == nil {
                    resolve(["allClaims": userInfo?.allClaims ?? [:]])
                } else {
                    PAJS.processError(error, reject: reject)
                }
            }
        }
    }

    @objc(getLastFetchedUserInfo:resolve:reject:)
    func getLastFetchedUserInfo(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.lastFetchedUserInfo.map { ["allClaims": $0.allClaims] })
        }
    }

    // MARK: - Time synchronization

    @objc(isTimeSynchronized:resolve:reject:)
    func isTimeSynchronized(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(powerAuth.timeSynchronizationService.isTimeSynchronized)
        }
    }

    @objc(localTimeAdjustment:resolve:reject:)
    func localTimeAdjustment(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(Self.convertTimestamp(powerAuth.timeSynchronizationService.localTimeAdjustment))
        }
    }

    @objc(localTimeAdjustmentPrecision:resolve:reject:)
    func localTimeAdjustmentPrecision(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(Self.convertTimestamp(powerAuth.timeSynchronizationService.localTimeAdjustmentPrecision))
        }
    }

    @objc(currentTime:resolve:reject:)
    func currentTime(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            resolve(Self.convertTimestamp(powerAuth.timeSynchronizationService.currentTime()))
        }
    }

    @objc(synchronizeTime:resolve:reject:)
    func synchronizeTime(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            _ = powerAuth.timeSynchronizationService.synchronizeTime(callback: { error in
                Self.complete(error, resolve: resolve, reject: reject)
            }, callbackQueue: nil)
        }
    }

    @objc(resetTimeSynchronization:resolve:reject:)
    func resetTimeSynchronization(_ instanceId: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        withPowerAuth(instanceId, reject: reject) { powerAuth, _ in
            powerAuth.timeSynchronizationService.resetTimeSynchronization()
            resolve(nil)
        }
    }

    // MARK: - Helper methods

    private func synchronized(_ block: () -> Void) {
        objc_sync_enter(self)
        defer { objc_sync_exit(self) }
        block()
    }

    /// Validates the instance identifier. Returns `nil` and calls the reject block if the identifier is invalid.
    private func validateInstanceId(_ instanceId: Any?, reject: PAJSRejectBlock) -> String? {
        guard objectRegister.isValidObjectId(instanceId), let instanceId = instanceId as? String else {
            reject(PAJSErrorCode.wrongParameter, "Instance identifier is missing or empty string", nil)
            return nil
        }
        return instanceId
    }

    /// Calls the action with a configured `PowerAuthSDK` instance and its identifier. If there's no such
    /// instance, or the identifier is invalid, then calls the reject block.
    private func withPowerAuth(_ instanceId: Any?, reject: PAJSRejectBlock, action: (PowerAuthSDK, String) -> Void) {
        if let sdk = objectRegister.powerAuthSdk(instanceId, reject: reject), let instanceId = instanceId as? String {
            action(sdk, instanceId)
        }
    }

    /// Translates a dictionary into `PowerAuthAuthentication` object.
    private func constructAuthentication(_ authDict: Any?, reject: PAJSRejectBlock) -> PowerAuthAuthentication? {
        let dict = authDict as? [String: Any]
        guard let persist = dict?["isPersist"] as? NSNumber else {
            reject(PAJSErrorCode.wrongParameter, "Missing or invalid isPersist in authentication object.", nil)
            return nil
        }
        let useBiometry = PAJS.bool(dict?["isBiometry"])
        let userPassword = dict?["password"]
        if persist.boolValue {
            // Activation commit
            guard let password = objectRegister.usePassword(userPassword, reject: reject)?.copyToImmutable() else {
                return nil
            }
            // All factors need to be established in activation.
            return useBiometry
                ? PowerAuthAuthentication.persistWithPasswordAndBiometry(password: password)
                : PowerAuthAuthentication.persistWithPassword(password: password)
        }
        // Data signing
        if userPassword != nil {
            guard let password = objectRegister.usePassword(userPassword, reject: reject)?.copyToImmutable() else {
                return nil
            }
            return PowerAuthAuthentication.possessionWithPassword(password: password)
        }
        guard useBiometry else {
            return PowerAuthAuthentication.possession()
        }
        guard let biometryKeyId = dict?["biometryKeyId"] as? String else {
            reject(PAJSErrorCode.wrongParameter, "Biometric signing requires a pre-authorized biometry key.", nil)
            return nil
        }
        let biometryKey = objectRegister.useObject(withId: biometryKeyId, as: PowerAuthData.self) { data in
            data.secureData?.copy() as? PowerAuthSecureData
        }
        guard let biometryKey = biometryKey else {
            reject(PAJSErrorCode.invalidNativeObject, "Biometric key in PowerAuthAuthentication object is no longer valid.", nil)
            return nil
        }
        return PowerAuthAuthentication.possessionWithBiometry(customBiometryKey: biometryKey)
    }

    /// Completes an operation that reports only an optional error.
    private static func complete(_ error: Error?, result: Any? = nil, resolve: PAJSResolveBlock, reject: PAJSRejectBlock) {
        if let error = error {
            PAJS.processError(error, reject: reject)
        } else {
            resolve(result)
        }
    }

    /// Completes an operation that reports an optional value and an optional error.
    private static func complete(_ value: Any?, _ error: Error?, missing: String, missingCode: String = PAJSErrorCode.unknownError, resolve: PAJSResolveBlock, reject: PAJSRejectBlock) {
        if let error = error {
            PAJS.processError(error, reject: reject)
        } else if let value = value {
            resolve(value)
        } else {
            reject(missingCode, "PowerAuth SDK returned neither \(missing) nor an error.", nil)
        }
    }

    private static func buildConfiguration(_ instanceId: String, _ configuration: Any?, _ sharingConfiguration: Any?, reject: PAJSRejectBlock) -> PowerAuthConfiguration? {
        let configuration = configuration as? [String: Any]
        let baseEndpointUrl = configuration?["baseEndpointUrl"] as? String ?? ""
        let configurationString = configuration?["configuration"] as? String ?? ""
        let config: PowerAuthConfiguration
        if let algorithmString = configuration?["algorithm"] as? String {
            guard let algorithm = parseAlgorithm(algorithmString) else {
                reject(PAJSErrorCode.wrongParameter, "Unknown PowerAuth algorithm: \(algorithmString)", nil)
                return nil
            }
            config = PowerAuthConfiguration(instanceId: instanceId, baseEndpointUrl: baseEndpointUrl, configuration: configurationString, algorithm: algorithm)
        } else {
            config = PowerAuthConfiguration(instanceId: instanceId, baseEndpointUrl: baseEndpointUrl, configuration: configurationString)
        }
        if let componentLength = configuration?["offlineAuthenticationCodeComponentLength"] as? NSNumber {
            config.offlineAuthenticationCodeComponentLength = componentLength.uintValue
        }
        if let sharingConfiguration = sharingConfiguration as? [String: Any], (sharingConfiguration["isProvided"] as? NSNumber)?.boolValue == true {
            let sharingConfig = PowerAuthSharingConfiguration(appGroup: sharingConfiguration["appGroup"] as? String ?? "",
                                                              appIdentifier: sharingConfiguration["appIdentifier"] as? String ?? "",
                                                              keychainAccessGroup: sharingConfiguration["keychainAccessGroup"] as? String ?? "")
            sharingConfig.sharedMemoryIdentifier = sharingConfiguration["sharedMemoryIdentifier"] as? String
            config.sharingConfiguration = sharingConfig
        }
        do {
            try config.validateConfiguration()
        } catch {
            reject(PAJSErrorCode.wrongParameter, error.localizedDescription, error)
            return nil
        }
        return config
    }

    private static func buildKeychainConfiguration(_ keychainConfiguration: Any?) -> PowerAuthKeychainConfiguration {
        let keychainConfiguration = keychainConfiguration as? [String: Any]
        let keychainConfig = PowerAuthKeychainConfiguration.sharedInstance().copy() as! PowerAuthKeychainConfiguration
        keychainConfig.keychainAttribute_AccessGroup = keychainConfiguration?["accessGroupName"] as? String
        keychainConfig.keychainAttribute_UserDefaultsSuiteName = keychainConfiguration?["userDefaultsSuiteName"] as? String
        return keychainConfig
    }

    private static func parseAlgorithm(_ value: String) -> PowerAuthAlgorithm? {
        switch value {
        case "legacy": return .LEGACY_P256
        case "p384": return .EC_P384
        case "p384l3": return .EC_P384_ML_L3
        case "p384l5": return .EC_P384_ML_L5
        default: return nil
        }
    }

    private static func algorithmToString(_ algorithm: PowerAuthAlgorithm) -> String? {
        switch algorithm {
        case .LEGACY_P256: return "legacy"
        case .EC_P384: return "p384"
        case .EC_P384_ML_L3: return "p384l3"
        case .EC_P384_ML_L5: return "p384l5"
        default: return nil
        }
    }

    private static func parseSignatureKeyId(_ value: Any?, reject: PAJSRejectBlock) -> PowerAuthSignatureKeyId? {
        switch value as? String {
        case "master": return .master
        case "masterEc": return .master_EC
        case "masterMlDsa": return .master_ML_DSA
        case "server": return .server
        case "serverEc": return .server_EC
        case "serverMlDsa": return .server_ML_DSA
        case "device": return .device
        case "deviceEc": return .device_EC
        case "deviceMlDsa": return .device_ML_DSA
        case "macPersonalized": return .macPersonalized
        default:
            reject(PAJSErrorCode.wrongParameter, "Unknown signature key identifier: \(describe(value))", nil)
            return nil
        }
    }

    private static func activationStateToString(_ state: PowerAuthActivationState) -> String {
        switch state {
        case .pendingCommit: return "PENDING_COMMIT"
        case .active: return "ACTIVE"
        case .blocked: return "BLOCKED"
        case .removed: return "REMOVED"
        case .deadlock: return "DEADLOCK"
        default: return "UNKNOWN"
        }
    }

    private static func biometryTypeToString(_ type: PowerAuthBiometricAuthenticationType) -> String {
        switch type {
        case .touchID: return "FINGERPRINT"
        case .faceID: return "FACE"
        default: return "NONE"
        }
    }

    private static func biometryStatusToString(_ status: PowerAuthBiometricAuthenticationStatus) -> String {
        switch status {
        case .available: return "OK"
        case .notEnrolled: return "NOT_ENROLLED"
        case .notSupported: return "NOT_SUPPORTED"
        case .lockout: return "LOCKOUT"
        default: return "NOT_AVAILABLE"
        }
    }

    private static func headerToDictionary(_ header: PowerAuthHttpHeader) -> [String: Any] {
        return ["name": header.key, "value": header.value]
    }

    private static func tokenToDictionary(_ token: PowerAuthToken) -> [String: Any] {
        return ["tokenName": token.tokenName, "tokenIdentifier": token.tokenIdentifier]
    }

    /// Converts a JavaScript object into a dictionary of strings. Values that are not strings are ignored, like on Android.
    private static func stringDictionary(_ value: Any?) -> [String: String]? {
        return (value as? [String: Any])?.compactMapValues { $0 as? String }
    }

    private static func utf8Data(_ value: Any?) -> Data? {
        return (value as? NSString)?.data(using: String.Encoding.utf8.rawValue)
    }

    /// Describes a JavaScript value in an error message.
    private static func describe(_ value: Any?) -> String {
        return value.map { "\($0)" } ?? "(null)"
    }

    /// PowerAuth provides timestamp in seconds, but JS expects milliseconds without the decimal part.
    private static func convertTimestamp(_ timestamp: TimeInterval) -> Int64 {
        return Int64(exactly: (timestamp * 1000).rounded(.towardZero)) ?? 0
    }
}
