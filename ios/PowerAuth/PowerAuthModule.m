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
#import "PowerAuthObjectRegister.h"
#import "Constants.h"
#import "PAJS.h"

#import "UIKit/UIKit.h"

#import <PowerAuth2/PowerAuthSDK.h>
#import <PowerAuth2/PowerAuthErrorConstants.h>
#import <PowerAuth2/PowerAuthKeychain.h>
#import <PowerAuth2/PowerAuthClientSslNoValidationStrategy.h>
#import <PowerAuth2/PowerAuthCustomHeaderRequestInterceptor.h>
#import <PowerAuth2/PowerAuthBasicHttpAuthenticationRequestInterceptor.h>

@import PowerAuthCore;

@implementation PowerAuthModule
{
    PowerAuthObjectRegister * _objectRegister;
}

PAJS_MODULE_REGISTRY

#define PA_BLOCK_START [self usePowerAuth:instanceId reject:reject callback:^(PowerAuthSDK * powerAuth) {
#define PA_BLOCK_END }];

RCT_EXPORT_MODULE(PowerAuth);

- (void) PAJS_INITIALIZE_METHOD
{
    PAJS_OBJECT_REGISTER
}

+ (BOOL) requiresMainQueueSetup
{
    return NO;
}

#pragma mark - Native methods bridged to JS

PAJS_METHOD_START(isConfigured,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    if ([self validateInstanceId:instanceId reject:reject]) {
        resolve(@([_objectRegister findObjectWithId:instanceId expectedClass:[PowerAuthSDK class]] != nil));
    }
}
PAJS_METHOD_END

PAJS_METHOD_START(configure,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(configuration, NSDictionary*)
                  PAJS_ARGUMENT(clientConfiguration, NSDictionary*)
                  PAJS_ARGUMENT(biometryConfiguration, NSDictionary*)
                  PAJS_ARGUMENT(keychainConfiguration, NSDictionary*))
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
    
    // Interceptors
    NSMutableArray * interceptors = [[NSMutableArray alloc] init];
    
    // Custom HTTP headers
    NSArray * httpHeaders = CAST_TO(clientConfiguration[@"customHttpHeaders"], NSArray);
    if (httpHeaders) {
        for (id object in httpHeaders) {
            NSDictionary * map = CAST_TO(object, NSDictionary);
            NSString * name = CAST_TO(map[@"name"], NSString);
            NSString * value = CAST_TO(map[@"value"], NSString);
            if (name && value) {
                [interceptors addObject:[[PowerAuthCustomHeaderRequestInterceptor alloc] initWithHeaderKey:name value:value]];
            }
        }
    }
    // Basic Authentication
    NSDictionary * basicAuth = CAST_TO(clientConfiguration[@"basicHttpAuthentication"], NSDictionary);
    if (basicAuth) {
        NSString * username = CAST_TO(basicAuth[@"username"], NSString);
        NSString * password = CAST_TO(basicAuth[@"password"], NSString);
        if (username && password) {
            [interceptors addObject:[[PowerAuthBasicHttpAuthenticationRequestInterceptor alloc] initWithUsername:username password:password]];
        }
    }
    
    [clientConfig setRequestInterceptors: interceptors];
    
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
PAJS_METHOD_END

PAJS_METHOD_START(deconfigure,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    if ([self validateInstanceId:instanceId reject:reject]) {
        [_objectRegister removeAllObjectsWithTag:instanceId];
        resolve(@YES);
    }
}
PAJS_METHOD_END

