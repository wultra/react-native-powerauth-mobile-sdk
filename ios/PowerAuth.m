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

@implementation PowerAuth

RCT_EXPORT_MODULE(PowerAuth);

RCT_REMAP_METHOD(configure,
                 instanceId:(NSString*)instanceId
                 appKey:(NSString*)appKey
                 appSecret:(NSString*)appSecret
                 masterServerPublicKey:(NSString*)masterServerPublicKey
                 baseEndpointUrl:(NSString*)baseEndpointUrl
                 configureResolve:(RCTPromiseResolveBlock)resolve
                 configureReject:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthConfiguration *config = [[PowerAuthConfiguration alloc] init];
    config.instanceId = instanceId;
    config.appKey = appKey;
    config.appSecret = appSecret;
    config.masterServerPublicKey = masterServerPublicKey;
    config.baseEndpointUrl = baseEndpointUrl;

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
            resolve(status);
        } else {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        }
    }];
}

RCT_EXPORT_METHOD(createActivationWithActivationCode:(NSString*)activationCode
                 deviceName:(NSString*)deviceName
                 createActivationResolver:(RCTPromiseResolveBlock)resolve
                 createActivationRejecter:(RCTPromiseRejectBlock)reject) {
    
    [[PowerAuthSDK sharedInstance] createActivationWithName:deviceName activationCode:activationCode callback:^(PA2ActivationResult * _Nullable result, NSError * _Nullable error) {
        if (error == nil) {
            NSDictionary *response = @{
                @"activationFingerprint": result.activationFingerprint
            };
            resolve(response);
        } else {
            reject(@"ERROR", error.localizedDescription, error);
        }
    }];
}

RCT_EXPORT_METHOD(createActivationWithIdentityAttributes:(NSDictionary*)identityAttributes
                  deviceName:(NSString*)deviceName
                  createActivationResolver:(RCTPromiseResolveBlock)resolve
                  createActivationRejecter:(RCTPromiseRejectBlock)reject) {
    
    [[PowerAuthSDK sharedInstance] createActivationWithName:deviceName identityAttributes:identityAttributes extras:nil callback:^(PA2ActivationResult * _Nullable result, NSError * _Nullable error) {
        if (error == nil) {
            NSDictionary *response = @{
                @"activationFingerprint": result.activationFingerprint
            };
            resolve(response);
        } else {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        }
    }];
}

RCT_EXPORT_METHOD(commitActivation:(NSString*)password
                  biometry:(BOOL)biometry
                  commitActivationResolver:(RCTPromiseResolveBlock)resolve
                  commitActivationRejecter:(RCTPromiseRejectBlock)reject) {
    
    PowerAuthAuthentication *auth = [[PowerAuthAuthentication alloc] init];
    auth.usePossession = true;
    auth.usePassword = password;
    auth.useBiometry = biometry;
    
    NSError* error = nil;
    bool success = [[PowerAuthSDK sharedInstance] commitActivationWithAuthentication:auth error:&error];
    
    if (success) {
        resolve(@YES);
    } else {
        reject(@"ERROR", error.localizedDescription, error);
    }
    
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

#undef ENUM_CASE_TO_STR

@end
