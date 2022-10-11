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
#import <PowerAuth2/PowerAuthErrorConstants.h>
#import <PowerAuth2/PowerAuthKeychain.h>
#import <PowerAuth2/PowerAuthClientSslNoValidationStrategy.h>
#import <PowerAuth2/PowerAuthRestApiErrorResponse.h>

/**
 Cast object to desired class, or return nil if object is different kind of class.
 */
static inline id _CastObjectTo(id instance, Class desiredClass) {
    if ([instance isKindOfClass:desiredClass]) {
        return instance;
    }
    return nil;
}
/**
 Macro to cast object to desired class, or return nil if object is different kind of class.
 */
#define CAST_TO(object, requiredClass) ((requiredClass*)(_CastObjectTo(object, [requiredClass class])))


@implementation PowerAuth
{
    id<NSLocking> _mutex;
    NSMutableDictionary<NSString*, PowerAuthSDK*>* _sdkInstances;
}

#define PA_BLOCK_START [self usePowerAuth:instanceId reject:reject callback:^(PowerAuthSDK * powerAuth) {
#define PA_BLOCK_END }];

- (instancetype)init
{
    self = [super init];
    if (self) {
        _mutex = [[NSLock alloc] init];
        _sdkInstances = [[NSMutableDictionary alloc] init];
    }
    return self;
}

RCT_EXPORT_MODULE(PowerAuth);

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

#pragma mark - React methods

RCT_REMAP_METHOD(isConfigured,
                 instanceId:(NSString *)instanceId
                 isConfiguredResolve:(RCTPromiseResolveBlock)resolve
                 isConfiguredReject:(RCTPromiseRejectBlock)reject)
{
    resolve(@([self powerAuthForInstanceId:instanceId] != nil));
}

RCT_REMAP_METHOD(configure,
                 instanceId:(NSString*)instanceId
                 configuration:(NSDictionary*)configuration
                 clientConfiguration:(NSDictionary*)clientConfiguration
                 biometryConfiguration:(NSDictionary*)biometryConfiguration
                 keychainConfiguration:(NSDictionary*)keychainConfiguration
                 configureResolve:(RCTPromiseResolveBlock)resolve
                 configureReject:(RCTPromiseRejectBlock)reject)
{
    if (instanceId.length == 0) {
        reject(@"WRONG_PARAMETER", @"Instance identifier is missing or empty string", nil);
        return;
    }
    
    // Instance config
    PowerAuthConfiguration *config = [[PowerAuthConfiguration alloc] init];
    config.instanceId = instanceId;
    config.appKey = CAST_TO(configuration[@"applicationKey"], NSString);
    config.appSecret = CAST_TO(configuration[@"applicationSecret"], NSString);
    config.masterServerPublicKey = CAST_TO(configuration[@"masterServerPublicKey"], NSString);
    config.baseEndpointUrl = CAST_TO(configuration[@"baseEndpointUrl"], NSString);
    
    if (![config validateConfiguration]) {
        reject(@"WRONG_PARAMETER", @"Provided configuration is invalid", nil);
        return;
    }

    // HTTP client config
    PowerAuthClientConfiguration * clientConfig = [[PowerAuthClientConfiguration sharedInstance] copy];
    clientConfig.defaultRequestTimeout = CAST_TO(clientConfiguration[@"connectionTimeout"], NSNumber).doubleValue;
    if (CAST_TO(clientConfiguration[@"enableUnsecureTraffic"], NSNumber).boolValue) {
        [clientConfig setSslValidationStrategy:[[PowerAuthClientSslNoValidationStrategy alloc] init]];
    }
    
    PowerAuthKeychainConfiguration * keychainConfig = [[PowerAuthKeychainConfiguration sharedInstance] copy];
    // Keychain specific
    keychainConfig.keychainAttribute_AccessGroup = CAST_TO(keychainConfiguration[@"accessGroupName"], NSString);
    keychainConfig.keychainAttribute_UserDefaultsSuiteName = CAST_TO(keychainConfiguration[@"userDefaultsSuiteName"], NSString);
    // Biometry
    keychainConfig.linkBiometricItemsToCurrentSet = CAST_TO(biometryConfiguration[@"linkItemsToCurrentSet"], NSNumber).boolValue;
    keychainConfig.allowBiometricAuthenticationFallbackToDevicePasscode = CAST_TO(biometryConfiguration[@"fallbackToDevicePasscode"], NSNumber).boolValue;

    // Now register the instance in the thread safe manner.
    BOOL registered = [self registerPowerAuthForInstanceId:instanceId instanceProvider:^PowerAuthSDK * _Nonnull {
        return [[PowerAuthSDK alloc] initWithConfiguration:config keychainConfiguration:keychainConfig clientConfiguration:clientConfig];
    }];
    
    if (registered) {
        // Resolve success
        resolve(@YES);
    } else {
        // Instance is already configured
        reject(@"REACT_NATIVE_ERROR", @"PowerAuth object with this instanceId is already configured.", nil);
    }
}

