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

#import "Errors.h"

#import <PowerAuth2/PowerAuthRestApiErrorResponse.h>

// MARK: - Error constatns

NSString * const EC_NETWORK_ERROR               = @"NETWORK_ERROR";
NSString * const EC_SIGNATURE_ERROR             = @"SIGNATURE_ERROR";
NSString * const EC_INVALID_ACTIVATION_STATE    = @"INVALID_ACTIVATION_STATE";
NSString * const EC_INVALID_ACTIVATION_DATA     = @"INVALID_ACTIVATION_DATA";
NSString * const EC_MISSING_ACTIVATION          = @"MISSING_ACTIVATION";
NSString * const EC_PENDING_ACTIVATION          = @"PENDING_ACTIVATION";
NSString * const EC_OPERATION_CANCELED          = @"OPERATION_CANCELED";
NSString * const EC_INVALID_TOKEN               = @"INVALID_TOKEN";
NSString * const EC_INVALID_ENCRYPTOR           = @"INVALID_ENCRYPTOR";
NSString * const EC_ENCRYPTION_ERROR            = @"ENCRYPTION_ERROR";
NSString * const EC_WRONG_PARAMETER             = @"WRONG_PARAMETER";
NSString * const EC_PROTOCOL_UPGRADE            = @"PROTOCOL_UPGRADE";
NSString * const EC_PENDING_PROTOCOL_UPGRADE    = @"PENDING_PROTOCOL_UPGRADE";
NSString * const EC_WATCH_CONNECTIVITY          = @"WATCH_CONNECTIVITY";
NSString * const EC_BIOMETRY_CANCEL             = @"BIOMETRY_CANCEL";
NSString * const EC_BIOMETRY_FALLBACK           = @"BIOMETRY_FALLBACK";
NSString * const EC_BIOMETRY_FAILED             = @"BIOMETRY_FAILED";
NSString * const EC_BIOMETRY_LOCKOUT            = @"BIOMETRY_LOCKOUT";
NSString * const EC_BIOMETRY_NOT_AVAILABLE      = @"BIOMETRY_NOT_AVAILABLE";
NSString * const EC_BIOMETRY_NOT_SUPPORTED      = @"BIOMETRY_NOT_SUPPORTED";
NSString * const EC_BIOMETRY_NOT_CONFIGURED     = @"BIOMETRY_NOT_CONFIGURED";
NSString * const EC_BIOMETRY_NOT_ENROLLED       = @"BIOMETRY_NOT_ENROLLED";
NSString * const EC_AUTHENTICATION_ERROR        = @"AUTHENTICATION_ERROR";
NSString * const EC_RESPONSE_ERROR              = @"RESPONSE_ERROR";
NSString * const EC_UNKNOWN_ERROR               = @"UNKNOWN_ERROR";
NSString * const EC_REACT_NATIVE_ERROR          = @"REACT_NATIVE_ERROR";
NSString * const EC_INVALID_ACTIVATION_OBJECT   = @"INVALID_ACTIVATION_OBJECT";
NSString * const EC_INVALID_ACTIVATION_CODE     = @"INVALID_ACTIVATION_CODE";
NSString * const EC_INVALID_RECOVERY_CODE       = @"INVALID_RECOVERY_CODE";
NSString * const EC_INVALID_CHARACTER           = @"INVALID_CHARACTER";
NSString * const EC_LOCAL_TOKEN_NOT_AVAILABLE   = @"LOCAL_TOKEN_NOT_AVAILABLE";
NSString * const EC_CANNOT_GENERATE_TOKEN       = @"CANNOT_GENERATE_TOKEN";
NSString * const EC_INSTANCE_NOT_CONFIGURED     = @"INSTANCE_NOT_CONFIGURED";
NSString * const EC_INVALID_NATIVE_OBJECT       = @"INVALID_NATIVE_OBJECT";

// MARK: - Utility functions

