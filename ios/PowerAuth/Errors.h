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

#import "Utilities.h"

#import <PowerAuth2/PowerAuthErrorConstants.h>
#import "PAJS.h"

PA_EXTERN_C NSString * __nonnull const EC_NETWORK_ERROR;
PA_EXTERN_C NSString * __nonnull const EC_SIGNATURE_ERROR;
PA_EXTERN_C NSString * __nonnull const EC_INVALID_ACTIVATION_STATE;
PA_EXTERN_C NSString * __nonnull const EC_INVALID_ACTIVATION_DATA;
PA_EXTERN_C NSString * __nonnull const EC_MISSING_ACTIVATION;
PA_EXTERN_C NSString * __nonnull const EC_PENDING_ACTIVATION;
PA_EXTERN_C NSString * __nonnull const EC_OPERATION_CANCELED;
PA_EXTERN_C NSString * __nonnull const EC_INVALID_TOKEN;
PA_EXTERN_C NSString * __nonnull const EC_INVALID_ENCRYPTOR;
PA_EXTERN_C NSString * __nonnull const EC_ENCRYPTION_ERROR;
PA_EXTERN_C NSString * __nonnull const EC_WRONG_PARAMETER;
PA_EXTERN_C NSString * __nonnull const EC_PROTOCOL_UPGRADE;
PA_EXTERN_C NSString * __nonnull const EC_PENDING_PROTOCOL_UPGRADE;
PA_EXTERN_C NSString * __nonnull const EC_WATCH_CONNECTIVITY;
PA_EXTERN_C NSString * __nonnull const EC_BIOMETRY_CANCEL;
PA_EXTERN_C NSString * __nonnull const EC_BIOMETRY_FALLBACK;
PA_EXTERN_C NSString * __nonnull const EC_BIOMETRY_FAILED;
PA_EXTERN_C NSString * __nonnull const EC_BIOMETRY_LOCKOUT;
PA_EXTERN_C NSString * __nonnull const EC_BIOMETRY_NOT_AVAILABLE;
PA_EXTERN_C NSString * __nonnull const EC_BIOMETRY_NOT_SUPPORTED;
PA_EXTERN_C NSString * __nonnull const EC_BIOMETRY_NOT_CONFIGURED;
PA_EXTERN_C NSString * __nonnull const EC_BIOMETRY_NOT_ENROLLED;
PA_EXTERN_C NSString * __nonnull const EC_AUTHENTICATION_ERROR;
PA_EXTERN_C NSString * __nonnull const EC_RESPONSE_ERROR;
PA_EXTERN_C NSString * __nonnull const EC_UNKNOWN_ERROR;
PA_EXTERN_C NSString * __nonnull const EC_REACT_NATIVE_ERROR;
PA_EXTERN_C NSString * __nonnull const EC_INVALID_ACTIVATION_OBJECT;
PA_EXTERN_C NSString * __nonnull const EC_INVALID_ACTIVATION_CODE;
PA_EXTERN_C NSString * __nonnull const EC_INVALID_RECOVERY_CODE;
PA_EXTERN_C NSString * __nonnull const EC_INVALID_CHARACTER;
PA_EXTERN_C NSString * __nonnull const EC_LOCAL_TOKEN_NOT_AVAILABLE;
PA_EXTERN_C NSString * __nonnull const EC_CANNOT_GENERATE_TOKEN;
PA_EXTERN_C NSString * __nonnull const EC_INSTANCE_NOT_CONFIGURED;
PA_EXTERN_C NSString * __nonnull const EC_INVALID_NATIVE_OBJECT;

/// Translates PowerAuthErrorCode into string representation.
/// @param code Error code to convert.
PA_EXTERN_C NSString * _Nonnull TranslatePAErrorCode(PowerAuthErrorCode code);

/// Translate reported NSError into proper React Native error code and reports everything back to promise reject block.
/// @param error Error to report.
/// @param reject Reject promise to call.
PA_EXTERN_C void ProcessError(NSError * _Nullable error, RCTPromiseRejectBlock _Nonnull reject);
