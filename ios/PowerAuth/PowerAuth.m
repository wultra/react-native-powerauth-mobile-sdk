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
#import <PowerAuth2/PA2Keychain.h>
#import <PowerAuth2/PA2ClientSslNoValidationStrategy.h>

@interface PowerAuth ()
 
@property (retain, readwrite) NSMutableDictionary* instances;
 
@end

@implementation PowerAuth

#define PA_BLOCK_START [self usePowerAuth:instanceId reject:reject callback:^(PowerAuthSDK * powerAuth) {
#define PA_BLOCK_END }];

- (instancetype)init
{
    self = [super init];
    if (self) {
        _instances = [[NSMutableDictionary alloc] init];
    }
    return self;
}

RCT_EXPORT_MODULE(PowerAuth);

RCT_REMAP_METHOD(isConfigured,
                 instanceId:(NSString *)instanceId
                 isConfiguredResolve:(RCTPromiseResolveBlock)resolve
                 isConfiguredReject:(RCTPromiseRejectBlock)reject)
{
    resolve([self powerAuthForInstanceId:instanceId] ? @YES : @NO);
}

- (BOOL)configureWithConfig:(nonnull PowerAuthConfiguration *)config
             keychainConfig:(nullable PA2KeychainConfiguration *)keychainConfig
               clientConfig:(nullable PA2ClientConfiguration *)clientConfig
{
    if ([self powerAuthForInstanceId: [config instanceId]]) {
        // powerAuth instance for this instanceId already exists
        return NO;
    }
    
    if ([config validateConfiguration]) {
        PowerAuthSDK* sdk = [[PowerAuthSDK alloc] initWithConfiguration:config keychainConfiguration:keychainConfig clientConfiguration:clientConfig];
        [_instances setObject:sdk forKey:[config instanceId]];
        return YES;
    } else {
        return NO;
    }
}

RCT_REMAP_METHOD(configure,
                 instanceId:(NSString*)instanceId
                 appKey:(NSString*)appKey
                 appSecret:(NSString*)appSecret
                 masterServerPublicKey:(NSString*)masterServerPublicKey
                 baseEndpointUrl:(NSString*)baseEndpointUrl
                 enableUnsecureTraffic:(BOOL)enableUnsecureTraffic
                 configureResolve:(RCTPromiseResolveBlock)resolve
                 configureReject:(RCTPromiseRejectBlock)reject)
{
    PowerAuthConfiguration *config = [[PowerAuthConfiguration alloc] init];
    config.instanceId = instanceId;
    config.appKey = appKey;
    config.appSecret = appSecret;
    config.masterServerPublicKey = masterServerPublicKey;
    config.baseEndpointUrl = baseEndpointUrl;

    PA2ClientConfiguration * clientConfig = [[PA2ClientConfiguration sharedInstance] copy];
    
    if (enableUnsecureTraffic) {
        [clientConfig setSslValidationStrategy:[[PA2ClientSslNoValidationStrategy alloc] init]];
    }
    
    if ([self configureWithConfig:config keychainConfig:nil clientConfig:clientConfig]) {
        resolve(@YES);
    } else {
        resolve(@NO);
    }
}

RCT_REMAP_METHOD(deconfigure,
                 instanceId:(NSString*)instanceId
                 deconfigureResolve:(RCTPromiseResolveBlock)resolve
                 deconfigureReject:(RCTPromiseRejectBlock)reject)
{
    [_instances removeObjectForKey:instanceId];
}

RCT_REMAP_METHOD(hasValidActivation,
                 instanceId:(NSString*)instanceId
                 hasValidActivationResolve:(RCTPromiseResolveBlock)resolve
                 hasValidActivationReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    resolve(@([powerAuth hasValidActivation]));
    PA_BLOCK_END
}

RCT_REMAP_METHOD(canStartActivation,
                 instanceId:(NSString*)instanceId
                 canStartActivationResolve:(RCTPromiseResolveBlock)resolve
                 canStartActivationReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    resolve(@([powerAuth canStartActivation]));
    PA_BLOCK_END
}

