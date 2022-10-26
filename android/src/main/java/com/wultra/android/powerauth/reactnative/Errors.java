/*
 * Copyright 2022 Wultra s.r.o.
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

package com.wultra.android.powerauth.reactnative;

import android.annotation.SuppressLint;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;

import java.io.IOException;

import javax.annotation.Nonnull;

import io.getlime.security.powerauth.exception.PowerAuthErrorCodes;
import io.getlime.security.powerauth.exception.PowerAuthErrorException;
import io.getlime.security.powerauth.networking.exceptions.ErrorResponseApiException;
import io.getlime.security.powerauth.networking.exceptions.FailedApiException;

class Errors {

    // RN specific

    static final String EC_REACT_NATIVE_ERROR = "REACT_NATIVE_ERROR";
    static final String EC_AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR";
    static final String EC_RESPONSE_ERROR = "RESPONSE_ERROR";
    static final String EC_INSTANCE_NOT_CONFIGURED = "INSTANCE_NOT_CONFIGURED";
    static final String EC_INVALID_CHARACTER = "INVALID_CHARACTER";
    static final String EC_INVALID_RECOVERY_CODE = "INVALID_RECOVERY_CODE";
    static final String EC_CANNOT_GENERATE_TOKEN = "CANNOT_GENERATE_TOKEN";
    static final String EC_LOCAL_TOKEN_NOT_AVAILABLE = "LOCAL_TOKEN_NOT_AVAILABLE";
    static final String EC_BIOMETRY_FAILED = "BIOMETRY_FAILED";
    static final String EC_PASSWORD_NOT_SET = "PASSWORD_NOT_SET";
    static final String EC_INVALID_ACTIVATION_OBJECT = "INVALID_ACTIVATION_OBJECT";
    static final String EC_INVALID_NATIVE_OBJECT = "INVALID_NATIVE_OBJECT";

    // Translated PowerAuthErrorCodes

    static final String EC_SUCCEED = "SUCCEED";
    static final String EC_NETWORK_ERROR = "NETWORK_ERROR";
    static final String EC_SIGNATURE_ERROR = "SIGNATURE_ERROR";
    static final String EC_INVALID_ACTIVATION_STATE = "INVALID_ACTIVATION_STATE";
    static final String EC_INVALID_ACTIVATION_DATA = "INVALID_ACTIVATION_DATA";
    static final String EC_MISSING_ACTIVATION = "MISSING_ACTIVATION";
    static final String EC_PENDING_ACTIVATION = "PENDING_ACTIVATION";
    static final String EC_BIOMETRY_CANCEL = "BIOMETRY_CANCEL";
    static final String EC_OPERATION_CANCELED = "OPERATION_CANCELED";
    static final String EC_INVALID_ACTIVATION_CODE = "INVALID_ACTIVATION_CODE";
    static final String EC_INVALID_TOKEN = "INVALID_TOKEN";
    static final String EC_ENCRYPTION_ERROR = "ENCRYPTION_ERROR";
    static final String EC_WRONG_PARAMETER = "WRONG_PARAMETER";
    static final String EC_PROTOCOL_UPGRADE = "PROTOCOL_UPGRADE";
    static final String EC_PENDING_PROTOCOL_UPGRADE = "PENDING_PROTOCOL_UPGRADE";
    static final String EC_BIOMETRY_NOT_SUPPORTED = "BIOMETRY_NOT_SUPPORTED";
    static final String EC_BIOMETRY_NOT_AVAILABLE = "BIOMETRY_NOT_AVAILABLE";
    static final String EC_BIOMETRY_NOT_RECOGNIZED = "BIOMETRY_NOT_RECOGNIZED";
    static final String EC_BIOMETRY_NOT_CONFIGURED = "BIOMETRY_NOT_CONFIGURED";
    static final String EC_INSUFFICIENT_KEYCHAIN_PROTECTION = "INSUFFICIENT_KEYCHAIN_PROTECTION";
    static final String EC_BIOMETRY_LOCKOUT = "BIOMETRY_LOCKpublic OUT";

    /**
     * Translate {@code PowerAuthErrorCodes} error constant into string representation.
     * @param error Error code to translate.
     * @return String representation of given error code.
     */
    @SuppressLint("DefaultLocale")
    static String getErrorCodeFromError(@PowerAuthErrorCodes int error) {
        switch (error) {
            case PowerAuthErrorCodes.SUCCEED: return EC_SUCCEED;
            case PowerAuthErrorCodes.NETWORK_ERROR: return EC_NETWORK_ERROR;
            case PowerAuthErrorCodes.SIGNATURE_ERROR: return EC_SIGNATURE_ERROR;
            case PowerAuthErrorCodes.INVALID_ACTIVATION_STATE: return EC_INVALID_ACTIVATION_STATE;
            case PowerAuthErrorCodes.INVALID_ACTIVATION_DATA: return EC_INVALID_ACTIVATION_DATA;
            case PowerAuthErrorCodes.MISSING_ACTIVATION: return EC_MISSING_ACTIVATION;
            case PowerAuthErrorCodes.PENDING_ACTIVATION: return EC_PENDING_ACTIVATION;
            case PowerAuthErrorCodes.BIOMETRY_CANCEL: return EC_BIOMETRY_CANCEL;
            case PowerAuthErrorCodes.OPERATION_CANCELED: return EC_OPERATION_CANCELED;
            case PowerAuthErrorCodes.INVALID_ACTIVATION_CODE: return EC_INVALID_ACTIVATION_CODE;
            case PowerAuthErrorCodes.INVALID_TOKEN: return EC_INVALID_TOKEN;
            case PowerAuthErrorCodes.ENCRYPTION_ERROR: return EC_ENCRYPTION_ERROR;
            case PowerAuthErrorCodes.WRONG_PARAMETER: return EC_WRONG_PARAMETER;
            case PowerAuthErrorCodes.PROTOCOL_UPGRADE: return EC_PROTOCOL_UPGRADE;
            case PowerAuthErrorCodes.PENDING_PROTOCOL_UPGRADE: return EC_PENDING_PROTOCOL_UPGRADE;
            case PowerAuthErrorCodes.BIOMETRY_NOT_SUPPORTED: return EC_BIOMETRY_NOT_SUPPORTED;
            case PowerAuthErrorCodes.BIOMETRY_NOT_AVAILABLE: return EC_BIOMETRY_NOT_AVAILABLE;
            case PowerAuthErrorCodes.BIOMETRY_NOT_RECOGNIZED: return EC_BIOMETRY_NOT_RECOGNIZED;
            case PowerAuthErrorCodes.INSUFFICIENT_KEYCHAIN_PROTECTION: return EC_INSUFFICIENT_KEYCHAIN_PROTECTION;
            case PowerAuthErrorCodes.BIOMETRY_LOCKOUT: return EC_BIOMETRY_LOCKOUT;
            default: return String.format("UNKNOWN_%d", error);
        }
    }

    /**
     * Reject promise with given error. The provided error is automatically translated to
     * a proper error code returned to RN, depending on the type of exception.
     *
     * @param promise Promise to reject.
     * @param t Error to report.
     */
    static void rejectPromise(Promise promise, Throwable t) {
        @Nonnull String code = EC_REACT_NATIVE_ERROR; // fallback code
        String message = t.getMessage();
        WritableMap userInfo = null;

        if (t instanceof WrapperException) {
            // Exceptions produced in this module
            code = ((WrapperException) t).getErrorCode();
        } else if (t instanceof PowerAuthErrorException) {
            // Standard PowerAuthErrorException, containing enumeration with error code.
            code = getErrorCodeFromError(((PowerAuthErrorException)t).getPowerAuthErrorCode());
        } else if (t instanceof FailedApiException) {
            // FailedApiException or more specialized ErrorResponseApiException
            final FailedApiException failedApiException = (FailedApiException)t;
            final int httpStatusCode = failedApiException.getResponseCode();
            if (httpStatusCode == 401) {
                code = EC_AUTHENTICATION_ERROR;
                message = "Unauthorized";
            } else {
                code = EC_RESPONSE_ERROR;
            }
            //
            userInfo = Arguments.createMap();
            userInfo.putInt("httpStatusCode", httpStatusCode);
            userInfo.putString("responseBody", failedApiException.getResponseBody());
            if (t instanceof ErrorResponseApiException) {
                // ErrorResponseApiException is more specialized version of FailedApiException, containing
                // an additional data.
                final ErrorResponseApiException errorResponseApiException = (ErrorResponseApiException)t;
                final int currentRecoveryPukIndex = errorResponseApiException.getCurrentRecoveryPukIndex();
                if (currentRecoveryPukIndex > 0) {
                    userInfo.putInt("currentRecoveryPukIndex", currentRecoveryPukIndex);
                }
                userInfo.putString("serverResponseCode", errorResponseApiException.getErrorResponse().getCode());
                userInfo.putString("serverResponseMessage", errorResponseApiException.getErrorResponse().getMessage());
            }
        } else if (t instanceof IOException) {
            // This is wrong, PowerAuth SDK should wrap such exception and report network related failure.
            code = EC_NETWORK_ERROR;
        }

        if (message != null && userInfo != null) {
            promise.reject(code, message, t, userInfo);
        } else if (message != null) {
            promise.reject(code, message, t);
        } else if (userInfo != null) {
            promise.reject(code, t, userInfo);
        } else {
            promise.reject(code, t);
        }
    }
}
