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
#import "Utilities.h"
#import "PAJS.h"

#import "UIKit/UIKit.h"

#import <PowerAuth2/PowerAuthSDK.h>
#import <PowerAuth2/PowerAuthErrorConstants.h>
#import <PowerAuth2/PowerAuthKeychain.h>
#import <PowerAuth2/PowerAuthClientSslNoValidationStrategy.h>
#import <PowerAuth2/PowerAuthCustomHeaderRequestInterceptor.h>
#import <PowerAuth2/PowerAuthBasicHttpAuthenticationRequestInterceptor.h>

@import PowerAuth2;

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
                  PAJS_ARGUMENT(keychainConfiguration, NSDictionary*)
                  PAJS_ARGUMENT(sharingConfiguration, NSDictionary*))
{
    if (![self validateInstanceId:instanceId reject:reject]) {
        return;
    }
    
    // Instance config
    // Preserve the PowerAuth 1.9 protocol until algorithm selection is exposed publicly.
    PowerAuthConfiguration *config = [[PowerAuthConfiguration alloc] initWithInstanceId:instanceId
                                                                        baseEndpointUrl:CAST_TO(configuration[@"baseEndpointUrl"], NSString)
                                                                          configuration:CAST_TO(configuration[@"configuration"], NSString)
                                                                              algorithm:PowerAuthAlgorithm_LEGACY_P256];
    // Prepare sharing configuration
    if (CAST_TO(sharingConfiguration[@"isProvided"], NSNumber).boolValue) {
        PowerAuthSharingConfiguration * sharingConfig = [[PowerAuthSharingConfiguration alloc] initWithAppGroup:CAST_TO(sharingConfiguration[@"appGroup"], NSString)
                                                                                                  appIdentifier:CAST_TO(sharingConfiguration[@"appIdentifier"], NSString)
                                                                                            keychainAccessGroup:CAST_TO(sharingConfiguration[@"keychainAccessGroup"], NSString)];
        sharingConfig.sharedMemoryIdentifier = CAST_TO(sharingConfiguration[@"sharedMemoryIdentifier"], NSString);
        config.sharingConfiguration = sharingConfig;
    }
    
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

    PowerAuthBiometricConfiguration * biometricConfig = [[PowerAuthBiometricConfiguration alloc] init];
    NSNumber * invalidateAfterChange = CAST_TO(biometryConfiguration[@"invalidateBiometricFactorAfterChange"], NSNumber);
    if (!invalidateAfterChange) {
        invalidateAfterChange = CAST_TO(biometryConfiguration[@"linkItemsToCurrentSet"], NSNumber);
    }
    if (invalidateAfterChange) {
        biometricConfig.invalidateBiometricFactorAfterChange = invalidateAfterChange.boolValue;
    }
    NSNumber * fallbackToDevicePasscode = CAST_TO(biometryConfiguration[@"fallbackToDevicePasscode"], NSNumber);
    if (fallbackToDevicePasscode) {
        biometricConfig.allowFallbackToDevicePasscode = fallbackToDevicePasscode.boolValue;
    }
    
    // Now register the instance in the thread safe manner.
    __block NSError * initializationError = nil;
    BOOL registered = [_objectRegister registerObjectWithId:instanceId tag:instanceId policies:@[RP_MANUAL()] objectFactory:^id {
        return [[PowerAuthSDK alloc] initWithConfiguration:config
                                    biometricConfiguration:biometricConfig
                                       clientConfiguration:clientConfig
                                     keychainConfiguration:keychainConfig
                                                     error:&initializationError];
    }];
    
    if (registered) {
        // Resolve success
        resolve(@YES);
    } else if (initializationError) {
        ProcessError(initializationError, reject);
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

PAJS_METHOD_START(getExternalPendingOperation,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    PowerAuthExternalPendingOperation * pendingOperation = powerAuth.externalPendingOperation;
    if (pendingOperation) {
        resolve(@{
            @"externalOperationType": pendingOperation.externalOperationType == PowerAuthExternalPendingOperationType_Activation ? @"ACTIVATION" : @"PROTOCOL_UPGRADE",
            @"externalApplicationId": pendingOperation.externalApplicationId
        });
    } else {
        resolve(nil);
    }
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
    NSDictionary* identityAttributes = activation[@"identityAttributes"];
    NSString* extras = activation[@"extras"];
    NSDictionary* customAttributes = activation[@"customAttributes"];
    NSString* additionalActivationOtp = activation[@"additionalActivationOtp"];
    NSDictionary* oidcParameters = activation[@"oidcParameters"];
    
    if (activationCode) {
        paActivation = [PowerAuthActivation activationWithActivationCode:activationCode name:name error:nil];
    } else if (identityAttributes) {
        paActivation = [PowerAuthActivation activationWithIdentityAttributes:identityAttributes name:name error:nil];
    } else if (oidcParameters) {
        NSString * providerId = oidcParameters[@"providerId"];
        NSString * code = oidcParameters[@"code"];
        NSString * nonce = oidcParameters[@"nonce"];
        NSString * codeVerifier = oidcParameters[@"codeVerifier"];

        if (!providerId || !code || !nonce) {
            reject(EC_INVALID_ACTIVATION_OBJECT, @"OIDC parameters are invalid.", nil);
            return;
        }

        NSError * activationError = nil;
        paActivation = [PowerAuthActivation activationWithOidcProviderId:providerId code:code nonce:nonce codeVerifier:codeVerifier error:&activationError];
        
        if (activationError) {
            reject(EC_INVALID_ACTIVATION_OBJECT, @"OIDC Activation object is invalid.", activationError);
            return;
        }

        if (paActivation && name) {
            [paActivation withActivationName:name];
        }
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
                @"customAttributes": result.customAttributes ? result.customAttributes : [NSNull null],
                @"userInfo": result.userInfo
                    ? @{ @"allClaims": result.userInfo.allClaims ?: [NSNull null] }
                    : [NSNull null]
            }));
        } else {
            ProcessError(error, reject);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(persistActivation,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authentication, NSDictionary*))
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthentication:authentication reject:reject];
    if (!auth) {
        return;
    }
    
    [powerAuth persistActivationWithAuthentication:auth callback:^(NSError * _Nullable error) {
        // Referencing auth keeps its sensitive data alive until the asynchronous operation finishes.
        (void)auth;
        if (error) {
            ProcessError(error, reject);
        } else {
            resolve(nil);
        }
    }];
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
    PowerAuthAuthentication *auth = [self constructAuthentication:authDict reject:reject];
    if (!auth) return;
    
    [powerAuth removeActivationWithAuthentication:auth callback:^(NSError * _Nullable error) {
        // Keep authentication and its sensitive values alive until the asynchronous operation completes.
        (void)auth;
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

PAJS_METHOD_START(authenticationHeaderForRequestWithParams,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(method, NSString*)
                  PAJS_ARGUMENT(uriId, NSString*)
                  PAJS_ARGUMENT(params, NSDictionary*))
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthentication:authDict reject:reject];
    if (!auth) return;
    
    NSError* error = nil;
    PowerAuthHttpHeader* header = [powerAuth authenticationHeaderForRequestWithParamsWithAuthentication:auth
                                                                                                method:method
                                                                                                 uriId:uriId
                                                                                                params:params
                                                                                                 error:&error];
    
    if (error) {
        ProcessError(error, reject);
    } else if (header) {
        NSDictionary *response = @{
            @"name": header.key,
            @"value": header.value
        };
        resolve(response);
    } else {
        reject(EC_REACT_NATIVE_ERROR, @"PowerAuth SDK returned neither an authentication header nor an error.", nil);
    }
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(authenticationHeaderForRequestWithBody,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(method, NSString*)
                  PAJS_ARGUMENT(uriId, NSString*)
                  PAJS_ARGUMENT(body, PAJS_NULLABLE_ARGUMENT NSString*))
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthentication:authDict reject:reject];
    if (!auth) return;
    
    NSError* error = nil;
    NSData * requestBody = body ? [body dataUsingEncoding:NSUTF8StringEncoding] : nil;
    PowerAuthHttpHeader* header = [powerAuth authenticationHeaderForRequestWithBodyWithAuthentication:auth
                                                                                              method:method
                                                                                               uriId:uriId
                                                                                                body:requestBody
                                                                                               error:&error];
    
    if (error) {
        ProcessError(error, reject);
    } else if (header) {
        NSDictionary *response = @{
            @"name": header.key,
            @"value": header.value
        };
        resolve(response);
    } else {
        reject(EC_REACT_NATIVE_ERROR, @"PowerAuth SDK returned neither an authentication header nor an error.", nil);
    }
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(offlineAuthenticationCode,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(uriId, NSString*)
                  PAJS_ARGUMENT(body, PAJS_NULLABLE_ARGUMENT NSString*)
                  PAJS_ARGUMENT(nonce, PAJS_NONNULL_ARGUMENT NSString*))
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthentication:authDict reject:reject];
    if (!auth) return;
    
    NSData * requestBody = body ? [body dataUsingEncoding:NSUTF8StringEncoding] : nil;
    [powerAuth offlineAuthenticationCodeWithAuthentication:auth
                                                     uriId:uriId
                                                      body:requestBody
                                                     nonce:nonce
                                                  callback:^(NSString * authenticationCode, NSError * error) {
        // Keep authentication and its sensitive values alive until the asynchronous operation completes.
        (void)auth;
        if (error) {
            ProcessError(error, reject);
        } else if (authenticationCode) {
            resolve(authenticationCode);
        } else {
            reject(EC_REACT_NATIVE_ERROR, @"PowerAuth SDK returned neither an offline authentication code nor an error.", nil);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(verifyServerSignedData,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(data, PAJS_NONNULL_ARGUMENT NSString*)
                  PAJS_ARGUMENT(signature, PAJS_NONNULL_ARGUMENT NSString*)
                  PAJS_BOOL_ARGUMENT(masterKey))
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
    // Making copies of passwords to immutable form, as they will be used in `sdk.changePassword` call.
    // This call is actually 2 http requests, so it may take some time and the original password could
    // be released in the meantime by the object register.
    // We depends on the ARC to deref the objects, which calls clean.
    [powerAuth changeCorePasswordFrom:[coreOldPassword copyToImmutable] to:[newCorePassword copyToImmutable] callback:^(NSError * error) {
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
    PowerAuthCorePassword * corePassword = [UsePassword(password, _objectRegister, reject) copyToImmutable];
    if (!corePassword) {
        return;
    }
    [powerAuth addBiometryFactorWithCorePassword:corePassword callback:^(NSError * error) {
        // Keep the immutable password alive until the asynchronous operation completes.
        (void)corePassword;
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
    [powerAuth removeBiometryFactorWithCallback:^(NSError * error) {
        if (error) {
            ProcessError(error, reject);
        } else {
            resolve(nil);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(getBiometricStatus,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    PowerAuthBiometricStatus * status = powerAuth.biometricStatus;
    NSString * biometryType;
    NSString * systemStatus;
    switch (status.biometryType) {
        case PowerAuthBiometricAuthenticationType_TouchID: biometryType = @"FINGERPRINT"; break;
        case PowerAuthBiometricAuthenticationType_FaceID: biometryType = @"FACE"; break;
        case PowerAuthBiometricAuthenticationType_None:
        default: biometryType = @"NONE"; break;
    }
    switch (status.systemStatus) {
        case PowerAuthBiometricAuthenticationStatus_Available: systemStatus = @"OK"; break;
        case PowerAuthBiometricAuthenticationStatus_NotEnrolled: systemStatus = @"NOT_ENROLLED"; break;
        case PowerAuthBiometricAuthenticationStatus_NotAvailable: systemStatus = @"NOT_AVAILABLE"; break;
        case PowerAuthBiometricAuthenticationStatus_NotSupported: systemStatus = @"NOT_SUPPORTED"; break;
        case PowerAuthBiometricAuthenticationStatus_Lockout: systemStatus = @"LOCKOUT"; break;
        default: systemStatus = @"NOT_AVAILABLE"; break;
    }
    resolve(@{
        @"isAuthenticationWithBiometricsAvailable": @(status.isAuthenticationWithBiometricsAvailable),
        @"isBiometricFactorConfigured": @(status.isBiometricFactorConfigured),
        @"systemStatus": systemStatus,
        @"biometryType": biometryType
    });
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(isAuthenticationWithBiometricsAvailable,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(@(powerAuth.isAuthenticationWithBiometricsAvailable));
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
                  PAJS_ARGUMENT(index, PAJS_NONNULL_ARGUMENT NSNumber*))
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthentication:authDict reject:reject];
    if (!auth) return;
    
    [powerAuth fetchEncryptionKey:auth index:[index integerValue]  callback:^(PowerAuthSecureData * encryptionKey, NSError * error) {
        // Keep authentication and its sensitive values alive until the asynchronous operation completes.
        (void)auth;
        if (encryptionKey) {
            resolve([encryptionKey.sensitiveData base64EncodedStringWithOptions:NSDataBase64EncodingEndLineWithLineFeed]);
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
                  PAJS_ARGUMENT(data, NSString*)
                  PAJS_ARGUMENT(dataFormat, NSString*))
{
    PA_BLOCK_START
    PowerAuthAuthentication *auth = [self constructAuthentication:authDict reject:reject];
    if (!auth) return;

    DataFormat format = GetPowerAuthDataFormat(dataFormat, reject);
    if (!format) {
        return;
    }
    NSData * decodedData = DecodeNSDataValue(data, format, reject);
    if (!decodedData) {
        return;
    }
    
    [powerAuth signDataWithDevicePrivateKey:auth data:decodedData callback:^(NSData * signature, NSError * error) {
        // Keep authentication and its sensitive values alive until the asynchronous operation completes.
        (void)auth;
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
            resolve(nil);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(authenticateWithBiometry,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(prompt, PAJS_NONNULL_ARGUMENT NSDictionary*)
                  PAJS_BOOL_ARGUMENT(makeReusable))
{
    PA_BLOCK_START
    NSString * promptMessage = GetNSStringValueFromDict(prompt, @"promptMessage");
    if (promptMessage.length == 0) {
        reject(EC_WRONG_PARAMETER, @"Biometric prompt message is required on iOS.", nil);
        return;
    }
    NSString * cancelButton = GetNSStringValueFromDict(prompt, @"cancelButtonTitle");
    if (!cancelButton) {
        cancelButton = GetNSStringValueFromDict(prompt, @"cancelButton");
    }
    NSString * fallbackButton = GetNSStringValueFromDict(prompt, @"fallbackButtonTitle");
    if (!fallbackButton) {
        fallbackButton = GetNSStringValueFromDict(prompt, @"fallbackButton");
    }
    LAContext * context = [[LAContext alloc] init];
    context.localizedReason = promptMessage;
    context.localizedCancelTitle = cancelButton;
    context.localizedFallbackTitle = fallbackButton ? fallbackButton : @""; // empty string hides the button
    [powerAuth authenticateUsingBiometryWithContext:context callback:^(PowerAuthAuthentication * authentication, NSError * error) {
        if (authentication) {
            PowerAuthSecureData * customBiometryKey = authentication.customBiometryKey;
            if (!customBiometryKey) {
                reject(EC_REACT_NATIVE_ERROR, @"Biometric key is missing after successful authentication.", nil);
                return;
            }
            // Own an independent secure-data copy beyond the callback authentication lifetime.
            PowerAuthSecureData * keyCopy = [[PowerAuthSecureData alloc] initWithData:customBiometryKey.sensitiveData];
            PowerAuthData * managedData = [[PowerAuthData alloc] initWithSecureData:keyCopy];
            // If reusable authentication is going to be created, then "keep alive" release policy is applied.
            // Basically, the data will be available up to 10 seconds from the last access.
            // If authentication is not reusable, then dispose biometric key after its 1st use. We still need
            // to combine it with "expire" policy to make sure that key don't remain in memory forever.
            NSArray * releasePolicy = makeReusable
                        ? @[ RP_KEEP_ALIVE(BIOMETRY_KEY_KEEP_ALIVE_TIME) ]
                        : @[ RP_AFTER_USE(1), RP_EXPIRE(BIOMETRY_KEY_KEEP_ALIVE_TIME) ];
            
            NSString * managedId = [self->_objectRegister registerObject:managedData
                                                          ifOwnerMatches:powerAuth
                                                                 ownerId:instanceId
                                                                policies:releasePolicy];
            if (managedId) {
                resolve(managedId);
            } else {
                reject(EC_INSTANCE_NOT_CONFIGURED, @"PowerAuth instance is no longer configured.", nil);
            }
        } else {
            if (error) {
                ProcessError(error, reject);
            } else {
                reject(EC_REACT_NATIVE_ERROR, @"Biometric authentication returned no result.", nil);
            }
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
    PowerAuthAuthentication *auth = [self constructAuthentication:authDict reject:reject];
    if (!auth) return;
    
    [[powerAuth tokenStore] requestAccessTokenWithName:tokenName authentication:auth completion:^(PowerAuthToken * token, NSError * error) {
        // Keep authentication and its sensitive values alive until the asynchronous operation completes.
        (void)auth;
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

PAJS_METHOD_START(generateAuthenticationHeaderForToken,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(tokenName, PAJS_NONNULL_ARGUMENT NSString*))
{
    PA_BLOCK_START
    [[powerAuth tokenStore] generateAuthenticationHeaderWithName:tokenName completion:^(PowerAuthHttpHeader * header, NSError * error) {
        if (header) {
            resolve(@{
                @"name": header.key,
                @"value": header.value
            });
        } else {
            ProcessError(error, reject);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_NO_ARGS_START(getEnvironmentInfo)
{
    UIDevice * currentDevice = [UIDevice currentDevice];
    NSBundle * mainBundle = [NSBundle mainBundle];
    NSDictionary * mainDictionary = [mainBundle infoDictionary];
    NSString * appVersion = mainDictionary[@"CFBundleShortVersionString"];
    NSString * appId = mainDictionary[@"CFBundleIdentifier"];
    
    resolve(@{
        @"systemName": [currentDevice systemName],
        @"systemVersion": [currentDevice systemVersion],
        
        @"applicationVersion": appVersion ? appVersion : [NSNull null],
        @"applicationIdentifier": appId ? appId : [NSNull null],
        
        @"deviceManufacturer": @"apple",
        @"deviceId": [currentDevice model]
    });
}
PAJS_METHOD_END

// MARK: - UserInfo methods

PAJS_METHOD_START(fetchUserInfo,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    [powerAuth fetchUserInfo:^(PowerAuthUserInfo * _Nullable userInfo, NSError * _Nullable error) {
        if (error == nil) {
            NSDictionary * response = @{ @"allClaims": userInfo && userInfo.allClaims ? userInfo.allClaims : @{} };
            resolve(response);
        } else {
            ProcessError(error, reject);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(getLastFetchedUserInfo,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    PowerAuthUserInfo * userInfo = powerAuth.lastFetchedUserInfo;
    if (userInfo) {
        NSDictionary * response = @{ @"allClaims": userInfo.allClaims ? userInfo.allClaims : @{} };
        resolve(response);
    } else {
        resolve(nil);
    }
    PA_BLOCK_END
}
PAJS_METHOD_END

// MARK: - Time synchronization methods

PAJS_METHOD_START(isTimeSynchronized,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve([[powerAuth timeSynchronizationService] isTimeSynchronized] ? @YES : @NO);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(localTimeAdjustment,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    long long timestamp = [self convertTimestamp:[[powerAuth timeSynchronizationService] localTimeAdjustment]];
    resolve([[NSNumber alloc] initWithLongLong:timestamp]);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(localTimeAdjustmentPrecision,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    long long timestamp = [self convertTimestamp:[[powerAuth timeSynchronizationService] localTimeAdjustmentPrecision]];
    resolve([[NSNumber alloc] initWithLongLong:timestamp]);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(currentTime,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    long long timestamp = [self convertTimestamp:[[powerAuth timeSynchronizationService] currentTime]];
    resolve([[NSNumber alloc] initWithLongLong:timestamp]);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(synchronizeTime,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    [[powerAuth timeSynchronizationService] synchronizeTimeWithCallback:^(NSError * error) {
        if (error) {
            ProcessError(error, reject);
        } else {
            resolve(nil);
        }
    } callbackQueue:nil];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(resetTimeSynchronization,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    [[powerAuth timeSynchronizationService] resetTimeSynchronization];
    resolve(nil);
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
- (PowerAuthAuthentication*) constructAuthentication:(NSDictionary*)dict
                                              reject:(RCTPromiseRejectBlock)reject
{
    id persistValue = dict[@"isPersist"];
    if (![persistValue isKindOfClass:[NSNumber class]]) {
        reject(EC_WRONG_PARAMETER, @"Missing or invalid isPersist in authentication object.", nil);
        return nil;
    }
    BOOL persist = [persistValue boolValue];
    BOOL useBiometry = [RCTConvert BOOL:dict[@"isBiometry"]];
    id userPassword = dict[@"password"];
    if (persist) {
        // Activation commit
        PowerAuthCorePassword * password = [UsePassword(userPassword, _objectRegister, reject) copyToImmutable];
        if (!password) {
            return nil;
        }
        if (useBiometry) {
            // All factors needs to be estabilished in activation.
            return [PowerAuthAuthentication persistWithCorePasswordAndBiometry:password];
        } else {
            return [PowerAuthAuthentication persistWithCorePassword:password];
        }
    } else {
        // Data signing
        if (userPassword) {
            PowerAuthCorePassword * password = [UsePassword(userPassword, _objectRegister, reject) copyToImmutable];
            if (!password) {
                return nil;
            }
            return [PowerAuthAuthentication possessionWithCorePassword:password];
        } else if (useBiometry) {
            NSString * biometryKeyId = GetNSStringValueFromDict(dict, @"biometryKeyId");
            if (!biometryKeyId) {
                reject(EC_WRONG_PARAMETER, @"Biometric signing requires a pre-authorized biometry key.", nil);
                return nil;
            }
            PowerAuthSecureData * biometryKey = [_objectRegister useObjectWithId:biometryKeyId
                                                                  expectedClass:[PowerAuthData class]
                                                                      transform:^id(PowerAuthData * data) {
                return [data.secureData copy];
            }];
            if (biometryKey) {
                return [PowerAuthAuthentication possessionWithBiometryWithCustomBiometryKey:biometryKey];
            }
            reject(EC_INVALID_NATIVE_OBJECT, @"Biometric key in PowerAuthAuthentication object is no longer valid.", nil);
            return nil;
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
        case PowerAuthActivationState_PendingCommit: return @"PENDING_COMMIT";
        case PowerAuthActivationState_Active: return @"ACTIVE";
        case PowerAuthActivationState_Blocked: return @"BLOCKED";
        case PowerAuthActivationState_Removed: return @"REMOVED";
        case PowerAuthActivationState_Deadlock: return @"DEADLOCK";
        default: return @"UNKNOWN";
    }
}

- (long long) convertTimestamp:(double)timestamp
{
    // PowerAuth provides timestamp in seconds, but JS expect milliseconds.
    // Also, convert it to integer to get rid of the decimal part.
    return (long long)(timestamp * 1000);
}

@end