PAJS_METHOD_START(hasValidActivation,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(@([powerAuth hasValidActivation]));
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(canStartActivation,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(@([powerAuth canStartActivation]));
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(hasPendingActivation,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(@([powerAuth hasPendingActivation]));
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(fetchActivationStatus,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    [powerAuth getActivationStatusWithCallback:^(PowerAuthActivationStatus * _Nullable status, NSError * _Nullable error) {
        if (error == nil) {
            NSDictionary *response = @{
                @"state": [self getStatusCode:status.state],
                @"failCount": [[NSNumber alloc] initWithUnsignedInt:status.failCount],
                @"maxFailCount": [[NSNumber alloc] initWithUnsignedInt:status.maxFailCount],
                @"remainingAttempts": [[NSNumber alloc] initWithUnsignedInt:status.remainingAttempts],
                @"customObject": status.customObject ? [RCTConvert NSDictionary:status.customObject] : [NSNull null]
            };
            resolve(response);
        } else {
            ProcessError(error, reject);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(createActivation,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(activation, NSDictionary*))
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
PAJS_METHOD_END

PAJS_METHOD_START(commitActivation,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authentication, NSDictionary*))
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
PAJS_METHOD_END

PAJS_METHOD_START(activationIdentifier,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve([powerAuth activationIdentifier]);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(activationFingerprint,
                 PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve([powerAuth activationFingerprint]);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(removeActivationWithAuthentication,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*))
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
PAJS_METHOD_END

PAJS_METHOD_START(removeActivationLocal,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    [powerAuth removeActivationLocal];
    resolve(nil);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(requestGetSignature,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(uriId, NSString*)
                  PAJS_ARGUMENT(params, NSDictionary*))
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
PAJS_METHOD_END

PAJS_METHOD_START(requestSignature,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(method, NSString*)
                  PAJS_ARGUMENT(uriId, NSString*)
                  PAJS_ARGUMENT(body, PAJS_NULLABLE_ARGUMENT NSString*))
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
PAJS_METHOD_END

PAJS_METHOD_START(offlineSignature,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(uriId, NSString*)
                  PAJS_ARGUMENT(body, PAJS_NULLABLE_ARGUMENT NSString*)
                  PAJS_ARGUMENT(nonce, PAJS_NONNULL_ARGUMENT NSString*))
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
PAJS_METHOD_END

PAJS_METHOD_START(verifyServerSignedData,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(data, PAJS_NONNULL_ARGUMENT NSString*)
                  PAJS_ARGUMENT(signature, PAJS_NONNULL_ARGUMENT NSString*)
                  PAJS_ARGUMENT(masterKey, BOOL))
{
    PA_BLOCK_START
    BOOL result = [powerAuth verifyServerSignedData:[RCTConvert NSData:data] signature:signature masterKey:masterKey];
    resolve(@(result));
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(unsafeChangePassword,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(oldPassword, id)
                  PAJS_ARGUMENT(newPassword, id))
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
PAJS_METHOD_END

PAJS_METHOD_START(changePassword,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(oldPassword, id)
                  PAJS_ARGUMENT(newPassword, id))
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
PAJS_METHOD_END

PAJS_METHOD_START(addBiometryFactor,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(password, id)
                  PAJS_ARGUMENT(foo, id))
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
PAJS_METHOD_END

PAJS_METHOD_START(hasBiometryFactor,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(@([powerAuth hasBiometryFactor]));
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(removeBiometryFactor,
                  PAJS_ARGUMENT(instanceId, NSString*))
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
PAJS_METHOD_END

PAJS_METHOD_START(getBiometryInfo,
                  PAJS_ARGUMENT(instanceId, NSString*))
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
PAJS_METHOD_END

PAJS_METHOD_START(fetchEncryptionKey,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(index, PAJS_NONNULL_ARGUMENT NSNumber*)) // TODO: changed from NSInteger, make sure it works
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthenticationFromDictionary:authDict reject:reject forCommit:NO];
    if (!auth) return;
    
    [powerAuth fetchEncryptionKey:auth index:[index integerValue]  callback:^(NSData * encryptionKey, NSError * error) {
        if (encryptionKey) {
            resolve([encryptionKey base64EncodedStringWithOptions:NSDataBase64EncodingEndLineWithLineFeed]);
        } else {
            ProcessError(error, reject);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(signDataWithDevicePrivateKey,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(data, NSString*))
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
PAJS_METHOD_END

PAJS_METHOD_START(validatePassword,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(password, id))
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
PAJS_METHOD_END

PAJS_METHOD_START(hasActivationRecoveryData,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(@([powerAuth hasActivationRecoveryData]));
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(activationRecoveryData,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*))
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
PAJS_METHOD_END

PAJS_METHOD_START(confirmRecoveryCode,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(recoveryCode, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*))
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
PAJS_METHOD_END

///// Function validate the status of biometry before the biometry is used. The function also
///// validate whether activation is present, or whether biometry key is configured.
///// - Parameters:
/////   - sdk: PowerAuthSDK instance
/////   - reject: Reject promise in case that biometry cannot be used.
///// - Returns: YES in case biometry can be used.
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

PAJS_METHOD_START(authenticateWithBiometry,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(prompt, PAJS_NONNULL_ARGUMENT NSDictionary*)
                  PAJS_ARGUMENT(makeReusable, BOOL))
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
PAJS_METHOD_END

PAJS_METHOD_START(parseActivationCode,
                  PAJS_ARGUMENT(activationCode, NSString*))
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
PAJS_METHOD_END

PAJS_METHOD_START(validateActivationCode,
                  PAJS_ARGUMENT(activationCode, NSString*))
{
    resolve([PowerAuthActivationCodeUtil validateActivationCode:activationCode] ? @YES : @NO);
}
PAJS_METHOD_END

PAJS_METHOD_START(parseRecoveryCode,
                  PAJS_ARGUMENT(recoveryCode, NSString*))
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
PAJS_METHOD_END

PAJS_METHOD_START(validateRecoveryCode,
                  PAJS_ARGUMENT(recoveryCode, NSString*))
{
    resolve([PowerAuthActivationCodeUtil validateRecoveryCode:recoveryCode] ? @YES : @NO);
}
PAJS_METHOD_END

PAJS_METHOD_START(validateRecoveryPuk,
                  PAJS_ARGUMENT(recoveryPuk, NSString*))
{
    resolve([PowerAuthActivationCodeUtil validateRecoveryPuk:recoveryPuk] ? @YES : @NO);
}
PAJS_METHOD_END

PAJS_METHOD_START(validateTypedCharacter,
                  PAJS_ARGUMENT(utfCodepoint, PAJS_NONNULL_ARGUMENT NSNumber*))
{
    resolve([PowerAuthActivationCodeUtil validateTypedCharacter:utfCodepoint.unsignedIntValue] ? @YES : @NO);
}
PAJS_METHOD_END

PAJS_METHOD_START(correctTypedCharacter,
                  PAJS_ARGUMENT(utfCodepoint, PAJS_NONNULL_ARGUMENT NSNumber*))
{
    UInt32 corrected = [PowerAuthActivationCodeUtil validateAndCorrectTypedCharacter:utfCodepoint.unsignedIntValue];
    if (corrected == 0) {
        reject(EC_INVALID_CHARACTER, @"Invalid character cannot be corrected.", nil);
    } else {
        resolve([[NSNumber alloc] initWithInt:corrected]);
    }
}
PAJS_METHOD_END

PAJS_METHOD_START(requestAccessToken,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(tokenName, PAJS_NONNULL_ARGUMENT NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*))
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
PAJS_METHOD_END

PAJS_METHOD_START(removeAccessToken,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(tokenName, PAJS_NONNULL_ARGUMENT NSString*))
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
PAJS_METHOD_END

PAJS_METHOD_START(hasLocalToken,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(tokenName, PAJS_NONNULL_ARGUMENT NSString*))
{
    PA_BLOCK_START
    resolve([[powerAuth tokenStore] hasLocalTokenWithName:tokenName] ? @YES : @NO);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(getLocalToken,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(tokenName, PAJS_NONNULL_ARGUMENT NSString*))
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
PAJS_METHOD_END

PAJS_METHOD_START(removeLocalToken,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(tokenName, PAJS_NONNULL_ARGUMENT NSString*))
{
    PA_BLOCK_START
    [[powerAuth tokenStore] removeLocalTokenWithName:tokenName];
    resolve(nil);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(removeAllLocalTokens,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    [[powerAuth tokenStore] removeAllLocalTokens];
    resolve(nil);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(generateHeaderForToken,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(tokenName, PAJS_NONNULL_ARGUMENT NSString*))
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
PAJS_METHOD_END

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
    PowerAuthSDK* sdk = GetPowerAuthSdk(instanceId, _objectRegister, reject);
    if (sdk) {
        callback(sdk);
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
