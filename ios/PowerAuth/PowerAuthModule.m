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

#import "PowerAuthModule.h"
#import "PowerAuthData.h"
#import "Constants.h"

#import "UIKit/UIKit.h"

#import <React/RCTConvert.h>

#import <PowerAuth2/PowerAuthSDK.h>
#import <PowerAuth2/PowerAuthErrorConstants.h>
#import <PowerAuth2/PowerAuthKeychain.h>
#import <PowerAuth2/PowerAuthClientSslNoValidationStrategy.h>

@import PowerAuthCore;

@implementation PowerAuthModule
{
    PowerAuthObjectRegister * _objectRegister;
}

@synthesize moduleRegistry = _moduleRegistry;

#define PA_BLOCK_START [self usePowerAuth:instanceId reject:reject callback:^(PowerAuthSDK * powerAuth) {
#define PA_BLOCK_END }];

RCT_EXPORT_MODULE(PowerAuth);

- (void) initialize
{
    // RCTInitializing protocol allows us to get module dependencies before the object is used from JS.
    _objectRegister = [_moduleRegistry moduleForName:"PowerAuthObjectRegister"];
}

+ (BOOL) requiresMainQueueSetup
{
    return NO;
}

#pragma mark - React methods
RCT_REMAP_METHOD(isConfigured,
                 instanceId:(NSString *)instanceId
                 isConfiguredResolve:(RCTPromiseResolveBlock)resolve
                 isConfiguredReject:(RCTPromiseRejectBlock)reject)
{
    if ([self validateInstanceId:instanceId reject:reject]) {
        resolve(@([_objectRegister findObjectWithId:instanceId expectedClass:[PowerAuthSDK class]] != nil));
    }
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
    if (![self validateInstanceId:instanceId reject:reject]) {
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
        reject(EC_WRONG_PARAMETER, @"Provided configuration is invalid", nil);
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
    BOOL registered = [_objectRegister registerObjectWithId:instanceId tag:instanceId policies:@[RP_MANUAL()] objectFactory:^id {
        return [[PowerAuthSDK alloc] initWithConfiguration:config keychainConfiguration:keychainConfig clientConfiguration:clientConfig];
    }];
    
    if (registered) {
        // Resolve success
        resolve(@YES);
    } else {
        // Instance is already configured
        reject(EC_REACT_NATIVE_ERROR, @"PowerAuth object with this instanceId is already configured.", nil);
    }
}

RCT_REMAP_METHOD(deconfigure,
                 instanceId:(NSString*)instanceId
                 deconfigureResolve:(RCTPromiseResolveBlock)resolve
                 deconfigureReject:(RCTPromiseRejectBlock)reject)
{
    if ([self validateInstanceId:instanceId reject:reject]) {
        [_objectRegister removeAllObjectsWithTag:instanceId];
        resolve(@YES);
    }
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
            ProcessError(error, reject);
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
        reject(EC_INVALID_ACTIVATION_OBJECT, @"Activation object is invalid.", nil);
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
            resolve(PatchNull(@{
                @"activationFingerprint": result.activationFingerprint,
                @"activationRecovery": result.activationRecovery ? @{
                    @"recoveryCode": result.activationRecovery.recoveryCode,
                    @"puk": result.activationRecovery.puk
                } : [NSNull null],
                @"customAttributes": result.customAttributes ? result.customAttributes : [NSNull null]
            }));
        } else {
            ProcessError(error, reject);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(commitActivation,
                 instanceId:(NSString*)instanceId
                 authentication:(NSDictionary*)authentication
                 commitActivationResolver:(RCTPromiseResolveBlock)resolve
                 commitActivationRejecter:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authentication reject:reject forCommit:YES];
    if (!auth) {
        return;
    }
    
    NSError* error = nil;
    bool success = [powerAuth commitActivationWithAuthentication:auth error:&error];
    
    if (success) {
        resolve(@YES);
    } else {
        ProcessError(error, reject);
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict reject:reject forCommit:NO];
    if (!auth) return;
    
    [powerAuth removeActivationWithAuthentication:auth callback:^(NSError * _Nullable error) {
        if (error) {
            ProcessError(error, reject);
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict reject:reject forCommit:NO];
    if (!auth) return;
    
    NSError* error = nil;
    PowerAuthAuthorizationHttpHeader* signature = [powerAuth requestGetSignatureWithAuthentication:auth uriId:uriId params:params error: &error];
    
    if (error) {
        ProcessError(error, reject);
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict reject:reject forCommit:NO];
    if (!auth) return;
    
    NSError* error = nil;
    PowerAuthAuthorizationHttpHeader* signature = [powerAuth requestSignatureWithAuthentication:auth method:method uriId:uriId body:[RCTConvert NSData:body] error:&error];
    
    if (error) {
        ProcessError(error, reject);
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict reject:reject forCommit:NO];
    if (!auth) return;
    
    NSError* error = nil;
    NSString* signature = [powerAuth offlineSignatureWithAuthentication:auth uriId:uriId body:[RCTConvert NSData:body] nonce:nonce error:&error];
    
    if (error) {
        ProcessError(error, reject);
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
    resolve(@(result));
    PA_BLOCK_END
}

RCT_REMAP_METHOD(unsafeChangePassword,
                 instanceId:(NSString*)instanceId
                 oldPassword:(id)oldPassword
                 to:(id)newPassword
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthCorePassword * coreOldPassword = UsePassword(oldPassword, _objectRegister, reject);
    if (!coreOldPassword) {
        return;
    }
    PowerAuthCorePassword * newCorePassword = UsePassword(newPassword, _objectRegister, reject);
    if (!newCorePassword) {
        return;
    }
    BOOL result = [powerAuth unsafeChangeCorePasswordFrom:coreOldPassword to:newCorePassword];
    resolve(@(result));
    PA_BLOCK_END
}

RCT_REMAP_METHOD(changePassword,
                 instanceId:(NSString*)instanceId
                 oldPassword:(id)oldPassword
                 to:(id)newPassword
                 changePasswordResolve:(RCTPromiseResolveBlock)resolve
                 changePasswordReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthCorePassword * coreOldPassword = UsePassword(oldPassword, _objectRegister, reject);
    if (!coreOldPassword) {
        return;
    }
    PowerAuthCorePassword * newCorePassword = UsePassword(newPassword, _objectRegister, reject);
    if (!newCorePassword) {
        return;
    }
    [powerAuth changeCorePasswordFrom:coreOldPassword to:newCorePassword callback:^(NSError * error) {
        if (error) {
            ProcessError(error, reject);
        } else {
            resolve(@YES);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(addBiometryFactor,
                 instanceId:(NSString*)instanceId
                 password:(id)password
                 prompt:(NSDictionary*)foo
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    // Workaround for native SDK. We're expectint MISSING or PEDNING_ACTIVATION
    // but native SDK prioritize biometry-related error in this situation.
    if (![powerAuth hasValidActivation]) {
        reject(EC_MISSING_ACTIVATION, nil, nil);
        return;
    }
    if ([powerAuth hasPendingActivation]) {
        reject(EC_PENDING_ACTIVATION, nil, nil);
        return;
    }
    PowerAuthCorePassword * corePassword = UsePassword(password, _objectRegister, reject);
    if (!corePassword) {
        return;
    }
    [powerAuth addBiometryFactorWithCorePassword:corePassword callback:^(NSError * error) {
        if (error) {
            ProcessError(error, reject);
        } else {
            resolve(nil);
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
    resolve(@([powerAuth hasBiometryFactor]));
    PA_BLOCK_END
}

RCT_REMAP_METHOD(removeBiometryFactor,
                 instanceId:(NSString*)instanceId
                 removeBiometryFactorResolve:(RCTPromiseResolveBlock)resolve
                 removeBiometryFactorReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    if ([powerAuth removeBiometryFactor]) {
        resolve(nil);
    } else {
        if (![powerAuth hasBiometryFactor]) {
            reject(EC_BIOMETRY_NOT_CONFIGURED, @"Biometry not configured in this PowerAuth instance", nil);
        } else {
            reject(EC_REACT_NATIVE_ERROR, @"Failed to remove biometry factor", nil);
        }
    }
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict reject:reject forCommit:NO];
    if (!auth) return;
    
    [powerAuth fetchEncryptionKey:auth index:index  callback:^(NSData * encryptionKey, NSError * error) {
        if (encryptionKey) {
            resolve([encryptionKey base64EncodedStringWithOptions:NSDataBase64EncodingEndLineWithLineFeed]);
        } else {
            ProcessError(error, reject);
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict reject:reject forCommit:NO];
    if (!auth) return;
    
    [powerAuth signDataWithDevicePrivateKey:auth data:[RCTConvert NSData:data] callback:^(NSData * signature, NSError * error) {
        if (signature) {
            resolve([RCTConvert NSString:[signature base64EncodedStringWithOptions:0]]);
        } else {
            ProcessError(error, reject);
        }
    }];
    PA_BLOCK_END
}

RCT_REMAP_METHOD(validatePassword,
                 instanceId:(NSString*)instanceId
                 password:(id)password
                 validatePasswordResolve:(RCTPromiseResolveBlock)resolve
                 validatePasswordReject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthCorePassword * corePassword = UsePassword(password, _objectRegister, reject);
    if (!corePassword) {
        return;
    }
    [powerAuth validateCorePassword:corePassword callback:^(NSError * error) {
        if (error) {
            ProcessError(error, reject);
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
    resolve(@([powerAuth hasActivationRecoveryData]));
    PA_BLOCK_END
}

RCT_REMAP_METHOD(activationRecoveryData,
                 instanceId:(NSString*)instanceId
                 authentication:(NSDictionary*)authDict
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict reject:reject forCommit:NO];
    if (!auth) return;
    
    [powerAuth activationRecoveryData:auth callback:^(PowerAuthActivationRecoveryData * data, NSError * error) {
        if (error) {
            ProcessError(error, reject);
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict reject:reject forCommit:NO];
    if (!auth) return;
    
    [powerAuth confirmRecoveryCode:recoveryCode authentication:auth callback:^(BOOL alreadyConfirmed, NSError * error) {
        if (error) {
            ProcessError(error, reject);
        } else {
            resolve(alreadyConfirmed ? @YES : @NO);
        }
    }];
    PA_BLOCK_END
}

/// Function validate the status of biometry before the biometry is used. The function also
/// validate whether activation is present, or whether biometry key is configured.
/// - Parameters:
///   - sdk: PowerAuthSDK instance
///   - reject: Reject promise in case that biometry cannot be used.
/// - Returns: YES in case biometry can be used.
- (BOOL) validateBiometryStatusBeforeUse:(PowerAuthSDK*)sdk reject:(RCTPromiseRejectBlock)reject
{
    // Determine the biometry state in advance. This is due to fact that iOS impl.
    // doesn't support all biometry related error codes such as Android.
    // This will be fixed in 1.8.x release, so this code will be obsolete.
    NSString * errorCode = nil;
    NSString * errorMessage = nil;
    switch ([PowerAuthKeychain biometricAuthenticationInfo].currentStatus) {
        case PowerAuthBiometricAuthenticationStatus_Available:
            if ([sdk hasValidActivation] && ![sdk hasBiometryFactor]) {
                // Has activation, but biometry factor is not set
                errorCode = EC_BIOMETRY_NOT_CONFIGURED; errorMessage = @"Biometry factor is not configured";
            }
            break;
        case PowerAuthBiometricAuthenticationStatus_NotEnrolled:
            errorCode = EC_BIOMETRY_NOT_ENROLLED; errorMessage = @"Biometry is not enrolled on device";
            break;
        case PowerAuthBiometricAuthenticationStatus_NotSupported:
            errorCode = EC_BIOMETRY_NOT_SUPPORTED; errorMessage = @"Biometry is not supported";
            break;
        case PowerAuthBiometricAuthenticationStatus_NotAvailable:
            errorCode = EC_BIOMETRY_NOT_AVAILABLE; errorMessage = @"Biometry is not available";
            break;
        case PowerAuthBiometricAuthenticationStatus_Lockout:
            errorCode = EC_BIOMETRY_LOCKOUT; errorMessage = @"Biometry is locked out";
            break;
        default:
            break;
    }
    if (errorCode) {
        reject(errorCode, errorMessage, nil);
        return NO;
    } else {
        return YES;
    }
}

RCT_REMAP_METHOD(authenticateWithBiometry,
                 instanceId:(nonnull NSString*)instanceId
                 prompt:(nonnull NSDictionary*)prompt
                 makeReusable:(BOOL)makeReusable
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject)
{
    PA_BLOCK_START
    if (![self validateBiometryStatusBeforeUse:powerAuth reject:reject]) {
        return;
    }
    NSString * promptMessage = GetNSStringValueFromDict(prompt, @"promptMessage");
    NSString * cancelButton = GetNSStringValueFromDict(prompt, @"cancelButton");
    NSString * fallbackButton = GetNSStringValueFromDict(prompt, @"fallbackButton");
    LAContext * context = [[LAContext alloc] init];
    context.localizedReason = promptMessage;
    context.localizedCancelTitle = cancelButton;
    context.localizedFallbackTitle = fallbackButton ? fallbackButton : @""; // empty string hides the button
    [powerAuth authenticateUsingBiometryWithContext:context callback:^(PowerAuthAuthentication * authentication, NSError * error) {
        if (authentication) {
            // Allocate native object
            PowerAuthData * managedData = [[PowerAuthData alloc] initWithData:authentication.overridenBiometryKey cleanup:YES];
            // If reusable authentication is going to be created, then "keep alive" release policy is applied.
            // Basically, the data will be available up to 10 seconds from the last access.
            // If authentication is not reusable, then dispose biometric key after its 1st use. We still need
            // to combine it with "expire" policy to make sure that key don't remain in memory forever.
            NSArray * releasePolicy = makeReusable
                        ? @[ RP_KEEP_ALIVE(BIOMETRY_KEY_KEEP_ALIVE_TIME) ]
                        : @[ RP_AFTER_USE(1), RP_EXPIRE(BIOMETRY_KEY_KEEP_ALIVE_TIME) ];
            
            NSString * managedId = [self->_objectRegister registerObject:managedData tag:instanceId policies:releasePolicy];
            resolve(managedId);
        } else {
            ProcessError(error, reject);
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
        resolve(PatchNull(@{
            @"activationCode": ac.activationCode,
            @"activationSignature": ac.activationSignature ? ac.activationSignature : [NSNull null]
        }));
    } else {
        reject(EC_INVALID_ACTIVATION_CODE, @"Invalid activation code.", nil);
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
        resolve(PatchNull(@{
            @"activationCode": ac.activationCode,
            @"activationSignature": ac.activationSignature ? ac.activationSignature : [NSNull null]
        }));
    } else {
        reject(EC_INVALID_RECOVERY_CODE, @"Invalid recovery code.", nil);
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
        reject(EC_INVALID_CHARACTER, @"Invalid character cannot be corrected.", nil);
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
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict reject:reject forCommit:NO];
    if (!auth) return;
    
    [[powerAuth tokenStore] requestAccessTokenWithName:tokenName authentication:auth completion:^(PowerAuthToken * token, NSError * error) {
        if (error || token == nil) {
            ProcessError(error, reject);
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
            ProcessError(error, reject);
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
        reject(EC_LOCAL_TOKEN_NOT_AVAILABLE, @"Token with this name is not in the local store.", nil);
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
        reject(EC_LOCAL_TOKEN_NOT_AVAILABLE, @"This token is no longer available in the local store.", nil);
    }
    else if ([token canGenerateHeader]) {
        PowerAuthAuthorizationHttpHeader* header = [token generateHeader];
        if (header) {
            resolve(@{
                @"key": header.key,
                @"value": header.value
            });
        } else {
            reject(EC_CANNOT_GENERATE_TOKEN, @"Cannot generate header for this token.", nil);
        }
    } else {
        reject(EC_CANNOT_GENERATE_TOKEN, @"Cannot generate header for this token.", nil);
    }
    PA_BLOCK_END
}

#pragma mark - Helper methods

/// Validate instance identifier and call reject promise if identifier is invalid.
/// @param instanceId Instance identifier to validate.
/// @param reject Reject block
/// @return NO if instance identifier is invalid and reject block was called, YES otherwise.
- (BOOL) validateInstanceId:(NSString*)instanceId reject:(RCTPromiseRejectBlock)reject
{
    if (![_objectRegister isValidObjectId: instanceId]) {
        reject(EC_WRONG_PARAMETER, @"Instance identifier is missing or empty string", nil);
        return NO;
    }
    return YES;
}

/// Method gets PowerAuthSDK instance from instance register and call `callback` with given object.
/// In case that there's no such instnace, or instanceId is invalid, then calls reject promise with a failure.
/// @param instanceId Instance identifier.
/// @param reject Reject promise block.
/// @param callback Callback to call with a valid PowerAuthSDK instance.
- (void) usePowerAuth:(NSString *)instanceId
               reject:(RCTPromiseRejectBlock)reject
             callback:(NS_NOESCAPE void(^)(PowerAuthSDK *sdk))callback
{
    if ([self validateInstanceId:instanceId reject:reject]) {
        PowerAuthSDK* sdk = [_objectRegister findObjectWithId:instanceId expectedClass:[PowerAuthSDK class]];
        if (sdk) {
            callback(sdk);
        } else {
            reject(EC_INSTANCE_NOT_CONFIGURED, @"This instance is not configured.", nil);
        }
    }
}

/// Translate dictionary into `PowerAuthAuthentication` object.
/// @param dict Dictionary with authentication data.
/// @param commit Set YES if authentication is required for activation commit.
- (PowerAuthAuthentication*) constructAuthenticationFromDictionary:(NSDictionary*)dict
                                                            reject:(RCTPromiseRejectBlock)reject
                                                         forCommit:(BOOL)commit
{
    BOOL useBiometry = [RCTConvert BOOL:dict[@"isBiometry"]];
    id userPassword = dict[@"password"];
    if (commit) {
        // Activation commit
        PowerAuthCorePassword * password = UsePassword(userPassword, _objectRegister, reject);
        if (!password) {
            return nil;
        }
        if (useBiometry) {
            // All factors needs to be estabilished in activation.
            return [PowerAuthAuthentication commitWithCorePasswordAndBiometry:password];
        } else {
            return [PowerAuthAuthentication commitWithCorePassword:password];
        }
    } else {
        // Data signing
        if (userPassword) {
            PowerAuthCorePassword * password = UsePassword(userPassword, _objectRegister, reject);
            if (!password) {
                return nil;
            }
            return [PowerAuthAuthentication possessionWithCorePassword:password];
        } else if (useBiometry) {
            NSString * biometryKeyId = GetNSStringValueFromDict(dict, @"biometryKeyId");
            if (biometryKeyId) {
                PowerAuthData * biometryKeyData = [_objectRegister useObjectWithId:biometryKeyId expectedClass:[PowerAuthData class]];
                if (biometryKeyData) {
                    return [PowerAuthAuthentication possessionWithBiometryWithCustomBiometryKey:biometryKeyData.data customPossessionKey:nil];
                } else {
                    reject(EC_INVALID_NATIVE_OBJECT, @"Biometric key in PowerAuthAuthentication object is no longer valid.", nil);
                    return nil;
                }
            }
            NSString * biometryPrompt = GetValueAtPathFromDict(dict, @"biometricPrompt.promptMessage", [NSString class]);
            NSString * cancelButton   = GetValueAtPathFromDict(dict, @"biometricPrompt.promptTitle", [NSString class]);
            if (biometryPrompt || cancelButton) {
                LAContext * context = [[LAContext alloc] init];
                context.localizedReason = biometryPrompt;
                context.localizedCancelTitle = cancelButton;
                return [PowerAuthAuthentication possessionWithBiometryContext:context];
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

@end
