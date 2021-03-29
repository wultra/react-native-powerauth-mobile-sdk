/*
 * Copyright 2021 Wultra s.r.o.
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

/**
 * PowerAuthError is a wrapper error that is thrown by every API in this module.
 */
export class PowerAuthError {

    /** Original exception thrown by the native layer (iOS or Android) */
    originalException: any;

    /** Code of the error. */
    code?: PowerAuthErrorCode;
    /** Message of the error. */
    message?: string;
    /** Additional error data. */
    errorData?: any;
    /** Domain of the error (iOS only). */
    domain?: string;
    /** Description of the error (iOS only). */
    description?: string;

    constructor(exception: any) {
        this.originalException = exception;
        this.code = exception?.code ?? null;
        this.message = exception?.message ?? null;
        this.domain = exception?.domain ?? null;
        this.errorData = exception?.userInfo ?? null;
        this.description = exception?.userInfo?.NSLocalizedDescription ?? null;
    }

    print(): string {
        return `code: ${this.code}\nmessage: ${this.message}\ndomain: ${this.domain}\ndescription: ${this.description}`;
    }
};

export enum PowerAuthErrorCode {

    /** When the error is not originating from the native module */
    PA2ReactNativeError = "PA2ReactNativeError",

    /** Code returned, or reported, when operation succeeds. */
    PA2Succeed = "PA2Succeed",

    /** Error code for error with network connectivity or download. */
    PA2ErrorCodeNetworkError = "PA2ErrorCodeNetworkError",

    /** Error code for error in signature calculation. */
    PA2ErrorCodeSignatureError = "PA2ErrorCodeSignatureError",

    /** Error code for error that occurs when activation state is invalid. */
    PA2ErrorCodeInvalidActivationState = "PA2ErrorCodeInvalidActivationState",

    /** Error code for error that occurs when activation data is invalid. */
    PA2ErrorCodeInvalidActivationData = "PA2ErrorCodeInvalidActivationData",

    /** Error code for error that occurs when activation is required but missing. */
    PA2ErrorCodeMissingActivation = "PA2ErrorCodeMissingActivation",

    /** Error code for error that occurs when pending activation is present and work with completed activation is required. */
    PA2ErrorCodeActivationPending = "PA2ErrorCodeActivationPending",

    /** Error code for situation when biometric prompt is canceled by the user. */
    PA2ErrorCodeBiometryCancel = "PA2ErrorCodeBiometryCancel",

    /**
     * Error code for canceled operation. This kind of error may occur in situations, when SDK
     * needs to cancel an asynchronous operation, but the cancel is not initiated by the application
     * itself. For example, if you reset the state of {@code PowerAuthSDK} during the pending
     * fetch for activation status, then the application gets an exception, with this error code.
     */
    PA2ErrorCodeOperationCancelled = "PA2ErrorCodeOperationCancelled",

    /** Error code for error that occurs when invalid activation code is provided. */
    PA2ErrorCodeInvalidActivationCode = "PA2ErrorCodeInvalidActivationCode",

    /** Error code for accessing an unknown token. */
    PA2ErrorCodeInvalidToken = "PA2ErrorCodeInvalidToken",

    /** Error code for errors related to end-to-end encryption. */
    PA2ErrorCodeEncryption = "PA2ErrorCodeEncryption",

    /** Error code for a general API misuse. */
    PA2ErrorCodeWrongParameter = "PA2ErrorCodeWrongParameter",

    /** Error code for protocol upgrade failure. The recommended action is to retry the status fetch operation, or locally remove the activation. */
    PA2ErrorCodeProtocolUpgrade = "PA2ErrorCodeProtocolUpgrade",

    /** The requested function is not available during the protocol upgrade. You can retry the operation, after the upgrade is finished. */
    PA2ErrorCodePendingProtocolUpgrade = "PA2ErrorCodePendingProtocolUpgrade",

    /** The biometric authentication cannot be processed due to lack of required hardware or due to a missing support from the operating system. */
    PA2ErrorCodeBiometryNotSupported = "PA2ErrorCodeBiometryNotSupported",

    /** The biometric authentication is temporarily unavailable. */
    PA2ErrorCodeBiometryNotAvailable = "PA2ErrorCodeBiometryNotAvailable",

    /** Network communication returned an error. See more information in the message of the exception. */
    PA2ErrorResponseException = "PA2ErrorResponseException",

    /** The biometric authentication did not recognize the biometric image (fingerprint, face, etc...) */
    PA2ErrorCodeBiometryNotRecognized = "PA2ErrorCodeBiometryNotRecognized",

    /** Error code for a general error related to WatchConnectivity (iOS only) */
    PA2ErrorCodeWatchConnectivity = "PA2ErrorCodeWatchConnectivity"
}