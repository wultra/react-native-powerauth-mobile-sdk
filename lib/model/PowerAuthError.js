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
var PowerAuthError = /** @class */ (function () {
    function PowerAuthError(exception, message) {
        if (message === void 0) { message = null; }
        var _a, _b, _c, _d, _e, _f;
        this.originalException = exception;
        this.code = (_a = exception === null || exception === void 0 ? void 0 : exception.code) !== null && _a !== void 0 ? _a : null;
        this.message = (_b = message !== null && message !== void 0 ? message : exception === null || exception === void 0 ? void 0 : exception.message) !== null && _b !== void 0 ? _b : null;
        this.domain = (_c = exception === null || exception === void 0 ? void 0 : exception.domain) !== null && _c !== void 0 ? _c : null;
        this.errorData = (_d = exception === null || exception === void 0 ? void 0 : exception.userInfo) !== null && _d !== void 0 ? _d : null;
        this.description = (_f = (_e = exception === null || exception === void 0 ? void 0 : exception.userInfo) === null || _e === void 0 ? void 0 : _e.NSLocalizedDescription) !== null && _f !== void 0 ? _f : null;
    }
    PowerAuthError.prototype.print = function () {
        return "code: " + this.code + "\nmessage: " + this.message + "\ndomain: " + this.domain + "\ndescription: " + this.description;
    };
    return PowerAuthError;
}());
export { PowerAuthError };
;
export var PowerAuthErrorCode;
(function (PowerAuthErrorCode) {
    /** When the error is not originating from the native module */
    PowerAuthErrorCode["PA2ReactNativeError"] = "PA2ReactNativeError";
    /** Code returned, or reported, when operation succeeds. */
    PowerAuthErrorCode["PA2Succeed"] = "PA2Succeed";
    /** Error code for error with network connectivity or download. */
    PowerAuthErrorCode["PA2ErrorCodeNetworkError"] = "PA2ErrorCodeNetworkError";
    /** Error code for error in signature calculation. */
    PowerAuthErrorCode["PA2ErrorCodeSignatureError"] = "PA2ErrorCodeSignatureError";
    /** Error code for error that occurs when activation state is invalid. */
    PowerAuthErrorCode["PA2ErrorCodeInvalidActivationState"] = "PA2ErrorCodeInvalidActivationState";
    /** Error code for error that occurs when activation data is invalid. */
    PowerAuthErrorCode["PA2ErrorCodeInvalidActivationData"] = "PA2ErrorCodeInvalidActivationData";
    /** Error code for error that occurs when activation is required but missing. */
    PowerAuthErrorCode["PA2ErrorCodeMissingActivation"] = "PA2ErrorCodeMissingActivation";
    /** Error code for error that occurs when pending activation is present and work with completed activation is required. */
    PowerAuthErrorCode["PA2ErrorCodeActivationPending"] = "PA2ErrorCodeActivationPending";
    /** Error code for situation when biometric prompt is canceled by the user. */
    PowerAuthErrorCode["PA2ErrorCodeBiometryCancel"] = "PA2ErrorCodeBiometryCancel";
    /**
     * Error code for canceled operation. This kind of error may occur in situations, when SDK
     * needs to cancel an asynchronous operation, but the cancel is not initiated by the application
     * itself. For example, if you reset the state of {@code PowerAuthSDK} during the pending
     * fetch for activation status, then the application gets an exception, with this error code.
     */
    PowerAuthErrorCode["PA2ErrorCodeOperationCancelled"] = "PA2ErrorCodeOperationCancelled";
    /** Error code for error that occurs when invalid activation code is provided. */
    PowerAuthErrorCode["PA2ErrorCodeInvalidActivationCode"] = "PA2ErrorCodeInvalidActivationCode";
    /** Error code for accessing an unknown token. */
    PowerAuthErrorCode["PA2ErrorCodeInvalidToken"] = "PA2ErrorCodeInvalidToken";
    /** Error code for errors related to end-to-end encryption. */
    PowerAuthErrorCode["PA2ErrorCodeEncryption"] = "PA2ErrorCodeEncryption";
    /** Error code for a general API misuse. */
    PowerAuthErrorCode["PA2ErrorCodeWrongParameter"] = "PA2ErrorCodeWrongParameter";
    /** Error code for protocol upgrade failure. The recommended action is to retry the status fetch operation, or locally remove the activation. */
    PowerAuthErrorCode["PA2ErrorCodeProtocolUpgrade"] = "PA2ErrorCodeProtocolUpgrade";
    /** The requested function is not available during the protocol upgrade. You can retry the operation, after the upgrade is finished. */
    PowerAuthErrorCode["PA2ErrorCodePendingProtocolUpgrade"] = "PA2ErrorCodePendingProtocolUpgrade";
    /** The biometric authentication cannot be processed due to lack of required hardware or due to a missing support from the operating system. */
    PowerAuthErrorCode["PA2ErrorCodeBiometryNotSupported"] = "PA2ErrorCodeBiometryNotSupported";
    /** The biometric authentication is temporarily unavailable. */
    PowerAuthErrorCode["PA2ErrorCodeBiometryNotAvailable"] = "PA2ErrorCodeBiometryNotAvailable";
    /** Network communication returned an error. See more information in the message of the exception. */
    PowerAuthErrorCode["PA2ErrorResponseException"] = "PA2ErrorResponseException";
    /** The biometric authentication did not recognize the biometric image (fingerprint, face, etc...) */
    PowerAuthErrorCode["PA2ErrorCodeBiometryNotRecognized"] = "PA2ErrorCodeBiometryNotRecognized";
    /** Error code for a general error related to WatchConnectivity (iOS only) */
    PowerAuthErrorCode["PA2ErrorCodeWatchConnectivity"] = "PA2ErrorCodeWatchConnectivity";
})(PowerAuthErrorCode || (PowerAuthErrorCode = {}));
