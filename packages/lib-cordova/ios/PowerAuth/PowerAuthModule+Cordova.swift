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

/// Cordova actions of `PowerAuthModule`. Each action reads its arguments in declaration order.
extension PowerAuthModule {

    @objc(isConfigured:)
    func isConfigured(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            isConfigured(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(cleanupInstanceData:)
    func cleanupInstanceData(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            cleanupInstanceData(args[0], configuration: args[1], keychainConfiguration: args[2], sharingConfiguration: args[3], resolve: resolve, reject: reject)
        }
    }

    @objc(getConfiguration:)
    func getConfiguration(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getConfiguration(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(getCurrentAlgorithm:)
    func getCurrentAlgorithm(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getCurrentAlgorithm(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(beginPasswordChange:)
    func beginPasswordChange(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            beginPasswordChange(args[0], oldPassword: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(finishPasswordChange:)
    func finishPasswordChange(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            finishPasswordChange(args[0], newPassword: args[1], passwordChangeDataId: args[2], resolve: resolve, reject: reject)
        }
    }

    @objc(getClientConfiguration:)
    func getClientConfiguration(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getClientConfiguration(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(getBiometryConfiguration:)
    func getBiometryConfiguration(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getBiometryConfiguration(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(getKeychainConfiguration:)
    func getKeychainConfiguration(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getKeychainConfiguration(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(getSharingConfiguration:)
    func getSharingConfiguration(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getSharingConfiguration(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(configure:)
    func configure(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            configure(args[0], configuration: args[1], clientConfiguration: args[2], biometryConfiguration: args[3], keychainConfiguration: args[4], sharingConfiguration: args[5], resolve: resolve, reject: reject)
        }
    }

    @objc(deconfigure:)
    func deconfigure(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            deconfigure(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(hasValidActivation:)
    func hasValidActivation(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            hasValidActivation(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(canStartActivation:)
    func canStartActivation(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            canStartActivation(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(hasPendingActivation:)
    func hasPendingActivation(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            hasPendingActivation(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(getExternalPendingOperation:)
    func getExternalPendingOperation(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getExternalPendingOperation(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(fetchActivationStatus:)
    func fetchActivationStatus(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            fetchActivationStatus(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(hasProtocolUpgradeAvailable:)
    func hasProtocolUpgradeAvailable(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            hasProtocolUpgradeAvailable(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(hasPendingProtocolUpgrade:)
    func hasPendingProtocolUpgrade(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            hasPendingProtocolUpgrade(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(startProtocolUpgrade:)
    func startProtocolUpgrade(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            startProtocolUpgrade(args[0], password: args[1], upgradeBiometry: args.bool(2), resolve: resolve, reject: reject)
        }
    }

    @objc(createActivation:)
    func createActivation(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            createActivation(args[0], activation: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(persistActivation:)
    func persistActivation(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            persistActivation(args[0], authentication: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(activationIdentifier:)
    func activationIdentifier(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            activationIdentifier(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(activationFingerprint:)
    func activationFingerprint(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            activationFingerprint(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(removeActivationWithAuthentication:)
    func removeActivationWithAuthentication(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            removeActivationWithAuthentication(args[0], authDict: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(removeActivationLocal:)
    func removeActivationLocal(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            removeActivationLocal(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(authenticationHeaderForRequestWithParams:)
    func authenticationHeaderForRequestWithParams(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            authenticationHeaderForRequestWithParams(args[0], authDict: args[1], method: args[2], uriId: args[3], params: args[4], resolve: resolve, reject: reject)
        }
    }

    @objc(authenticationHeaderForRequestWithBody:)
    func authenticationHeaderForRequestWithBody(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            authenticationHeaderForRequestWithBody(args[0], authDict: args[1], method: args[2], uriId: args[3], body: args[4], resolve: resolve, reject: reject)
        }
    }

    @objc(offlineAuthenticationCode:)
    func offlineAuthenticationCode(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            offlineAuthenticationCode(args[0], authDict: args[1], uriId: args[2], body: args[3], nonce: args[4], resolve: resolve, reject: reject)
        }
    }

    @objc(verifyDigitalSignature:)
    func verifyDigitalSignature(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            verifyDigitalSignature(args[0], signature: args[1], data: args[2], signatureKeyId: args[3], resolve: resolve, reject: reject)
        }
    }

    @objc(calculateDigitalSignature:)
    func calculateDigitalSignature(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            calculateDigitalSignature(args[0], authDict: args[1], data: args[2], signatureKeyId: args[3], resolve: resolve, reject: reject)
        }
    }

    @objc(exportDevicePublicKeys:)
    func exportDevicePublicKeys(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            exportDevicePublicKeys(args[0], format: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(verifyJwsSignature:)
    func verifyJwsSignature(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            verifyJwsSignature(args[0], signature: args[1], compact: args.bool(2), strict: args.bool(3), signatureKeyId: args[4], resolve: resolve, reject: reject)
        }
    }

    @objc(calculateJwsSignature:)
    func calculateJwsSignature(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            calculateJwsSignature(args[0], authDict: args[1], data: args[2], dataType: args[3], compact: args.bool(4), signatureKeyId: args[5], resolve: resolve, reject: reject)
        }
    }

    @objc(createCertificateSigningRequest:)
    func createCertificateSigningRequest(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            createCertificateSigningRequest(args[0], authDict: args[1], distinguishedNames: args[2], subjectAltNames: args[3], signatureKeyId: args[4], resolve: resolve, reject: reject)
        }
    }

    @objc(verifyServerSignedData:)
    func verifyServerSignedData(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            verifyServerSignedData(args[0], data: args[1], signature: args[2], masterKey: args.bool(3), resolve: resolve, reject: reject)
        }
    }

    @objc(unsafeChangePassword:)
    func unsafeChangePassword(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            unsafeChangePassword(args[0], oldPassword: args[1], newPassword: args[2], resolve: resolve, reject: reject)
        }
    }

    @objc(changePassword:)
    func changePassword(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            changePassword(args[0], oldPassword: args[1], newPassword: args[2], resolve: resolve, reject: reject)
        }
    }

    @objc(addBiometryFactor:)
    func addBiometryFactor(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            addBiometryFactor(args[0], password: args[1], foo: args[2], resolve: resolve, reject: reject)
        }
    }

    @objc(hasBiometryFactor:)
    func hasBiometryFactor(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            hasBiometryFactor(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(removeBiometryFactor:)
    func removeBiometryFactor(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            removeBiometryFactor(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(getBiometricStatus:)
    func getBiometricStatus(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getBiometricStatus(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(isAuthenticationWithBiometricsAvailable:)
    func isAuthenticationWithBiometricsAvailable(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            isAuthenticationWithBiometricsAvailable(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(getBiometryInfo:)
    func getBiometryInfo(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getBiometryInfo(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(fetchEncryptionKey:)
    func fetchEncryptionKey(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            fetchEncryptionKey(args[0], authDict: args[1], index: args[2], resolve: resolve, reject: reject)
        }
    }

    @objc(fetchSecureVaultKey:)
    func fetchSecureVaultKey(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            fetchSecureVaultKey(args[0], authDict: args[1], keyIdentifierValue: args[2], resolve: resolve, reject: reject)
        }
    }

    @objc(deriveSecureVaultKey:)
    func deriveSecureVaultKey(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            deriveSecureVaultKey(args[0], index: args[1], keySize: args[2], resolve: resolve, reject: reject)
        }
    }

    @objc(signDataWithDevicePrivateKey:)
    func signDataWithDevicePrivateKey(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            signDataWithDevicePrivateKey(args[0], authDict: args[1], data: args[2], dataFormat: args[3], resolve: resolve, reject: reject)
        }
    }

    @objc(validatePassword:)
    func validatePassword(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            validatePassword(args[0], password: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(authenticateWithBiometry:)
    func authenticateWithBiometry(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            authenticateWithBiometry(args[0], prompt: args[1], makeReusable: args.bool(2), resolve: resolve, reject: reject)
        }
    }

    @objc(parseActivationCode:)
    func parseActivationCode(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            parseActivationCode(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(validateActivationCode:)
    func validateActivationCode(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            validateActivationCode(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(validateTypedCharacter:)
    func validateTypedCharacter(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            validateTypedCharacter(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(correctTypedCharacter:)
    func correctTypedCharacter(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            correctTypedCharacter(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(requestAccessToken:)
    func requestAccessToken(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            requestAccessToken(args[0], tokenName: args[1], authDict: args[2], resolve: resolve, reject: reject)
        }
    }

    @objc(removeAccessToken:)
    func removeAccessToken(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            removeAccessToken(args[0], tokenName: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(hasLocalToken:)
    func hasLocalToken(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            hasLocalToken(args[0], tokenName: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(getLocalToken:)
    func getLocalToken(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getLocalToken(args[0], tokenName: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(removeLocalToken:)
    func removeLocalToken(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            removeLocalToken(args[0], tokenName: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(removeAllLocalTokens:)
    func removeAllLocalTokens(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            removeAllLocalTokens(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(generateAuthenticationHeaderForToken:)
    func generateAuthenticationHeaderForToken(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            generateAuthenticationHeaderForToken(args[0], tokenName: args[1], resolve: resolve, reject: reject)
        }
    }

    @objc(fetchUserInfo:)
    func fetchUserInfo(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            fetchUserInfo(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(getLastFetchedUserInfo:)
    func getLastFetchedUserInfo(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            getLastFetchedUserInfo(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(isTimeSynchronized:)
    func isTimeSynchronized(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            isTimeSynchronized(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(localTimeAdjustment:)
    func localTimeAdjustment(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            localTimeAdjustment(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(localTimeAdjustmentPrecision:)
    func localTimeAdjustmentPrecision(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            localTimeAdjustmentPrecision(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(currentTime:)
    func currentTime(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            currentTime(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(synchronizeTime:)
    func synchronizeTime(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            synchronizeTime(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(resetTimeSynchronization:)
    func resetTimeSynchronization(_ command: CDVInvokedUrlCommand) {
        execute(command) { args, resolve, reject in
            resetTimeSynchronization(args[0], resolve: resolve, reject: reject)
        }
    }

    @objc(getEnvironmentInfo:)
    func getEnvironmentInfo(_ command: CDVInvokedUrlCommand) {
        execute(command) { _, resolve, reject in
            getEnvironmentInfo(resolve, reject: reject)
        }
    }
}
