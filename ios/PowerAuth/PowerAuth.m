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
    NSDictionary<NSString*,NSString*>* identityAttributes = activation[@"identityAttributes"];
    NSString* extras = activation[@"extras"];
    NSDictionary<NSString*,NSString*>* customAttributes = activation[@"customAttributes"];
    NSString* additionalActivationOtp = activation[@"additionalActivationOtp"];
    
    if (activationCode) {
        paActivation = [PowerAuthActivation activationWithActivationCode:activationCode name:name];
    } else if (recoveryCode && recoveryPuk) {
        paActivation = [PowerAuthActivation activationWithRecoveryCode:recoveryCode recoveryPuk:recoveryPuk name:name];
    } else if (identityAttributes) {
        paActivation = [PowerAuthActivation activationWithIdentityAttributes:identityAttributes name:name];
    }
    
    if (!activation) {
        reject(@"PA2RNInvalidActivationObject", @"Activation object is invalid.", nil);
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

RCT_EXPORT_METHOD(requestSignature:(NSString*)userPassword
                  withRequestmethod:(NSString*)requestMethod
                  withUriId:(NSString*)uriId
                  withRequestData:(NSData*)requestData
                  requestSignatureResolver:(RCTPromiseResolveBlock)resolve
                  requestSignature:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [[PowerAuthAuthentication alloc] init];
    auth.usePossession = true;
    auth.usePassword = userPassword;
    auth.useBiometry = false;
    
    NSLog(@"Request data log: %@", requestData);
    
    NSError* errorMessage = nil;
    PA2AuthorizationHttpHeader* signature = [[PowerAuthSDK sharedInstance] requestSignatureWithAuthentication:auth method:requestMethod uriId:uriId body:requestData error: &errorMessage];
    
    if (errorMessage) {
        reject(@"ERROR", errorMessage.localizedDescription, errorMessage);
    } else {
        NSDictionary *response = @{
            @"httpHeaderKey": signature.key,
            @"httpHeaderValue": signature.value
        };
        resolve(response);
    }
    
}

#pragma mark HELPER METHODS

- (PowerAuthAuthentication *)constructAuthenticationFromDictionary:(NSDictionary*)dict {
    PowerAuthAuthentication *auth = [[PowerAuthAuthentication alloc] init];
    auth.usePossession = [dict[@"usePossession"] boolValue];
    auth.usePassword = dict[@"userPassword"];
    auth.useBiometry = [dict[@"useBiometry"] boolValue];
    auth.biometryPrompt = dict[@"biometryPrompt"];
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
