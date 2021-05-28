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
    /** Code returned, or reported, when operation succeeds. */
    PowerAuthErrorCode["SUCCEED"] = "SUCCEED";
    /** Error code for error with network connectivity or download. */
    PowerAuthErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    /** Error code for error in signature calculation. */
    PowerAuthErrorCode["SIGNATURE_ERROR"] = "SIGNATURE_ERROR";
    /** Error code for error that occurs when activation state is invalid. */
    PowerAuthErrorCode["INVALID_ACTIVATION_STATE"] = "INVALID_ACTIVATION_STATE";
    /** Error code for error that occurs when activation data is invalid. */
    PowerAuthErrorCode["INVALID_ACTIVATION_DATA"] = "INVALID_ACTIVATION_DATA";
    /** Error code for error that occurs when activation is required but missing. */
    PowerAuthErrorCode["MISSING_ACTIVATION"] = "MISSING_ACTIVATION";
    /** Error code for error that occurs when pending activation is present and work with completed activation is required. */
    PowerAuthErrorCode["PENDING_ACTIVATION"] = "PENDING_ACTIVATION";
    /** Error code for situation when biometric prompt is canceled by the user. */
    PowerAuthErrorCode["BIOMETRY_CANCEL"] = "BIOMETRY_CANCEL";
    /**
     * Error code for canceled operation. This kind of error may occur in situations, when SDK
     * needs to cancel an asynchronous operation, but the cancel is not initiated by the application
     * itself. For example, if you reset the state of {@code PowerAuthSDK} during the pending
     * fetch for activation status, then the application gets an exception, with this error code.
     */
    PowerAuthErrorCode["OPERATION_CANCELED"] = "OPERATION_CANCELED";
    /** Error code for error that occurs when invalid activation code is provided. */
    PowerAuthErrorCode["INVALID_ACTIVATION_CODE"] = "INVALID_ACTIVATION_CODE";
    /** Error code for accessing an unknown token. */
    PowerAuthErrorCode["INVALID_TOKEN"] = "INVALID_TOKEN";
    /** Error code for errors related to end-to-end encryption. */
    PowerAuthErrorCode["ENCRYPTION_ERROR"] = "ENCRYPTION_ERROR";
    /** Error code for a general API misuse. */
    PowerAuthErrorCode["WRONG_PARAMETER"] = "WRONG_PARAMETER";
    /** Error code for protocol upgrade failure. The recommended action is to retry the status fetch operation, or locally remove the activation. */
    PowerAuthErrorCode["PROTOCOL_UPGRADE"] = "PROTOCOL_UPGRADE";
    /** The requested function is not available during the protocol upgrade. You can retry the operation, after the upgrade is finished. */
    PowerAuthErrorCode["PENDING_PROTOCOL_UPGRADE"] = "PENDING_PROTOCOL_UPGRADE";
    /** The biometric authentication cannot be processed due to lack of required hardware or due to a missing support from the operating system. */
    PowerAuthErrorCode["BIOMETRY_NOT_SUPPORTED"] = "BIOMETRY_NOT_SUPPORTED";
    /** The biometric authentication is temporarily unavailable. */
    PowerAuthErrorCode["BIOMETRY_NOT_AVAILABLE"] = "BIOMETRY_NOT_AVAILABLE";
    /**
     * The biometric authentication is locked out due to too many failed attempts.
     *
     * The error is reported for the temporary and also for the permanent lockout. The temporary
     * lockout typically occurs after 5 failed attempts, and lasts for 30 seconds. In case of permanent
     * lockout the biometric authentication is disabled until the user unlocks the device with strong
     * authentication (PIN, password, pattern).
     */
    PowerAuthErrorCode["BIOMETRY_LOCKOUT"] = "BIOMETRY_LOCKOUT";
    /** The biometric authentication did not recognize the biometric image (fingerprint, face, etc...) */
    PowerAuthErrorCode["BIOMETRY_NOT_RECOGNIZED"] = "BIOMETRY_NOT_RECOGNIZED";
    /**
     * The keychain protection is not sufficient. The exception is thrown in case that device doesn't
     * support the minimum required level of the keychain protection.
     * Android only.
     */
    PowerAuthErrorCode["INSUFFICIENT_KEYCHAIN_PROTECTION"] = "INSUFFICIENT_KEYCHAIN_PROTECTION";
    /** Error code for a general error related to WatchConnectivity (iOS only) */
    PowerAuthErrorCode["WATCH_CONNECTIVITY"] = "WATCH_CONNECTIVITY";
    /** Network communication returned an error. See more information in the message of the exception. */
    PowerAuthErrorCode["RESPONSE_ERROR"] = "RESPONSE_ERROR";
    /** When the error is not originating from the native module. */
    PowerAuthErrorCode["REACT_NATIVE_ERROR"] = "REACT_NATIVE_ERROR";
    /** Instance of the PowerAuth object is not configured */
    PowerAuthErrorCode["INSTANCE_NOT_CONFIGURED"] = "INSTANCE_NOT_CONFIGURED";
    /** Error in `correctTypedCharacter` */
    PowerAuthErrorCode["INVALID_CHARACTER"] = "INVALID_CHARACTER";
    /** Used invalid recovery code in parseRecoveryCode */
    PowerAuthErrorCode["INVALID_RECOVERY_CODE"] = "INVALID_RECOVERY_CODE";
    /** Error when generating a token */
    PowerAuthErrorCode["CANNOT_GENERATE_TOKEN"] = "CANNOT_GENERATE_TOKEN";
    /** Error when requesting local token */
    PowerAuthErrorCode["LOCAL_TOKEN_NOT_AVAILABLE"] = "LOCAL_TOKEN_NOT_AVAILABLE";
    /** Biometric authentication failed */
    PowerAuthErrorCode["BIOMETRY_FAILED"] = "BIOMETRY_FAILED";
    /** When password is not set during activation commit */
    PowerAuthErrorCode["PASSWORD_NOT_SET"] = "PASSWORD_NOT_SET";
    /** Error when invalid activation object is provided during activation */
    PowerAuthErrorCode["INVALID_ACTIVATION_OBJECT"] = "INVALID_ACTIVATION_OBJECT";
})(PowerAuthErrorCode || (PowerAuthErrorCode = {}));