/// Translates PowerAuthErrorCode into string representation.
/// @param code Error code to convert.
NSString * TranslatePAErrorCode(PowerAuthErrorCode code)
{
    switch (code) {
        case PowerAuthErrorCode_NetworkError: return EC_NETWORK_ERROR;
        case PowerAuthErrorCode_SignatureError: return EC_SIGNATURE_ERROR;
        case PowerAuthErrorCode_InvalidActivationState: return EC_INVALID_ACTIVATION_STATE;
        case PowerAuthErrorCode_InvalidActivationData: return EC_INVALID_ACTIVATION_DATA;
        case PowerAuthErrorCode_MissingActivation: return EC_MISSING_ACTIVATION;
        case PowerAuthErrorCode_ActivationPending: return EC_PENDING_ACTIVATION;
        case PowerAuthErrorCode_BiometryCancel: return EC_BIOMETRY_CANCEL;
        case PowerAuthErrorCode_OperationCancelled: return EC_OPERATION_CANCELED;
        case PowerAuthErrorCode_InvalidActivationCode: return EC_INVALID_ACTIVATION_CODE;
        case PowerAuthErrorCode_InvalidToken: return EC_INVALID_TOKEN;
        case PowerAuthErrorCode_Encryption: return EC_ENCRYPTION_ERROR;
        case PowerAuthErrorCode_WrongParameter: return EC_WRONG_PARAMETER;
        case PowerAuthErrorCode_ProtocolUpgrade: return EC_PROTOCOL_UPGRADE;
        case PowerAuthErrorCode_PendingProtocolUpgrade: return EC_PENDING_PROTOCOL_UPGRADE;
        case PowerAuthErrorCode_BiometryNotAvailable: return EC_BIOMETRY_NOT_AVAILABLE;
        case PowerAuthErrorCode_WatchConnectivity: return EC_WATCH_CONNECTIVITY;
        case PowerAuthErrorCode_BiometryFailed: return EC_BIOMETRY_FAILED;
        case PowerAuthErrorCode_BiometryFallback: return EC_BIOMETRY_FALLBACK;
        default: return [[NSString alloc] initWithFormat:@"UNKNOWN_%li", code];
    }
}

/// Method translate reported NSError into proper React Native error code and reports everything back promise reject block.
/// @param error Error to report.
/// @param reject Reject promise to call.
void ProcessError(NSError * error, RCTPromiseRejectBlock reject)
{
    NSString * errorCode = nil;
    NSString * message;
    if (error != nil) {
        // Keep message
        message = error.localizedDescription;
        // If powerAuthErrorCode is different than .NA, then it's PowerAuthDomain error.
        PowerAuthErrorCode paErrorCode = error.powerAuthErrorCode;
        if (paErrorCode != PowerAuthErrorCode_NA) {
            // Handle PA error
            NSDictionary * responseData = CAST_TO(error.userInfo[PowerAuthErrorInfoKey_AdditionalInfo], NSDictionary);
            if (responseData != nil) {
                // Handle error response received from the server. In this case, we have to re-create a new NSError, because
                // React Native layer cannot translate our custom objects, stored in NSError. So, we have to create a new userInfo with
                // a plain serializable data.
                PowerAuthRestApiErrorResponse * responseObject = CAST_TO(error.userInfo[PowerAuthErrorDomain], PowerAuthRestApiErrorResponse);
                NSUInteger httpStatusCode = responseObject.httpStatusCode;
                if (httpStatusCode == 401) {
                    errorCode = EC_AUTHENTICATION_ERROR;
                    message = @"Unauthorized";
                } else {
                    errorCode = EC_RESPONSE_ERROR;
                    message = @"Wrong HTTP status code received from the server";
                }
                NSMutableDictionary * newUserInfo = [NSMutableDictionary dictionaryWithObject:message forKey:NSLocalizedDescriptionKey];
                if (responseObject) {
                    newUserInfo[@"httpStatusCode"] = @(httpStatusCode);
                    // Serialize dictionary back to string, to be compatible with Android
                    NSData * jsonData = [NSJSONSerialization dataWithJSONObject:responseData options:0 error:nil];
                    if (jsonData) {
                        NSString * jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
                        if (jsonString) {
                            newUserInfo[@"responseBody"] = jsonString;
                        }
                    }
                    NSString * serverResponseCode = responseObject.responseObject.code;
                    if (serverResponseCode) {
                        newUserInfo[@"serverResponseCode"] = serverResponseCode;
                    }
                    NSString * serverResponseMessage = responseObject.responseObject.message;
                    if (serverResponseMessage) {
                        newUserInfo[@"serverResponseMessage"] = serverResponseMessage;
                    }
                    NSInteger recoveryPukIndex = responseObject.responseObject.currentRecoveryPukIndex;
                    if (recoveryPukIndex > 0) {
                        newUserInfo[@"currentRecoveryPukIndex"] = @(recoveryPukIndex);
                    }
                }
                // Finally, build a new error
                error = [NSError errorWithDomain:PowerAuthErrorDomain code:error.code userInfo:newUserInfo];
                //
            } else {
                // Other type of PowerAuthError. Just translate errorCode to string and keep NSError as it is.
                errorCode = TranslatePAErrorCode(paErrorCode);
                //
            }
        } else if ([error.domain isEqualToString:NSURLErrorDomain]) {
            // Handle error from NSURLSession
            errorCode = EC_NETWORK_ERROR;
            //
        } else {
            // We don't know this domain, so translate result as an UNKNOWN_ERROR
            errorCode = EC_UNKNOWN_ERROR;
            //
        }
    } else {
        // Error object is nil
        errorCode = EC_UNKNOWN_ERROR;
        message = @"Native code failed with unspecified error";
    }
    
    // Finally call promise's reject
    reject(errorCode, message, error);
}