RCT_REMAP_METHOD(hasPendingActivation,
                 instanceId:(NSString*)instanceId
                 hasPendingActivationResolve:(RCTPromiseResolveBlock)resolve
                 hasPendingActivationReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    resolve(@([powerAuth hasPendingActivation]));
    PA_BLOCK_END
}

RCT_REMAP_METHOD(fetchActivationStatus,
                 instanceId:(NSString*)instanceId
                 fetchActivationStatusResolve:(RCTPromiseResolveBlock)resolve
                 fetchActivationStatusReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    [powerAuth fetchActivationStatusWithCallback:^(PA2ActivationStatus * _Nullable status, NSDictionary * _Nullable customObject, NSError * _Nullable error) {
        
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
    PA_BLOCK_END
}

RCT_REMAP_METHOD(createActivation,
                 instanceId:(NSString*)instanceId
                 activation:(NSDictionary*)activation
                 createActivationResolver:(RCTPromiseResolveBlock)resolve
                 createActivationRejecter:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
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
    
    [powerAuth createActivation:paActivation callback:^(PA2ActivationResult * _Nullable result, NSError * _Nullable error) {
        if (error == nil) {
            NSDictionary *response = @{
                @"activationFingerprint": result.activationFingerprint,
                @"activationRecovery": result.activationRecovery ? @{
                    @"recoveryCode": result.activationRecovery.recoveryCode,
                    @"puk": result.activationRecovery.puk
                } : [NSNull null],
                @"customAttributes": result.customAttributes ? result.customAttributes : [NSNull null]
            };
            resolve(response);
        } else {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(commitActivation,
                 instanceId:(NSString*)instanceId
                 authentication:(NSDictionary*)authDict
                 commitActivationResolver:(RCTPromiseResolveBlock)resolve
                 commitActivationRejecter:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    
    NSError* error = nil;
    bool success = [powerAuth commitActivationWithAuthentication:auth error:&error];
    
    if (success) {
        resolve(@YES);
    } else {
        reject([self getErrorCodeFromError:error], error.localizedDescription, error);
    }
    PA_BLOCK_END
}

RCT_REMAP_METHOD(activationIdentifier,
                 instanceId:(NSString*)instanceId
                 activationIdentifierResolve:(RCTPromiseResolveBlock)resolve
                 activationIdentifierReject:(RCTPromiseRejectBlock)reject)
{
    
    PA_BLOCK_START
    resolve([powerAuth activationIdentifier]);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(activationFingerprint,
                 instanceId:(NSString*)instanceId
                 activationFingerprintResolve:(RCTPromiseResolveBlock)resolve
                 activationFingerprintReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    resolve([powerAuth activationFingerprint]);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(removeActivationWithAuthentication,
                 instanceId:(NSString*)instanceId
                 authentication:(NSDictionary*)authDict
                 removeActivationResolver:(RCTPromiseResolveBlock)resolve
                 removeActivationRejecter:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [powerAuth removeActivationWithAuthentication:auth callback:^(NSError * _Nullable error) {
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(@YES);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(removeActivationLocal,
                 instanceId:(NSString*)instanceId
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    [powerAuth removeActivationLocal];
    resolve([NSNull null]);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(requestGetSignature,
                 instanceId:(NSString*)instanceId
                 requestGetSignatureWithAuthentication:(NSDictionary*)authDict
                 uriId:(NSString*)uriId
                 params:(nullable NSDictionary*)params
                 requestSignatureResolver:(RCTPromiseResolveBlock)resolve
                 requestSignatureReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    NSError* error = nil;
    PA2AuthorizationHttpHeader* signature = [powerAuth requestGetSignatureWithAuthentication:auth uriId:uriId params:params error: &error];
    
    if (error) {
        reject([self getErrorCodeFromError:error], error.localizedDescription, error);
    } else {
        NSDictionary *response = @{
            @"key": signature.key,
            @"value": signature.value
        };
        resolve(response);
    }
    PA_BLOCK_END
}

RCT_REMAP_METHOD(requestSignature,
                 instanceId:(NSString*)instanceId
                 requestSignatureWithAuthentication:(NSDictionary*)authDict
                 method:(nonnull NSString*)method
                 uriId:(nonnull NSString*)uriId
                 body:(nullable NSString*)body
                 requestSignatureResolver:(RCTPromiseResolveBlock)resolve
                 requestSignatureReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    
    NSError* error = nil;
    PA2AuthorizationHttpHeader* signature = [powerAuth requestSignatureWithAuthentication:auth method:method uriId:uriId body:[RCTConvert NSData:body] error:&error];
    
    if (error) {
        reject([self getErrorCodeFromError:error], error.localizedDescription, error);
    } else {
        NSDictionary *response = @{
            @"key": signature.key,
            @"value": signature.value
        };
        resolve(response);
    }
    PA_BLOCK_END
}

RCT_REMAP_METHOD(offlineSignature,
                 instanceId:(NSString*)instanceId
                 offlineSignatureWithAuthentication:(NSDictionary*)authDict
                 uriId:(NSString*)uriId
                 body:(nullable NSString*)body
                 nonce:(nonnull NSString*)nonce
                 offlineSignatureResolver:(RCTPromiseResolveBlock)resolve
                 offlineSignatureReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    NSError* error = nil;
    NSString* signature = [powerAuth offlineSignatureWithAuthentication:auth uriId:uriId body:[RCTConvert NSData:body] nonce:nonce error:&error];
    
    if (error) {
        reject([self getErrorCodeFromError:error], error.localizedDescription, error);
    } else {
        resolve(signature);
    }
    PA_BLOCK_END
}

RCT_REMAP_METHOD(verifyServerSignedData,
                 instanceId:(NSString*)instanceId
                 data:(nonnull NSString*)data
                 signature:(nonnull NSString*)signature
                 masterKey:(BOOL)masterKey
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    BOOL result = [powerAuth verifyServerSignedData:[RCTConvert NSData:data] signature:signature masterKey:masterKey];
    resolve([[NSNumber alloc] initWithBool:result]);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(unsafeChangePassword,
                 instanceId:(NSString*)instanceId
                 oldPassword:(nonnull NSString*)oldPassword
                 to:(nonnull NSString*)newPassword
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    BOOL result = [powerAuth unsafeChangePasswordFrom:oldPassword to:newPassword];
    resolve([[NSNumber alloc] initWithBool:result]);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(changePassword,
                 instanceId:(NSString*)instanceId
                 oldPassword:(nonnull NSString*)oldPassword
                 to:(nonnull NSString*)newPassword
                 changePasswordResolve:(RCTPromiseResolveBlock)resolve
                 changePasswordReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    [powerAuth changePasswordFrom:oldPassword to:newPassword callback:^(NSError * error) {
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(@YES);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(addBiometryFactor,
                 instanceId:(NSString*)instanceId
                 password:(NSString*)password
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    [powerAuth addBiometryFactor:password callback:^(NSError * error) {
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(@YES);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(hasBiometryFactor,
                 instanceId:(NSString*)instanceId
                 hasBiometryFactorResolve:(RCTPromiseResolveBlock)resolve
                 hasBiometryFactorReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    resolve([[NSNumber alloc] initWithBool:[powerAuth hasBiometryFactor]]);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(removeBiometryFactor,
                 instanceId:(NSString*)instanceId
                 removeBiometryFactorResolve:(RCTPromiseResolveBlock)resolve
                 removeBiometryFactorReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    resolve([[NSNumber alloc] initWithBool:[powerAuth removeBiometryFactor]]);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(getBiometryInfo,
                 instanceId:(NSString*)instanceId
                 getBiometryInfoResolve:(RCTPromiseResolveBlock)resolve
                 getBiometryInfoReject:(RCTPromiseRejectBlock)reject)
{
    NSString *biometryType;
    NSString *canAuthenticate;
    switch ([PA2Keychain biometricAuthenticationInfo].biometryType) {
        case PA2BiometricAuthenticationType_TouchID:
            biometryType = @"FINGERPRINT";
            break;
        case PA2BiometricAuthenticationType_FaceID:
            biometryType = @"FACE";
            break;
        case PA2BiometricAuthenticationType_None:
        default:
            biometryType = @"NONE";
            break;
    }
    switch ([PA2Keychain biometricAuthenticationInfo].currentStatus) {
        case PA2BiometricAuthenticationStatus_Available:
            canAuthenticate = @"OK";
            break;
        case PA2BiometricAuthenticationStatus_NotEnrolled:
            canAuthenticate = @"NOT_ENROLLED";
            break;
        case PA2BiometricAuthenticationStatus_NotAvailable:
            canAuthenticate = @"NOT_AVAILABLE";
            break;
        case PA2BiometricAuthenticationStatus_NotSupported:
            canAuthenticate = @"NOT_SUPPORTED";
            break;
        case PA2BiometricAuthenticationStatus_Lockout:
            canAuthenticate = @"LOCKOUT";
            break;
    }
    bool canUse = [PA2Keychain canUseBiometricAuthentication];
    NSDictionary *response = @{
        @"isAvailable": canUse ? @YES : @NO,
        @"biometryType": biometryType,
        @"canAuthenticate": canAuthenticate
    };
    resolve(response);
}

RCT_REMAP_METHOD(fetchEncryptionKey,
                 instanceId:(NSString*)instanceId
                 authentication:(NSDictionary*)authDict
                 index:(NSInteger)index
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [powerAuth fetchEncryptionKey:auth index:index  callback:^(NSData * encryptionKey, NSError * error) {
        if (encryptionKey) {
            resolve([encryptionKey base64EncodedStringWithOptions:NSDataBase64EncodingEndLineWithLineFeed]);
        } else {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(signDataWithDevicePrivateKey,
                 instanceId:(NSString*)instanceId
                 authentication:(NSDictionary*)authDict
                 data:(NSString*)data
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [powerAuth signDataWithDevicePrivateKey:auth data:[RCTConvert NSData:data] callback:^(NSData * signature, NSError * error) {
        if (signature) {
            resolve([RCTConvert NSString:signature]);
        } else {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(validatePassword,
                 instanceId:(NSString*)instanceId
                 password:(NSString*)password
                 validatePasswordResolve:(RCTPromiseResolveBlock)resolve
                 validatePasswordReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    [powerAuth validatePasswordCorrect:password callback:^(NSError * error) {
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(@YES);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(hasActivationRecoveryData,
                 instanceId:(NSString*)instanceId
                 hasActivationRecoveryDataResolve:(RCTPromiseResolveBlock)resolve
                 hasActivationRecoveryDataReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    resolve([[NSNumber alloc] initWithBool:[powerAuth hasActivationRecoveryData]]);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(activationRecoveryData,
                 instanceId:(NSString*)instanceId
                 authentication:(NSDictionary*)authDict
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [powerAuth activationRecoveryData:auth callback:^(PA2ActivationRecoveryData * data, NSError * error) {
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
    PA_BLOCK_END
}

RCT_REMAP_METHOD(confirmRecoveryCode,
                 instanceId:(NSString*)instanceId
                 recoveryCode:(NSString*)recoveryCode
                 authentication:(NSDictionary*)authDict
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [powerAuth confirmRecoveryCode:recoveryCode authentication:auth callback:^(BOOL alreadyConfirmed, NSError * error) {
        if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(alreadyConfirmed ? @YES : @NO);
        }
    }];
    PA_BLOCK_END
}



RCT_REMAP_METHOD(authenticateWithBiometry,
                 instanceId:(NSString*)instanceId
                 title:(nonnull NSString*)title // title is here only for API compatibility with android
                 message:(nonnull NSString*)message
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    [powerAuth authenticateUsingBiometryWithPrompt:message callback:^(PowerAuthAuthentication * authentication, NSError * error) {
        if (authentication) {
            resolve([authentication.overridenBiometryKey base64EncodedStringWithOptions:NSDataBase64EncodingEndLineWithLineFeed]);
        } else {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(parseActivationCode,
                 activationCode:(NSString*)activationCode
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA2Otp *otp = [PA2OtpUtil parseFromActivationCode:activationCode];
    if (otp) {
        resolve(@{
            @"activationCode": otp.activationCode,
            @"activationSignature": otp.activationSignature ? otp.activationSignature : [NSNull null]
        });
    } else {
        reject(@"PA2RNInvalidActivationCode", @"Invalid activation code.", nil);
    }
}

RCT_REMAP_METHOD(validateActivationCode,
                 activationCode:(NSString*)activationCode
                 validateActivationCodeResolve:(RCTPromiseResolveBlock)resolve
                 validateActivationCodeReject:(RCTPromiseRejectBlock)reject)
{
    resolve([PA2OtpUtil validateActivationCode:activationCode] ? @YES : @NO);
}

RCT_REMAP_METHOD(parseRecoveryCode,
                 recoveryCode:(NSString*)recoveryCode
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA2Otp *otp = [PA2OtpUtil parseFromRecoveryCode:recoveryCode];
    if (otp) {
        resolve(@{
            @"activationCode": otp.activationCode,
            @"activationSignature": otp.activationSignature ? otp.activationSignature : [NSNull null]
        });
    } else {
        reject(@"PA2RNInvalidRecoveryCode", @"Invalid recovery code.", nil);
    }
}

RCT_REMAP_METHOD(validateRecoveryCode,
                 recoveryCode:(NSString*)recoveryCode
                 validateRecoveryCodeResolve:(RCTPromiseResolveBlock)resolve
                 validateRecoveryCodeReject:(RCTPromiseRejectBlock)reject)
{
    resolve([PA2OtpUtil validateRecoveryCode:recoveryCode] ? @YES : @NO);
}

RCT_REMAP_METHOD(validateRecoveryPuk,
                 recoveryPuk:(NSString*)recoveryPuk
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    resolve([PA2OtpUtil validateRecoveryPuk:recoveryPuk] ? @YES : @NO);
}

RCT_REMAP_METHOD(validateTypedCharacter,
                 utfCodepoint:(nonnull NSNumber*)utfCodepoint
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    resolve([PA2OtpUtil validateTypedCharacter:utfCodepoint.unsignedIntValue] ? @YES : @NO);
}

RCT_REMAP_METHOD(correctTypedCharacter,
                 utfCodepoint:(nonnull NSNumber*)utfCodepoint
                 correctTypedCharacterResolve:(RCTPromiseResolveBlock)resolve
                 correctTypedCharacterReject:(RCTPromiseRejectBlock)reject)
{
    UInt32 corrected = [PA2OtpUtil validateAndCorrectTypedCharacter:utfCodepoint.unsignedIntValue];
    if (corrected == 0) {
        reject(@"PA2RNInvalidCharacter", @"Invalid character cannot be corrected.", nil);
    } else {
        resolve([[NSNumber alloc] initWithInt:corrected]);
    }
}

RCT_REMAP_METHOD(requestAccessToken,
                 instanceId:(NSString*)instanceId
                 tokenName:(nonnull NSString*)tokenName
                 authentication:(NSDictionary*)authDict
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict];
    [[powerAuth tokenStore] requestAccessTokenWithName:tokenName authentication:auth completion:^(PowerAuthToken * token, NSError * error) {
        if (error || token == nil) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            resolve(@{
                @"isValid": token.isValid ? @YES : @NO,
                @"canGenerateHeader": token.canGenerateHeader ? @YES : @NO,
                @"tokenName": token.tokenName,
                @"tokenIdentifier": token.tokenIdentifier
            });
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(removeAccessToken,
                 instanceId:(NSString*)instanceId
                 tokenName:(nonnull NSString*)tokenName
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    [[powerAuth tokenStore] removeAccessTokenWithName:tokenName completion:^(BOOL removed, NSError * error) {
        if (removed) {
            resolve([NSNull null]);
        } else if (error) {
            reject([self getErrorCodeFromError:error], error.localizedDescription, error);
        } else {
            reject(@"PA2ReactNativeError", @"Unknown error", nil);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(hasLocalToken,
                 instanceId:(NSString*)instanceId
                 tokenName:(nonnull NSString*)tokenName
                 hasLocalTokenResolve:(RCTPromiseResolveBlock)resolve
                 hasLocalTokenReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    resolve([[powerAuth tokenStore] hasLocalTokenWithName:tokenName] ? @YES : @NO);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(getLocalToken,
                 instanceId:(NSString*)instanceId
                 tokenName:(nonnull NSString*)tokenName
                 getLocalTokenResolve:(RCTPromiseResolveBlock)resolve
                 getLocalTokenRseject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthToken* token = [[powerAuth tokenStore] localTokenWithName:tokenName];
    if (token) {
        resolve(@{
            @"isValid": token.isValid ? @YES : @NO,
            @"canGenerateHeader": token.canGenerateHeader ? @YES : @NO,
            @"tokenName": token.tokenName,
            @"tokenIdentifier": token.tokenIdentifier
        });
    } else {
        reject(@"PA2RNLocalTokenNotAvailable", @"Token with this name is not in the local store.", nil);
    }
    PA_BLOCK_END
}

RCT_REMAP_METHOD(removeLocalToken,
                 instanceId:(NSString*)instanceId
                 tokenName:(nonnull NSString*)tokenName
                 removeLocalTokenResolve:(RCTPromiseResolveBlock)resolve
                 removeLocalTokenReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    [[powerAuth tokenStore] removeLocalTokenWithName:tokenName];
    resolve([NSNull null]);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(removeAllLocalTokens,
                 instanceId:(NSString*)instanceId
                 removeAllLocalTokensResolve:(RCTPromiseResolveBlock)resolve
                 removeAllLocalTokensReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    [[powerAuth tokenStore] removeAllLocalTokens];
    resolve([NSNull null]);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(generateHeaderForToken,
                 instanceId:(NSString*)instanceId
                 tokenName:(nonnull NSString*)tokenName
                 generateHeaderForTokenResolve:(RCTPromiseResolveBlock)resolve
                 generateHeaderForTokenReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthToken* token = [[powerAuth tokenStore] localTokenWithName:tokenName];
    if (token == nil) {
        reject(@"PA2RNTokenNotAvailable", @"This token is no longer available in the local store.", nil);
    }
    else if ([token canGenerateHeader]) {
        PA2AuthorizationHttpHeader* header = [token generateHeader];
        if (header) {
            resolve(@{
                @"key": header.key,
                @"value": header.value
            });
        } else {
            reject(@"PA2RNCannotGenerateHeader", @"Cannot generate header for this token.", nil);
        }
    } else {
        reject(@"PA2RNCannotGenerateHeader", @"Cannot generate header for this token.", nil);
    }
    PA_BLOCK_END
}

#pragma mark HELPER METHODS

- (void)usePowerAuth:(NSString *)instanceId
              reject:(RCTPromiseRejectBlock)reject
            callback:(void(^)(PowerAuthSDK *sdk))callback
{
    PowerAuthSDK* sdk = [self powerAuthForInstanceId:instanceId];
    if (sdk) {
        callback(sdk);
    } else {
        reject(@"PA2RNInstanceNotConfigured", @"This instance is not configured.", nil);
    }
}

- (PowerAuthSDK *)powerAuthForInstanceId:(NSString *)instanceId
{
    return [_instances objectForKey:instanceId];
}

- (PowerAuthAuthentication *)constructAuthenticationFromDictionary:(NSDictionary*)dict
{
    PowerAuthAuthentication *auth = [[PowerAuthAuthentication alloc] init];
    auth.usePossession = [RCTConvert BOOL:dict[@"usePossession"]];
    auth.useBiometry = [RCTConvert BOOL:dict[@"useBiometry"]];
    if (dict[@"userPassword"] != [NSNull null]) {
        auth.usePassword = [RCTConvert NSString:dict[@"userPassword"]];
    }
    if (dict[@"biometryMessage"] != [NSNull null]) {
        auth.biometryPrompt = [RCTConvert NSString:dict[@"biometryMessage"]];
    }
    if ([dict.allKeys containsObject:@"biometryKey"] && dict[@"biometryKey"] != [NSNull null]) {
        auth.overridenBiometryKey = [[NSData alloc] initWithBase64EncodedString:[RCTConvert NSString:dict[@"biometryKey"]] options:NSDataBase64DecodingIgnoreUnknownCharacters];
    }
    return auth;
}

#define ENUM_CASE_TO_STR(x, enumValue) if (x == enumValue) return @#enumValue;

- (NSString*)getErrorCodeFromError:(NSError*)paError
{
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

- (NSString*)getStatusCode:(PA2ActivationState)status
{
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