RCT_REMAP_METHOD(deconfigure,
                 instanceId:(NSString*)instanceId
                 deconfigureResolve:(RCTPromiseResolveBlock)resolve
                 deconfigureReject:(RCTPromiseRejectBlock)reject)
{
    [self unregisterPowerAuthForInstanceId:instanceId];
    resolve(@YES);
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
    [powerAuth getActivationStatusWithCallback:^(PowerAuthActivationStatus * _Nullable status, NSError * _Nullable error) {
        if (error == nil) {
            NSDictionary *response = @{
                @"state": [self getStatusCode:status.state],
                @"failCount": [[NSNumber alloc] initWithUnsignedInt:status.failCount],
                @"maxFailCount": [[NSNumber alloc] initWithUnsignedInt:status.maxFailCount],
                @"remainingAttempts": [[NSNumber alloc] initWithUnsignedInt:status.remainingAttempts]
            };
            resolve(response);
        } else {
            [self processError:error with:reject];
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
        paActivation = [PowerAuthActivation activationWithActivationCode:activationCode name:name error:nil];
    } else if (recoveryCode && recoveryPuk) {
        paActivation = [PowerAuthActivation activationWithRecoveryCode:recoveryCode recoveryPuk:recoveryPuk name:name error:nil];
    } else if (identityAttributes) {
        paActivation = [PowerAuthActivation activationWithIdentityAttributes:identityAttributes name:name error:nil];
    }
    
    if (!paActivation) {
        reject(@"INVALID_ACTIVATION_OBJECT", @"Activation object is invalid.", nil);
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
    
    [powerAuth createActivation:paActivation callback:^(PowerAuthActivationResult * _Nullable result, NSError * _Nullable error) {
        if (error == nil) {
            resolve(_PatchNull(@{
                @"activationFingerprint": result.activationFingerprint,
                @"activationRecovery": result.activationRecovery ? @{
                    @"recoveryCode": result.activationRecovery.recoveryCode,
                    @"puk": result.activationRecovery.puk
                } : [NSNull null],
                @"customAttributes": result.customAttributes ? result.customAttributes : [NSNull null]
            }));
        } else {
            [self processError:error with:reject];
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict forCommit:YES];
    
    NSError* error = nil;
    bool success = [powerAuth commitActivationWithAuthentication:auth error:&error];
    
    if (success) {
        resolve(@YES);
    } else {
        [self processError:error with:reject];
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict forCommit:NO];
    [powerAuth removeActivationWithAuthentication:auth callback:^(NSError * _Nullable error) {
        if (error) {
            [self processError:error with:reject];
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
    resolve(nil);
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict forCommit:NO];
    NSError* error = nil;
    PowerAuthAuthorizationHttpHeader* signature = [powerAuth requestGetSignatureWithAuthentication:auth uriId:uriId params:params error: &error];
    
    if (error) {
        [self processError:error with:reject];
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict forCommit:NO];
    
    NSError* error = nil;
    PowerAuthAuthorizationHttpHeader* signature = [powerAuth requestSignatureWithAuthentication:auth method:method uriId:uriId body:[RCTConvert NSData:body] error:&error];
    
    if (error) {
        [self processError:error with:reject];
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict forCommit:NO];
    NSError* error = nil;
    NSString* signature = [powerAuth offlineSignatureWithAuthentication:auth uriId:uriId body:[RCTConvert NSData:body] nonce:nonce error:&error];
    
    if (error) {
        [self processError:error with:reject];
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
            [self processError:error with:reject];
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
            [self processError:error with:reject];
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
    switch ([PowerAuthKeychain biometricAuthenticationInfo].biometryType) {
        case PowerAuthBiometricAuthenticationType_TouchID:
            biometryType = @"FINGERPRINT";
            break;
        case PowerAuthBiometricAuthenticationType_FaceID:
            biometryType = @"FACE";
            break;
        case PowerAuthBiometricAuthenticationType_None:
        default:
            biometryType = @"NONE";
            break;
    }
    switch ([PowerAuthKeychain biometricAuthenticationInfo].currentStatus) {
        case PowerAuthBiometricAuthenticationStatus_Available:
            canAuthenticate = @"OK";
            break;
        case PowerAuthBiometricAuthenticationStatus_NotEnrolled:
            canAuthenticate = @"NOT_ENROLLED";
            break;
        case PowerAuthBiometricAuthenticationStatus_NotAvailable:
            canAuthenticate = @"NOT_AVAILABLE";
            break;
        case PowerAuthBiometricAuthenticationStatus_NotSupported:
            canAuthenticate = @"NOT_SUPPORTED";
            break;
        case PowerAuthBiometricAuthenticationStatus_Lockout:
            canAuthenticate = @"LOCKOUT";
            break;
    }
    bool canUse = [PowerAuthKeychain canUseBiometricAuthentication];
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict forCommit:NO];
    [powerAuth fetchEncryptionKey:auth index:index  callback:^(NSData * encryptionKey, NSError * error) {
        if (encryptionKey) {
            resolve([encryptionKey base64EncodedStringWithOptions:NSDataBase64EncodingEndLineWithLineFeed]);
        } else {
            [self processError:error with:reject];
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict forCommit:NO];
    [powerAuth signDataWithDevicePrivateKey:auth data:[RCTConvert NSData:data] callback:^(NSData * signature, NSError * error) {
        if (signature) {
            resolve([RCTConvert NSString:[signature base64EncodedStringWithOptions:0]]);
        } else {
            [self processError:error with:reject];
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
            [self processError:error with:reject];
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict forCommit:NO];
    [powerAuth activationRecoveryData:auth callback:^(PowerAuthActivationRecoveryData * data, NSError * error) {
        if (error) {
            [self processError:error with:reject];
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict forCommit:NO];
    [powerAuth confirmRecoveryCode:recoveryCode authentication:auth callback:^(BOOL alreadyConfirmed, NSError * error) {
        if (error) {
            [self processError:error with:reject];
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
            [self processError:error with:reject];
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(parseActivationCode,
                 activationCode:(NSString*)activationCode
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PowerAuthActivationCode *ac = [PowerAuthActivationCodeUtil parseFromActivationCode:activationCode];
    if (ac) {
        resolve(_PatchNull(@{
            @"activationCode": ac.activationCode,
            @"activationSignature": ac.activationSignature ? ac.activationSignature : [NSNull null]
        }));
    } else {
        reject(@"INVALID_ACTIVATION_CODE", @"Invalid activation code.", nil);
    }
}

RCT_REMAP_METHOD(validateActivationCode,
                 activationCode:(NSString*)activationCode
                 validateActivationCodeResolve:(RCTPromiseResolveBlock)resolve
                 validateActivationCodeReject:(RCTPromiseRejectBlock)reject)
{
    resolve([PowerAuthActivationCodeUtil validateActivationCode:activationCode] ? @YES : @NO);
}

RCT_REMAP_METHOD(parseRecoveryCode,
                 recoveryCode:(NSString*)recoveryCode
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PowerAuthActivationCode *ac = [PowerAuthActivationCodeUtil parseFromRecoveryCode:recoveryCode];
    if (ac) {
        resolve(_PatchNull(@{
            @"activationCode": ac.activationCode,
            @"activationSignature": ac.activationSignature ? ac.activationSignature : [NSNull null]
        }));
    } else {
        reject(@"INVALID_RECOVERY_CODE", @"Invalid recovery code.", nil);
    }
}

RCT_REMAP_METHOD(validateRecoveryCode,
                 recoveryCode:(NSString*)recoveryCode
                 validateRecoveryCodeResolve:(RCTPromiseResolveBlock)resolve
                 validateRecoveryCodeReject:(RCTPromiseRejectBlock)reject)
{
    resolve([PowerAuthActivationCodeUtil validateRecoveryCode:recoveryCode] ? @YES : @NO);
}

RCT_REMAP_METHOD(validateRecoveryPuk,
                 recoveryPuk:(NSString*)recoveryPuk
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    resolve([PowerAuthActivationCodeUtil validateRecoveryPuk:recoveryPuk] ? @YES : @NO);
}

RCT_REMAP_METHOD(validateTypedCharacter,
                 utfCodepoint:(nonnull NSNumber*)utfCodepoint
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    resolve([PowerAuthActivationCodeUtil validateTypedCharacter:utfCodepoint.unsignedIntValue] ? @YES : @NO);
}

RCT_REMAP_METHOD(correctTypedCharacter,
                 utfCodepoint:(nonnull NSNumber*)utfCodepoint
                 correctTypedCharacterResolve:(RCTPromiseResolveBlock)resolve
                 correctTypedCharacterReject:(RCTPromiseRejectBlock)reject)
{
    UInt32 corrected = [PowerAuthActivationCodeUtil validateAndCorrectTypedCharacter:utfCodepoint.unsignedIntValue];
    if (corrected == 0) {
        reject(@"INVALID_CHARACTER", @"Invalid character cannot be corrected.", nil);
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict forCommit:NO];
    [[powerAuth tokenStore] requestAccessTokenWithName:tokenName authentication:auth completion:^(PowerAuthToken * token, NSError * error) {
        if (error || token == nil) {
            [self processError:error with:reject];
        } else {
            resolve(@{
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
            resolve(nil);
        } else {
            [self processError:error with:reject];
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
            @"tokenName": token.tokenName,
            @"tokenIdentifier": token.tokenIdentifier
        });
    } else {
        reject(@"LOCAL_TOKEN_NOT_AVAILABLE", @"Token with this name is not in the local store.", nil);
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
    resolve(nil);
    PA_BLOCK_END
}

RCT_REMAP_METHOD(removeAllLocalTokens,
                 instanceId:(NSString*)instanceId
                 removeAllLocalTokensResolve:(RCTPromiseResolveBlock)resolve
                 removeAllLocalTokensReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    [[powerAuth tokenStore] removeAllLocalTokens];
    resolve(nil);
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
        reject(@"LOCAL_TOKEN_NOT_AVAILABLE", @"This token is no longer available in the local store.", nil);
    }
    else if ([token canGenerateHeader]) {
        PowerAuthAuthorizationHttpHeader* header = [token generateHeader];
        if (header) {
            resolve(@{
                @"key": header.key,
                @"value": header.value
            });
        } else {
            reject(@"CANNOT_GENERATE_TOKEN", @"Cannot generate header for this token.", nil);
        }
    } else {
        reject(@"CANNOT_GENERATE_TOKEN", @"Cannot generate header for this token.", nil);
    }
    PA_BLOCK_END
}


#pragma mark - Instances register

/// Method gets PowerAuthSDK instance with given identifier.
/// @param instanceId PowerAuthSDK instance or nil if there's no such instance with required identifier.
- (PowerAuthSDK*) powerAuthForInstanceId:(NSString *)instanceId
{
    [_mutex lock];
    PowerAuthSDK * sdk = [_sdkInstances objectForKey:instanceId];
    [_mutex unlock];
    return sdk;
}

/// Method registers PowerAuthSDK instance for given identifier. The SDK instnace must be provided by instanceProvider block.
/// @param instanceId Instance identifier.
/// @param instanceProvider Block to construct valid PowerAuthSDK instance.
- (BOOL) registerPowerAuthForInstanceId:(nonnull NSString*)instanceId
                       instanceProvider:(PowerAuthSDK * _Nonnull (^ _Nonnull)(void))instanceProvider
{
    [_mutex lock];
    BOOL registered;
    if (_sdkInstances[instanceId] == nil) {
        _sdkInstances[instanceId] = instanceProvider();
        registered = YES;
    } else {
        registered = NO;
    }
    [_mutex unlock];
    return registered;
}

/// Method unregister PowerAuthSDK instnace with given identifier. If there's no such object, then does nothing,
/// @param instanceId Instance identifier.
- (void) unregisterPowerAuthForInstanceId:(NSString*)instanceId
{
    [_mutex lock];
    [_sdkInstances removeObjectForKey:instanceId];
    [_mutex unlock];
}


#pragma mark - Helper methods

/**
 Patch nulls in object to undefined (e.g. remove keys with nulls)
 */
static id _PatchNull(id object) {
    if (object == [NSNull null]) {
        return nil;
    }
    if ([object isKindOfClass:[NSDictionary class]]) {
        // Key-value dictionary
        NSMutableDictionary * newObject = [object mutableCopy];
        [(NSDictionary*)object enumerateKeysAndObjectsUsingBlock:^(id key, id value, BOOL * stop) {
            newObject[key] = _PatchNull(value);
        }];
        return newObject;
    }
    return object;
}

/// Method gets PowerAuthSDK instance from instance register and call `callback` with given object.
/// In case that there's no such instnace, or instanceId is invalid, then calls reject promise with a failure.
/// @param instanceId Instance identifier.
/// @param reject Reject promise block.
/// @param callback Callback to call with a valid PowerAuthSDK instance.
- (void) usePowerAuth:(NSString *)instanceId
               reject:(RCTPromiseRejectBlock)reject
             callback:(void(^)(PowerAuthSDK *sdk))callback
{
    if (instanceId.length != 0) {
        PowerAuthSDK* sdk = [self powerAuthForInstanceId:instanceId];
        if (sdk) {
            callback(sdk);
        } else {
            reject(@"INSTANCE_NOT_CONFIGURED", @"This instance is not configured.", nil);
        }
    } else {
        reject(@"WRONG_PARAMETER", @"Instance identifier is missing or empty string", nil);
    }
}

/// Extract NSString value from dictionary containing encoded JS object.
/// @param dict Dictionary containing JS object.
/// @param key Key for value to extract from the dictionary.
/// @return String extracted from the dictionary.
static NSString * _GetNSStringValueFromDict(NSDictionary * dict, NSString * key)
{
    id value = dict[key];
    if (value == nil || value == [NSNull null]) {
        return nil;
    }
    return [RCTConvert NSString:value];
}

/// Extract NSData value from dictionary containing encoded JS object. The dictionary must contain
/// Base64 encoded string for the provided key.
/// @param dict Dictionary containing JS object.
/// @param key Key for value to extract from the dictionary.
/// @return NSData extracted from the dictionary.
static NSData * _GetNSDataValueFromDict(NSDictionary * dict, NSString * key)
{
    NSString * encodedData = _GetNSStringValueFromDict(dict, key);
    if (encodedData) {
        return [[NSData alloc] initWithBase64EncodedString:encodedData options:NSDataBase64DecodingIgnoreUnknownCharacters];
    }
    return nil;
}

/// Translate dictionary into `PowerAuthAuthentication` object.
/// @param dict Dictionary with authentication data.
/// @param commit Set YES if authentication is required for activation commit.
- (PowerAuthAuthentication*) constructAuthenticationFromDictionary:(NSDictionary*)dict
                                                         forCommit:(BOOL)commit
{
    BOOL useBiometry = [RCTConvert BOOL:dict[@"useBiometry"]];
    NSString * password = _GetNSStringValueFromDict(dict, @"userPassword");
    if (commit) {
        // Activation commit
        if (useBiometry) {
            // All factors needs to be estabilished in activation.
            return [PowerAuthAuthentication commitWithPasswordAndBiometry:password];
        } else {
            return [PowerAuthAuthentication commitWithPassword:password];
        }
    } else {
        // Data signing
        if (password) {
            return [PowerAuthAuthentication possessionWithPassword:password];
        } else if (useBiometry) {
            NSData * biometryKey = _GetNSDataValueFromDict(dict, @"biometryKey");
            if (biometryKey) {
                return [PowerAuthAuthentication possessionWithBiometryWithCustomBiometryKey:biometryKey customPossessionKey:nil];
            }
            NSString * biometryPrompt = _GetNSStringValueFromDict(dict, @"biometryMessage");
            if (biometryPrompt) {
                return [PowerAuthAuthentication possessionWithBiometryPrompt:biometryPrompt];
            } else {
                return [PowerAuthAuthentication possessionWithBiometry];
            }
        } else {
            return [PowerAuthAuthentication possession];
        }
    }
}

/// Method translates `PowerAuthActivationState` into string representation.
/// @param status State to translate.
- (NSString*) getStatusCode:(PowerAuthActivationState)status
{
    switch (status) {
        case PowerAuthActivationState_Created: return @"CREATED";
        case PowerAuthActivationState_PendingCommit: return @"PENDING_COMMIT";
        case PowerAuthActivationState_Active: return @"ACTIVE";
        case PowerAuthActivationState_Blocked: return @"BLOCKED";
        case PowerAuthActivationState_Removed: return @"REMOVED";
        case PowerAuthActivationState_Deadlock: return @"DEADLOCK";
        default: return [[NSString alloc] initWithFormat:@"STATE_UNKNOWN_%li", status];
    }
}

#pragma mark - Error handling

/// Translates PowerAuthErrorCode into string representation.
/// @param code Error code to convert.
static NSString * _TranslatePAErrorCode(PowerAuthErrorCode code)
{
    switch (code) {
        case PowerAuthErrorCode_NetworkError: return @"NETWORK_ERROR";
        case PowerAuthErrorCode_SignatureError: return @"SIGNATURE_ERROR";
        case PowerAuthErrorCode_InvalidActivationState: return @"INVALID_ACTIVATION_STATE";
        case PowerAuthErrorCode_InvalidActivationData: return @"INVALID_ACTIVATION_DATA";
        case PowerAuthErrorCode_MissingActivation: return @"MISSING_ACTIVATION";
        case PowerAuthErrorCode_ActivationPending: return @"PENDING_ACTIVATION";
        case PowerAuthErrorCode_BiometryCancel: return @"BIOMETRY_CANCEL";
        case PowerAuthErrorCode_OperationCancelled: return @"OPERATION_CANCELED";
        case PowerAuthErrorCode_InvalidActivationCode: return @"INVALID_ACTIVATION_CODE";
        case PowerAuthErrorCode_InvalidToken: return @"INVALID_TOKEN";
        case PowerAuthErrorCode_Encryption: return @"ENCRYPTION_ERROR";
        case PowerAuthErrorCode_WrongParameter: return @"WRONG_PARAMETER";
        case PowerAuthErrorCode_ProtocolUpgrade: return @"PROTOCOL_UPGRADE";
        case PowerAuthErrorCode_PendingProtocolUpgrade: return @"PENDING_PROTOCOL_UPGRADE";
        case PowerAuthErrorCode_BiometryNotAvailable: return @"BIOMETRY_NOT_AVAILABLE";
        case PowerAuthErrorCode_WatchConnectivity: return @"WATCH_CONNECTIVITY";
        case PowerAuthErrorCode_BiometryFailed: return @"BIOMETRY_FAILED";
        default: return [[NSString alloc] initWithFormat:@"UNKNOWN_%li", code];
    }
}

/// Method translate reported NSError into proper React Native error code and reports everything back promise reject block.
/// @param error Error to report.
/// @param reject Reject promise to call.
- (void) processError:(nullable NSError*)error with:(nonnull RCTPromiseRejectBlock)reject
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
                    errorCode = @"AUTHENTICATION_ERROR";
                    message = @"Unauthorized";
                } else {
                    errorCode = @"RESPONSE_ERROR";
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
                errorCode = _TranslatePAErrorCode(paErrorCode);
                //
            }
        } else if ([error.domain isEqualToString:NSURLErrorDomain]) {
            // Handle error from NSURLSession
            errorCode = @"NETWORK_ERROR";
            //
        } else {
            // We don't know this domain, so translate result as an UNKNOWN_ERROR
            errorCode = @"UNKNOWN_ERROR";
            //
        }
    } else {
        // Error object is nil
        errorCode = @"UNKNOWN_ERROR";
        message = @"Native code failed with unspecified error";
    }
    
    // Finally call promise's reject
    reject(errorCode, message, error);
}

@end
