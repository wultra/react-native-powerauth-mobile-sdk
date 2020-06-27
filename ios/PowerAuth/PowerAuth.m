/**
 * Copyright 2020 Wultra s.r.o.
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

#import "PowerAuth.h"
#import "UIKit/UIKit.h"

#import <React/RCTConvert.h>

#import <PowerAuth2/PowerAuthSDK.h>
#import <PowerAuth2/PA2ErrorConstants.h>
#import <PowerAuth2/PA2ClientConfiguration.h>
#import <PowerAuth2/PA2ClientSslNoValidationStrategy.h>

@implementation PowerAuth

RCT_EXPORT_MODULE(PowerAuth);

RCT_REMAP_METHOD(configure,
                 instanceId:(NSString*)instanceId
                 appKey:(NSString*)appKey
                 appSecret:(NSString*)appSecret
                 masterServerPublicKey:(NSString*)masterServerPublicKey
                 baseEndpointUrl:(NSString*)baseEndpointUrl
                 enableUnsecureTraffic:(BOOL)enableUnsecureTraffic
                 configureResolve:(RCTPromiseResolveBlock)resolve
                 configureReject:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthConfiguration *config = [[PowerAuthConfiguration alloc] init];
    config.instanceId = instanceId;
    config.appKey = appKey;
    config.appSecret = appSecret;
    config.masterServerPublicKey = masterServerPublicKey;
    config.baseEndpointUrl = baseEndpointUrl;

    if (enableUnsecureTraffic) {
        [[PA2ClientConfiguration sharedInstance] setSslValidationStrategy:[[PA2ClientSslNoValidationStrategy alloc] init]];
    }

    if ([config validateConfiguration]) {
        [PowerAuthSDK initSharedInstance:config];
        resolve(@YES);
    } else {
        resolve(@NO);
    }
}

RCT_REMAP_METHOD(hasValidActivation,
                 hasValidActivationResolve:(RCTPromiseResolveBlock)resolve
                 hasValidActivationReject:(RCTPromiseRejectBlock)reject) {
    resolve(@([[PowerAuthSDK sharedInstance] hasValidActivation]));
}

RCT_REMAP_METHOD(canStartActivation,
                 canStartActivationResolve:(RCTPromiseResolveBlock)resolve
                 canStartActivationReject:(RCTPromiseRejectBlock)reject) {
    resolve(@([[PowerAuthSDK sharedInstance] canStartActivation]));
}

RCT_REMAP_METHOD(hasPendingActivation,
                 hasPendingActivationResolve:(RCTPromiseResolveBlock)resolve
                 hasPendingActivationReject:(RCTPromiseRejectBlock)reject) {
    resolve(@([[PowerAuthSDK sharedInstance] hasPendingActivation]));
}

RCT_REMAP_METHOD(fetchActivationStatus,
                 fetchActivationStatusResolve:(RCTPromiseResolveBlock)resolve
                 fetchActivationStatusReject:(RCTPromiseRejectBlock)reject) {
    
    [[PowerAuthSDK sharedInstance] fetchActivationStatusWithCallback:^(PA2ActivationStatus * _Nullable status, NSDictionary * _Nullable customObject, NSError * _Nullable error) {
        
        if (error == nil) {
            
            NSDictionary *response = @{
                @"state": [self getStatusCode:status.state],
                @"failCount": [[NSNumber alloc] initWithUnsignedInt:status.failCount],
                @"maxFailCount": [[NSNumber alloc] initWithUnsignedInt:status.maxFailCount],
                @"remainingAttempts": [[NSNumber alloc] initWithUnsignedInt:status.remainingAttempts]
            };
            resolve(response);
        } else {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        }
    }];
}

RCT_EXPORT_METHOD(createActivation:(NSDictionary*)activation
                  createActivationResolver:(RCTPromiseResolveBlock)resolve
                  createActivationRejecter:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthActivation * paActivation;
    
    NSString* name = activation[@"activationName"];
    NSString* activationCode = activation[@"activationCode"];
    NSString* recoveryCode = activation[@"recoveryCode"];
    NSString* recoveryPuk = activation[@"recoveryPuk"];
    NSDictionary* identityAttributes = activation[@"identityAttributes"];
    NSString* extras = activation[@"extras"];
    NSDictionary* customAttributes = activation[@"customAttributes"];
    NSString* additionalActivationOtp = activation[@"additionalActivationOtp"];
    
    if (activationCode) {
        paActivation = [PowerAuthActivation activationWithActivationCode:activationCode name:name];
    } else if (recoveryCode && recoveryPuk) {
        paActivation = [PowerAuthActivation activationWithRecoveryCode:recoveryCode recoveryPuk:recoveryPuk name:name];
    } else if (identityAttributes) {
        paActivation = [PowerAuthActivation activationWithIdentityAttributes:identityAttributes name:name];
    }
    
    if (!paActivation) {
        reject(@"PA2RNInvalidActivationObject", @"Activation object is invalid.", nil);
        return;
    }
    
    if (extras) {
        [paActivation withExtras:extras];
    }
    
    if (customAttributes) {
        [paActivation withCustomAttributes:customAttributes];
    }
    
    if (additionalActivationOtp) {
        [paActivation withAdditionalActivationOtp:additionalActivationOtp];
    }
    
    [[PowerAuthSDK sharedInstance] createActivation:paActivation callback:^(PA2ActivationResult * _Nullable result, NSError * _Nullable error) {
        if (error == nil) {
            NSDictionary *response = @{
                @"activationFingerprint": result.activationFingerprint,
                @"activationRecovery": result.activationRecovery
            };
            resolve(response);
        } else {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        }
    }];
}

RCT_EXPORT_METHOD(commitActivation:(NSDictionary*)authDict
                  commitActivationResolver:(RCTPromiseResolveBlock)resolve
                  commitActivationRejecter:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    
    NSError* error = nil;
    bool success = [[PowerAuthSDK sharedInstance] commitActivationWithAuthentication:auth error:&error];
    
    if (success) {
        resolve(@YES);
    } else {
        reject([self getErrorCodeFromError:error], error.localizedDescription, error);
    }
    
}

RCT_REMAP_METHOD(activationIdentifier,
                 activationIdentifierResolve:(RCTPromiseResolveBlock)resolve
                 activationIdentifierReject:(RCTPromiseRejectBlock)reject) {
    resolve([[PowerAuthSDK sharedInstance] activationIdentifier]);
}

RCT_REMAP_METHOD(activationFingerprint,
                 activationFingerprintResolve:(RCTPromiseResolveBlock)resolve
                 activationFingerprintReject:(RCTPromiseRejectBlock)reject) {
    resolve([[PowerAuthSDK sharedInstance] activationFingerprint]);
}

RCT_EXPORT_METHOD(removeActivationWithAuthentication:(NSDictionary*)authDict
                  removeActivationResolver:(RCTPromiseResolveBlock)resolve
                  removeActivationRejecter:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [[PowerAuthSDK sharedInstance] removeActivationWithAuthentication:auth callback:^(NSError * _Nullable error) {
        
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(@YES);
        }
        
    }];
    
}

RCT_EXPORT_METHOD(removeActivationLocal) {
    [[PowerAuthSDK sharedInstance] removeActivationLocal];
}

RCT_REMAP_METHOD(requestGetSignature,
                 requestGetSignatureWithAuthentication:(NSDictionary*)authDict
                 uriId:(NSString*)uriId
                 params:(nullable NSDictionary*)params
                 requestSignatureResolver:(RCTPromiseResolveBlock)resolve
                 requestSignatureReject:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    
    NSError* error = nil;
    PA2AuthorizationHttpHeader* signature = [[PowerAuthSDK sharedInstance] requestGetSignatureWithAuthentication:auth uriId:uriId params:params error: &error];
    
    if (error) {
        reject([self getErrorCodeFromError:error], error.localizedDescription, error);
    } else {
        NSDictionary *response = @{
            @"key": signature.key,
            @"value": signature.value
        };
        resolve(response);
    }
}

RCT_REMAP_METHOD(requestSignature,
                 requestSignatureWithAuthentication:(NSDictionary*)authDict
                 method:(nonnull NSString*)method
                 uriId:(nonnull NSString*)uriId
                 body:(nullable NSString*)body
                 requestSignatureResolver:(RCTPromiseResolveBlock)resolve
                 requestSignatureReject:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    
    NSError* error = nil;
    PA2AuthorizationHttpHeader* signature = [[PowerAuthSDK sharedInstance] requestSignatureWithAuthentication:auth method:method uriId:uriId body:[RCTConvert NSData:body] error:&error];
    
    if (error) {
        reject([self getErrorCodeFromError:error], error.localizedDescription, error);
    } else {
        NSDictionary *response = @{
            @"key": signature.key,
            @"value": signature.value
        };
        resolve(response);
    }
}

RCT_REMAP_METHOD(offlineSignature,
                 offlineSignatureWithAuthentication:(NSDictionary*)authDict
                 uriId:(NSString*)uriId
                 body:(nullable NSString*)body
                 nonce:(nonnull NSString*)nonce
                 offlineSignatureResolver:(RCTPromiseResolveBlock)resolve
                 offlineSignatureReject:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    NSError* error = nil;
    NSString* signature = [[PowerAuthSDK sharedInstance] offlineSignatureWithAuthentication:auth uriId:uriId body:[RCTConvert NSData:body] nonce:nonce error:&error];
    
    if (error) {
        reject([self getErrorCodeFromError:error], error.localizedDescription, error);
    } else {
        resolve(signature);
    }
}

RCT_EXPORT_METHOD(verifyServerSignedData:(nonnull NSString*)data
                  signature:(nonnull NSString*)signature
                  masterKey:(BOOL)masterKey
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    BOOL result = [[PowerAuthSDK sharedInstance] verifyServerSignedData:[RCTConvert NSData:data] signature:signature masterKey:masterKey];
    resolve([[NSNumber alloc] initWithBool:result]);
}

RCT_EXPORT_METHOD(unsafeChangePassword:(nonnull NSString*)oldPassword
                 to:(nonnull NSString*)newPassword
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject) {
    
    BOOL result = [[PowerAuthSDK sharedInstance] unsafeChangePasswordFrom:oldPassword to:newPassword];
    resolve([[NSNumber alloc] initWithBool:result]);
}

RCT_EXPORT_METHOD(changePassword:(nonnull NSString*)oldPassword
                 to:(nonnull NSString*)newPassword
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject) {
    
    [[PowerAuthSDK sharedInstance] changePasswordFrom:oldPassword to:newPassword callback:^(NSError * error) {
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(@YES);
        }
    }];
}

RCT_EXPORT_METHOD(addBiometryFactor:(NSString*)password
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [[PowerAuthSDK sharedInstance] addBiometryFactor:password callback:^(NSError * error) {
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(@YES);
        }
    }];
}

RCT_EXPORT_METHOD(hasBiometryFactor:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    resolve([[NSNumber alloc] initWithBool:[[PowerAuthSDK sharedInstance] hasBiometryFactor]]);
}

RCT_EXPORT_METHOD(removeBiometryFactor:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    resolve([[NSNumber alloc] initWithBool:[[PowerAuthSDK sharedInstance] removeBiometryFactor]]);
}

RCT_EXPORT_METHOD(fetchEncryptionKey:(NSDictionary*)authDict
                  index:(NSInteger)index
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [[PowerAuthSDK sharedInstance] fetchEncryptionKey:auth index:index  callback:^(NSData * encryptionKey, NSError * error) {
        if (encryptionKey) {
            resolve([encryptionKey base64EncodedStringWithOptions:NSDataBase64EncodingEndLineWithLineFeed]);
        } else {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        }
    }];
}

RCT_EXPORT_METHOD(signDataWithDevicePrivateKey:(NSDictionary*)authDict
                  data:(NSData*)data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [[PowerAuthSDK sharedInstance] signDataWithDevicePrivateKey:auth data:[RCTConvert NSData:data] callback:^(NSData * signature, NSError * error) {
        if (signature) {
            resolve([RCTConvert NSString:signature]);
        } else {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        }
    }];
}

RCT_EXPORT_METHOD(validatePassword:(NSString*)password
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [[PowerAuthSDK sharedInstance] validatePasswordCorrect:password callback:^(NSError * error) {
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(@YES);
        }
    }];
}

RCT_EXPORT_METHOD(hasActivationRecoveryData:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    resolve([[NSNumber alloc] initWithBool:[[PowerAuthSDK sharedInstance] hasActivationRecoveryData]]);
}

RCT_EXPORT_METHOD(activationRecoveryData:(NSDictionary*)authDict
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [[PowerAuthSDK sharedInstance] activationRecoveryData:auth callback:^(PA2ActivationRecoveryData * data, NSError * error) {
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            NSDictionary *response = @{
                @"recoveryCode": data.recoveryCode,
                @"puk": data.puk
            };
            resolve(response);
        }
    }];
}

RCT_EXPORT_METHOD(confirmRecoveryCode:(NSString*)recoveryCode
                  authentication:(NSDictionary*)authDict
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [[PowerAuthSDK sharedInstance] confirmRecoveryCode:recoveryCode authentication:auth callback:^(BOOL alreadyConfirmed, NSError * error) {
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(@YES);
        }
    }];
}

#pragma mark HELPER METHODS

- (PowerAuthAuthentication *)constructAuthenticationFromDictionary:(NSDictionary*)dict {
    PowerAuthAuthentication *auth = [[PowerAuthAuthentication alloc] init];
    auth.usePossession = [RCTConvert BOOL:dict[@"usePossession"]];
    auth.useBiometry = [RCTConvert BOOL:dict[@"useBiometry"]];
    if (dict[@"userPassword"] != [NSNull null]) {
        auth.usePassword = [RCTConvert NSString:dict[@"userPassword"]];
    }
    if (dict[@"biometryMessage"] != [NSNull null]) {
        auth.biometryPrompt = [RCTConvert NSString:dict[@"biometryMessage"]];
    }
    return auth;
}

#define ENUM_CASE_TO_STR(x, enumValue) if (x == enumValue) return @#enumValue;

- (NSString*)getErrorCodeFromError:(NSError*)paError {

    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeNetworkError);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeSignatureError);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeInvalidActivationState);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeInvalidActivationData);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeMissingActivation);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeActivationPending);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeBiometryCancel);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeOperationCancelled);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeInvalidToken);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeEncryption);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeWrongParameter);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeProtocolUpgrade);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodePendingProtocolUpgrade);
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeWatchConnectivity)
    ENUM_CASE_TO_STR(paError.code, PA2ErrorCodeBiometryNotAvailable);
    return [[NSString alloc] initWithFormat:@"PA2UnknownCode%li", paError.code];
}

- (NSString*)getStatusCode:(PA2ActivationState)status {

    ENUM_CASE_TO_STR(status, PA2ActivationState_Created);
    ENUM_CASE_TO_STR(status, PA2ActivationState_PendingCommit);
    ENUM_CASE_TO_STR(status, PA2ActivationState_Active);
    ENUM_CASE_TO_STR(status, PA2ActivationState_Blocked);
    ENUM_CASE_TO_STR(status, PA2ActivationState_Removed);
    ENUM_CASE_TO_STR(status, PA2ActivationState_Deadlock);
    return [[NSString alloc] initWithFormat:@"PA2ActivationState_Unknown%i", status];
}

#undef ENUM_CASE_TO_STR

@end
