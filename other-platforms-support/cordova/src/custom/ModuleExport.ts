/*
 * Copyright 2024 Wultra s.r.o.
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

// @ts-nocheck

interface PowerAuthPluginType {
    PowerAuth: typeof PowerAuth,
    PowerAuthActivation: typeof PowerAuthActivation,
    PowerAuthAuthentication: typeof PowerAuthAuthentication,
    PowerAuthActivationCodeUtil: typeof PowerAuthActivationCodeUtil,
    PowerAuthTokenStore: typeof PowerAuthTokenStore,
    PowerAuthPassphraseMeter: typeof PowerAuthPassphraseMeter,
    PowerAuthActivationState: typeof PowerAuthActivationState,
    PowerAuthBiometryConfiguration: typeof PowerAuthBiometryConfiguration,
    PowerAuthBiometryStatus: typeof PowerAuthBiometryStatus,
    PowerAuthClientConfiguration: typeof PowerAuthClientConfiguration,
    PowerAuthConfiguration: typeof PowerAuthConfiguration,
    PowerAuthError: typeof PowerAuthError,
    PowerAuthErrorCode: typeof PowerAuthErrorCode,
    PowerAuthKeychainConfiguration: typeof PowerAuthKeychainConfiguration,
    PowerAuthPassword: typeof PowerAuthPassword,
    BaseNativeObject: typeof BaseNativeObject,
    PinTestIssue: typeof PinTestIssue,
    buildConfiguration: typeof buildConfiguration,
    buildClientConfiguration: typeof buildClientConfiguration,
    buildBiometryConfiguration: typeof buildBiometryConfiguration,
    buildKeychainConfiguration: typeof buildKeychainConfiguration,

    // Debug features

    PowerAuthDebug: typeof PowerAuthDebug,
    NativeObjectRegister: typeof NativeObjectRegister
}

module.exports = {
    PowerAuth: PowerAuth,
    PowerAuthActivation: PowerAuthActivation,
    PowerAuthAuthentication: PowerAuthAuthentication,
    PowerAuthActivationCodeUtil: PowerAuthActivationCodeUtil,
    PowerAuthTokenStore: PowerAuthTokenStore,
    PowerAuthPassphraseMeter: PowerAuthPassphraseMeter,
    PowerAuthActivationState: PowerAuthActivationState,
    PowerAuthBiometryConfiguration: PowerAuthBiometryConfiguration,
    PowerAuthBiometryStatus: PowerAuthBiometryStatus,
    PowerAuthClientConfiguration: PowerAuthClientConfiguration,
    PowerAuthConfiguration: PowerAuthConfiguration,
    PowerAuthError: PowerAuthError,
    PowerAuthErrorCode: PowerAuthErrorCode,
    PowerAuthKeychainConfiguration: PowerAuthKeychainConfiguration,
    PowerAuthKeychainProtection: PowerAuthKeychainProtection,
    PowerAuthPassword: PowerAuthPassword,
    BaseNativeObject: BaseNativeObject,
    PinTestIssue: PinTestIssue,
    buildConfiguration: buildConfiguration,
    buildClientConfiguration: buildClientConfiguration,
    buildBiometryConfiguration: buildBiometryConfiguration,
    buildKeychainConfiguration: buildKeychainConfiguration,

    // Debug features

    PowerAuthDebug: PowerAuthDebug,
    NativeObjectRegister: NativeObjectRegister,

    // Following types are interfaces so we don't need to expose them in an "object" manner
    // PowerAuthEncryptor: PowerAuthEncryptor,
    // PowerAuthDataFormat: PowerAuthDataFormat,
    // PowerAuthConfirmRecoveryCodeDataResult: PowerAuthConfirmRecoveryCodeDataResult,
    // PowerAuthCreateActivationResult: PowerAuthCreateActivationResult,
    // PowerAuthRecoveryActivationData: PowerAuthRecoveryActivationData,
    // PowerAuthBiometryInfo: PowerAuthBiometryInfo,
    // PowerAuthActivationStatus: PowerAuthActivationStatus,
    // PowerAuthAuthorizationHttpHeader: PowerAuthAuthorizationHttpHeader,
    // PowerAuthEncryptionHttpHeader: PowerAuthEncryptionHttpHeader,


}