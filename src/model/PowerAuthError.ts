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

    /** Original exception thrown by the native layer (iOS or Android). If null, then error was created in TypeScript. */
    originalException: any;

    /** Code of the error. */
    code?: PowerAuthErrorCode;
    /** Message of the error. */
    message?: string;
    /** Additional error data. */
    errorData?: any;

    constructor(exception: any, message: string | null = null, code: PowerAuthErrorCode | null = null, errorData: any = null) {
        this.originalException = exception;
        this.code = code ?? exception?.code ?? null;
        this.message = message ?? exception?.message ?? null;
        this.errorData = errorData ?? exception?.userInfo ?? null;
    }

    print(): string {
        return `code: ${this.code}\nmessage: ${this.message}`;
    }
};

export enum PowerAuthErrorCode {

    /** Code returned, or reported, when operation succeeds. */
    SUCCEED = "SUCCEED",

    /** Error code for error with network connectivity or download. */
    NETWORK_ERROR = "NETWORK_ERROR",
  
    /** 
     * Failed to authenticate on the server. The code is reported when 401 HTTP status code from the server is received. 
     * You can investigate more failure details in similar manner than `RESPONSE_ERROR`.
     */
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  
    /** 
     * Non 200 HTTP status code received from the server. The `errorData` dictionary contains the following values:
     * - `httpStatusCode` - Number with exact value of the HTTP status code.
     * - `serverResponseCode` - Error code as defined in standard PowerAuth RESTful API error response. 
     * - `serverResponseMessage` - Error message as defined in standard PowerAuth RESTful API error response.
     * - `responseBody` - String with JSON response body.
     * - `currentRecoveryPukIndex` - (optional) Number with current recovery PUK index, in case that activation recovery failed. 
     */
    RESPONSE_ERROR = "RESPONSE_ERROR",

    /** Error code for error in signature calculation. */
    SIGNATURE_ERROR = "SIGNATURE_ERROR",

    /** Error code for error that occurs when activation state is invalid. */
    INVALID_ACTIVATION_STATE = "INVALID_ACTIVATION_STATE",

    /** Error code for error that occurs when activation data is invalid. */
    INVALID_ACTIVATION_DATA = "INVALID_ACTIVATION_DATA",

    /** Error code for error that occurs when activation is required but missing. */
    MISSING_ACTIVATION = "MISSING_ACTIVATION",

    /** Error code for error that occurs when pending activation is present and work with completed activation is required. */
    PENDING_ACTIVATION = "PENDING_ACTIVATION",

    /** Error code for situation when biometric prompt is canceled by the user. */
    BIOMETRY_CANCEL = "BIOMETRY_CANCEL",

    /**
     * Error code for canceled operation. This kind of error may occur in situations, when SDK
     * needs to cancel an asynchronous operation, but the cancel is not initiated by the application
     * itself. For example, if you reset the state of `PowerAuthSDK` during the pending
     * fetch for activation status, then the application gets an exception, with this error code.
     */
    OPERATION_CANCELED = "OPERATION_CANCELED",

    /** Error code for error that occurs when invalid activation code is provided. */
    INVALID_ACTIVATION_CODE = "INVALID_ACTIVATION_CODE",

    /** Error code for accessing an unknown token. */
    INVALID_TOKEN = "INVALID_TOKEN",

    /** Error code for errors related to end-to-end encryption. */
    ENCRYPTION_ERROR = "ENCRYPTION_ERROR",

    /** Error code for a general API misuse. */
    WRONG_PARAMETER = "WRONG_PARAMETER",

    /** Error code for protocol upgrade failure. The recommended action is to retry the status fetch operation, or locally remove the activation. */
    PROTOCOL_UPGRADE = "PROTOCOL_UPGRADE",

    /** The requested function is not available during the protocol upgrade. You can retry the operation, after the upgrade is finished. */
    PENDING_PROTOCOL_UPGRADE = "PENDING_PROTOCOL_UPGRADE",

    /** The biometric authentication cannot be processed due to lack of required hardware or due to a missing support from the operating system. */
    BIOMETRY_NOT_SUPPORTED = "BIOMETRY_NOT_SUPPORTED",

    /** The biometric authentication is temporarily unavailable. */
    BIOMETRY_NOT_AVAILABLE = "BIOMETRY_NOT_AVAILABLE",

    /**
     * The biometric authentication is locked out due to too many failed attempts.
     * 
     * The error is reported for the temporary and also for the permanent lockout. The temporary
     * lockout typically occurs after 5 failed attempts, and lasts for 30 seconds. In case of permanent
     * lockout the biometric authentication is disabled until the user unlocks the device with strong
     * authentication (PIN, password, pattern).
     */
    BIOMETRY_LOCKOUT = "BIOMETRY_LOCKOUT",

    /** The biometric authentication did not recognize the biometric image (fingerprint, face, etc...) */
    BIOMETRY_NOT_RECOGNIZED = "BIOMETRY_NOT_RECOGNIZED",

    /**
     * The keychain protection is not sufficient. The exception is thrown in case that device doesn't
     * support the minimum required level of the keychain protection.
     * Android only.
     */
    INSUFFICIENT_KEYCHAIN_PROTECTION = "INSUFFICIENT_KEYCHAIN_PROTECTION",

    /** Error code for a general error related to WatchConnectivity (iOS only) */
    WATCH_CONNECTIVITY = "WATCH_CONNECTIVITY",

    /** When the error is not originating from the native module. */
    REACT_NATIVE_ERROR = "REACT_NATIVE_ERROR",

    /** Instance of the PowerAuth object is not configured */
    INSTANCE_NOT_CONFIGURED = "INSTANCE_NOT_CONFIGURED",

    /** Error in `correctTypedCharacter` */
    INVALID_CHARACTER = "INVALID_CHARACTER",

    /** Used invalid recovery code in parseRecoveryCode */
    INVALID_RECOVERY_CODE = "INVALID_RECOVERY_CODE",

    /** Error when generating a token */
    CANNOT_GENERATE_TOKEN = "CANNOT_GENERATE_TOKEN",

    /** Error when requesting local token */
    LOCAL_TOKEN_NOT_AVAILABLE = "LOCAL_TOKEN_NOT_AVAILABLE",

    /** Biometric authentication failed */
    BIOMETRY_FAILED = "BIOMETRY_FAILED",

    /** When password is not set during activation commit */
    PASSWORD_NOT_SET = "PASSWORD_NOT_SET",

    /** Error when invalid activation object is provided during activation */
    INVALID_ACTIVATION_OBJECT = "INVALID_ACTIVATION_OBJECT",

    /** Failed with unexpected error. */
    UNKNOWN_ERROR = "UNKNOWN_ERROR",
}