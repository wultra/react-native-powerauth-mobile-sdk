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

@interface PA2PasswordChangeDataHandle : NSObject

- (instancetype)initWithChangeData:(PowerAuthPasswordChangeData*)changeData;
- (void)clear;

@property (nonatomic, strong, readonly, nullable) PowerAuthPasswordChangeData *changeData;

@end

@implementation PA2PasswordChangeDataHandle

- (instancetype)initWithChangeData:(PowerAuthPasswordChangeData*)changeData
{
    self = [super init];
    if (self) {
        _changeData = changeData;
    }
    return self;
}

- (void)clear
{
    [_changeData secureClear];
    _changeData = nil;
}

- (void)dealloc
{
    [self clear];
}

@end

@implementation PowerAuthModule
{
    PowerAuthObjectRegister * _objectRegister;
}

PAJS_MODULE_REGISTRY

#define PA_BLOCK_START [self usePowerAuth:instanceId reject:reject callback:^(PowerAuthSDK * powerAuth) {
#define PA_BLOCK_END }];

static BOOL PAJSParseAlgorithm(NSString * value, PowerAuthAlgorithm * algorithm)
{
    if ([value isEqualToString:@"legacy"]) {
        *algorithm = PowerAuthAlgorithm_LEGACY_P256;
    } else if ([value isEqualToString:@"p384"]) {
        *algorithm = PowerAuthAlgorithm_EC_P384;
    } else if ([value isEqualToString:@"p384l3"]) {
        *algorithm = PowerAuthAlgorithm_EC_P384_ML_L3;
    } else if ([value isEqualToString:@"p384l5"]) {
        *algorithm = PowerAuthAlgorithm_EC_P384_ML_L5;
    } else {
        return NO;
    }
    return YES;
}

static NSString * PAJSAlgorithmToString(PowerAuthAlgorithm algorithm)
{
    switch (algorithm) {
        case PowerAuthAlgorithm_LEGACY_P256: return @"legacy";
        case PowerAuthAlgorithm_EC_P384: return @"p384";
        case PowerAuthAlgorithm_EC_P384_ML_L3: return @"p384l3";
        case PowerAuthAlgorithm_EC_P384_ML_L5: return @"p384l5";
        default: return nil;
    }
}

static BOOL PAJSParseSignatureKeyId(
    NSString * value,
    PowerAuthSignatureKeyId * keyId,
    RCTPromiseRejectBlock reject)
{
    if ([value isEqualToString:@"master"]) {
        *keyId = PowerAuthSignatureKeyId_Master;
    } else if ([value isEqualToString:@"masterEc"]) {
        *keyId = PowerAuthSignatureKeyId_Master_EC;
    } else if ([value isEqualToString:@"masterMlDsa"]) {
        *keyId = PowerAuthSignatureKeyId_Master_ML_DSA;
    } else if ([value isEqualToString:@"server"]) {
        *keyId = PowerAuthSignatureKeyId_Server;
    } else if ([value isEqualToString:@"serverEc"]) {
        *keyId = PowerAuthSignatureKeyId_Server_EC;
    } else if ([value isEqualToString:@"serverMlDsa"]) {
        *keyId = PowerAuthSignatureKeyId_Server_ML_DSA;
    } else if ([value isEqualToString:@"device"]) {
        *keyId = PowerAuthSignatureKeyId_Device;
    } else if ([value isEqualToString:@"deviceEc"]) {
        *keyId = PowerAuthSignatureKeyId_Device_EC;
    } else if ([value isEqualToString:@"deviceMlDsa"]) {
        *keyId = PowerAuthSignatureKeyId_Device_ML_DSA;
    } else if ([value isEqualToString:@"macPersonalized"]) {
        *keyId = PowerAuthSignatureKeyId_MacPersonalized;
    } else {
        reject(EC_WRONG_PARAMETER, [NSString stringWithFormat:@"Unknown signature key identifier: %@", value], nil);
        return NO;
    }
    return YES;
}

static PowerAuthConfiguration * PAJSBuildConfiguration(
    NSString * instanceId,
    NSDictionary * configuration,
    NSDictionary * sharingConfiguration,
    RCTPromiseRejectBlock reject)
{
    NSString * baseEndpointUrl = CAST_TO(configuration[@"baseEndpointUrl"], NSString);
    NSString * configurationString = CAST_TO(configuration[@"configuration"], NSString);
    NSString * algorithmString = CAST_TO(configuration[@"algorithm"], NSString);
    PowerAuthConfiguration * config;
    if (algorithmString) {
        PowerAuthAlgorithm algorithm;
        if (!PAJSParseAlgorithm(algorithmString, &algorithm)) {
            reject(EC_WRONG_PARAMETER, [NSString stringWithFormat:@"Unknown PowerAuth algorithm: %@", algorithmString], nil);
            return nil;
        }
        config = [[PowerAuthConfiguration alloc] initWithInstanceId:instanceId
                                                   baseEndpointUrl:baseEndpointUrl
                                                     configuration:configurationString
                                                         algorithm:algorithm];
    } else {
        config = [[PowerAuthConfiguration alloc] initWithInstanceId:instanceId
                                                   baseEndpointUrl:baseEndpointUrl
                                                     configuration:configurationString];
    }
    NSNumber * componentLength = CAST_TO(configuration[@"offlineAuthenticationCodeComponentLength"], NSNumber);
    if (componentLength) {
        config.offlineAuthenticationCodeComponentLength = componentLength.unsignedIntegerValue;
    }
    if (CAST_TO(sharingConfiguration[@"isProvided"], NSNumber).boolValue) {
        PowerAuthSharingConfiguration * sharingConfig = [[PowerAuthSharingConfiguration alloc] initWithAppGroup:CAST_TO(sharingConfiguration[@"appGroup"], NSString)
                                                                                                  appIdentifier:CAST_TO(sharingConfiguration[@"appIdentifier"], NSString)
                                                                                            keychainAccessGroup:CAST_TO(sharingConfiguration[@"keychainAccessGroup"], NSString)];
        sharingConfig.sharedMemoryIdentifier = CAST_TO(sharingConfiguration[@"sharedMemoryIdentifier"], NSString);
        config.sharingConfiguration = sharingConfig;
    }
    NSError * validationError = nil;
    if (![config validateConfiguration:&validationError]) {
        reject(EC_WRONG_PARAMETER, validationError.localizedDescription ?: @"Provided configuration is invalid", validationError);
        return nil;
    }
    return config;
}

static NSDictionary * PAJSConfigurationToDictionary(PowerAuthConfiguration * configuration)
{
    NSString * algorithm = PAJSAlgorithmToString(configuration.algorithm);
    if (!algorithm) {
        return nil;
    }
    return @{
        @"configuration": configuration.configuration,
        @"baseEndpointUrl": configuration.baseEndpointUrl,
        @"algorithm": algorithm,
        @"offlineAuthenticationCodeComponentLength": @(configuration.offlineAuthenticationCodeComponentLength)
    };
}

static NSDictionary * PAJSClientConfigurationToDictionary(PowerAuthClientConfiguration * configuration)
{
    return @{
        @"enableUnsecureTraffic": @([configuration.sslValidationStrategy isKindOfClass:[PowerAuthClientSslNoValidationStrategy class]]),
        @"connectionTimeout": @(configuration.defaultRequestTimeout),
        @"readTimeout": @(configuration.defaultRequestTimeout)
    };
}

static NSDictionary * PAJSBiometricConfigurationToDictionary(PowerAuthBiometricConfiguration * configuration)
{
    return @{
        @"invalidateBiometricFactorAfterChange": @(configuration.invalidateBiometricFactorAfterChange),
        @"fallbackToDevicePasscode": @(configuration.allowFallbackToDevicePasscode),
        @"confirmBiometricAuthentication": @NO,
        @"authenticateOnBiometricKeySetup": @YES,
        @"fallbackToSharedBiometryKey": @YES,
        @"useLegacySymmetricKey": @NO
    };
}

static NSDictionary * PAJSSharingConfigurationToDictionary(PowerAuthSharingConfiguration * configuration)
{
    NSMutableDictionary * result = [@{
        @"appGroup": configuration.appGroup,
        @"appIdentifier": configuration.appIdentifier,
        @"keychainAccessGroup": configuration.keychainAccessGroup
    } mutableCopy];
    if (configuration.sharedMemoryIdentifier) {
        result[@"sharedMemoryIdentifier"] = configuration.sharedMemoryIdentifier;
    }
    return result;
}

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

PAJS_METHOD_START(cleanupInstanceData,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(configuration, NSDictionary*)
                  PAJS_ARGUMENT(keychainConfiguration, NSDictionary*)
                  PAJS_ARGUMENT(sharingConfiguration, NSDictionary*))
{
    @synchronized (self) {
        if (![self validateInstanceId:instanceId reject:reject]) {
            return;
        }
        if ([_objectRegister findObjectWithId:instanceId expectedClass:[PowerAuthSDK class]]) {
            reject(EC_WRONG_PARAMETER, @"Cannot clean up data for a configured PowerAuth instance.", nil);
            return;
        }
        PowerAuthConfiguration * config = PAJSBuildConfiguration(instanceId, configuration, sharingConfiguration, reject);
        if (!config) {
            return;
        }
        PowerAuthKeychainConfiguration * keychainConfig = [[PowerAuthKeychainConfiguration sharedInstance] copy];
        keychainConfig.keychainAttribute_AccessGroup = CAST_TO(keychainConfiguration[@"accessGroupName"], NSString);
        keychainConfig.keychainAttribute_UserDefaultsSuiteName = CAST_TO(keychainConfiguration[@"userDefaultsSuiteName"], NSString);
        NSError * error = nil;
        if ([PowerAuthSDK cleanupInstanceDataForConfiguration:config keychainConfiguration:keychainConfig error:&error]) {
            resolve(nil);
        } else {
            ProcessError(error, reject);
        }
    }
}
PAJS_METHOD_END

PAJS_METHOD_START(getConfiguration,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    NSDictionary * configuration = PAJSConfigurationToDictionary(powerAuth.configuration);
    if (configuration) {
        resolve(configuration);
    } else {
        reject(EC_WRONG_PARAMETER, @"Native SDK returned an unknown PowerAuth algorithm.", nil);
    }
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(getCurrentAlgorithm,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    NSString * algorithm = PAJSAlgorithmToString(powerAuth.currentAlgorithm);
    if (algorithm) {
        resolve(algorithm);
    } else {
        reject(EC_WRONG_PARAMETER, @"Native SDK returned an unknown PowerAuth algorithm.", nil);
    }
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(beginPasswordChange,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(oldPassword, id))
{
    PA_BLOCK_START
    PowerAuthCorePassword * coreOldPassword = UsePassword(oldPassword, _objectRegister, reject);
    if (!coreOldPassword) {
        return;
    }
    PowerAuthCorePassword * immutableOldPassword = [coreOldPassword copyToImmutable];
    [powerAuth beginPasswordChangeWithCorePassword:immutableOldPassword callback:^(PowerAuthPasswordChangeData * changeData, NSError * error) {
        if (error) {
            [immutableOldPassword secureClear];
            ProcessError(error, reject);
            return;
        }
        if (!changeData) {
            [immutableOldPassword secureClear];
            reject(EC_REACT_NATIVE_ERROR, @"PowerAuth SDK returned neither password-change data nor an error.", nil);
            return;
        }
        PA2PasswordChangeDataHandle * handle = [[PA2PasswordChangeDataHandle alloc] initWithChangeData:changeData];
        NSString * objectId = [_objectRegister registerObject:handle
                                              ifOwnerMatches:powerAuth
                                                     ownerId:instanceId
                                                    policies:@[ RP_EXPIRE(PASSWORD_CHANGE_DATA_EXPIRE_TIME) ]];
        if (!objectId) {
            [handle clear];
            reject(EC_INSTANCE_NOT_CONFIGURED, @"PowerAuth instance is no longer configured.", nil);
            return;
        }
        resolve(objectId);
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(finishPasswordChange,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(newPassword, id)
                  PAJS_ARGUMENT(passwordChangeDataId, NSString*))
{
    PA_BLOCK_START
    PA2PasswordChangeDataHandle * handle =
        [_objectRegister takeObjectWithId:passwordChangeDataId
                            expectedClass:[PA2PasswordChangeDataHandle class]
                           ifOwnerMatches:powerAuth
                                  ownerId:instanceId];
    PowerAuthPasswordChangeData * changeData = handle.changeData;
    if (!changeData) {
        reject(EC_INVALID_NATIVE_OBJECT, @"Password-change data object is no longer valid.", nil);
        return;
    }
    PowerAuthCorePassword * coreNewPassword = UsePassword(newPassword, _objectRegister, reject);
    if (!coreNewPassword) {
        [handle clear];
        return;
    }
    PowerAuthCorePassword * immutableNewPassword = [coreNewPassword copyToImmutable];
    [powerAuth finishPasswordChangeWithNewCorePassword:immutableNewPassword changeData:changeData callback:^(NSError * error) {
        [immutableNewPassword secureClear];
        [handle clear];
        if (error) {
            ProcessError(error, reject);
        } else {
            resolve(nil);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(getClientConfiguration,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(PAJSClientConfigurationToDictionary(powerAuth.clientConfiguration));
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(getBiometryConfiguration,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(PAJSBiometricConfigurationToDictionary(powerAuth.biometricConfiguration));
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(getKeychainConfiguration,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(nil);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(getSharingConfiguration,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    PowerAuthSharingConfiguration * sharingConfiguration = powerAuth.configuration.sharingConfiguration;
    resolve(sharingConfiguration ? PAJSSharingConfigurationToDictionary(sharingConfiguration) : nil);
    PA_BLOCK_END
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
    @synchronized (self) {
        if (![self validateInstanceId:instanceId reject:reject]) {
            return;
        }

        PowerAuthConfiguration * config = PAJSBuildConfiguration(instanceId, configuration, sharingConfiguration, reject);
        if (!config) {
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

        // Preserve deprecated Apple keychain settings for existing applications. New applications
        // should use PowerAuthSharingConfiguration.
        PowerAuthKeychainConfiguration * keychainConfig = [[PowerAuthKeychainConfiguration sharedInstance] copy];
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
}
PAJS_METHOD_END

PAJS_METHOD_START(deconfigure,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    @synchronized (self) {
        if ([self validateInstanceId:instanceId reject:reject]) {
            [_objectRegister removeAllObjectsWithTag:instanceId];
            resolve(@YES);
        }
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

PAJS_METHOD_START(hasProtocolUpgradeAvailable,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(@([powerAuth hasProtocolUpgradeAvailable]));
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(hasPendingProtocolUpgrade,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    PA_BLOCK_START
    resolve(@([powerAuth hasPendingProtocolUpgrade]));
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(startProtocolUpgrade,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(password, id)
                  PAJS_BOOL_ARGUMENT(upgradeBiometry))
{
    PA_BLOCK_START
    PowerAuthCorePassword * corePassword = [UsePassword(password, _objectRegister, reject) copyToImmutable];
    if (!corePassword) {
        return;
    }
    // Apple platforms preserve the biometric factor automatically.
    (void)upgradeBiometry;
    [powerAuth startProtocolUpgradeWithCorePassword:corePassword callback:^(PowerAuthProtocolUpgradeResult * result, NSError * error) {
        // Keep the immutable password alive until the asynchronous operation completes.
        (void)corePassword;
        if (error) {
            ProcessError(error, reject);
        } else if (result) {
            resolve(@{
                @"activationStatusFetchRequired": @(result.activationStatusFetchRequired),
                @"activationFingerprint": result.activationFingerprint ?: [NSNull null],
                @"biometryFactorRemoved": @NO
            });
        } else {
            reject(EC_REACT_NATIVE_ERROR, @"PowerAuth SDK returned neither a protocol upgrade result nor an error.", nil);
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

PAJS_METHOD_START(verifyDigitalSignature,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(signature, PAJS_NONNULL_ARGUMENT NSString*)
                  PAJS_ARGUMENT(data, PAJS_NONNULL_ARGUMENT NSString*)
                  PAJS_ARGUMENT(signatureKeyId, PAJS_NONNULL_ARGUMENT NSString*))
{
    PA_BLOCK_START
    NSData * decodedSignature = DecodeNSDataValue(signature, DF_BASE64, reject);
    if (!decodedSignature) {
        return;
    }
    NSData * decodedData = DecodeNSDataValue(data, DF_BASE64, reject);
    if (!decodedData) {
        return;
    }
    PowerAuthSignatureKeyId keyId;
    if (!PAJSParseSignatureKeyId(signatureKeyId, &keyId, reject)) {
        return;
    }
    NSError * error = nil;
    if ([powerAuth verifyDigitalSignature:decodedSignature signedData:decodedData keyIdentifier:keyId error:&error]) {
        resolve(nil);
    } else if (error) {
        ProcessError(error, reject);
    } else {
        reject(EC_UNKNOWN_ERROR, @"PowerAuth SDK failed to verify a digital signature without an error.", nil);
    }
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(calculateDigitalSignature,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(data, PAJS_NONNULL_ARGUMENT NSString*)
                  PAJS_ARGUMENT(signatureKeyId, PAJS_NONNULL_ARGUMENT NSString*))
{
    PA_BLOCK_START
    PowerAuthAuthentication * auth = [self constructAuthentication:authDict reject:reject forPersist:NO];
    if (!auth) {
        return;
    }
    NSData * decodedData = DecodeNSDataValue(data, DF_BASE64, reject);
    if (!decodedData) {
        return;
    }
    PowerAuthSignatureKeyId keyId;
    if (!PAJSParseSignatureKeyId(signatureKeyId, &keyId, reject)) {
        return;
    }
    [powerAuth calculateDigitalSignature:auth dataToSign:decodedData keyIdentifier:keyId callback:^(NSData * signature, NSError * error) {
        (void)auth;
        if (error) {
            ProcessError(error, reject);
        } else if (signature) {
            resolve([signature base64EncodedStringWithOptions:0]);
        } else {
            reject(EC_UNKNOWN_ERROR, @"PowerAuth SDK returned neither a digital signature nor an error.", nil);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(exportDevicePublicKeys,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(format, PAJS_NONNULL_ARGUMENT NSString*))
{
    PA_BLOCK_START
    PowerAuthDevicePublicKeyFormat nativeFormat;
    if ([format isEqualToString:@"der"]) {
        nativeFormat = PowerAuthDevicePublicKeyFormat_Der;
    } else if ([format isEqualToString:@"raw"]) {
        nativeFormat = PowerAuthDevicePublicKeyFormat_Raw;
    } else {
        reject(EC_WRONG_PARAMETER, [NSString stringWithFormat:@"Unknown device public key format: %@", format], nil);
        return;
    }
    NSError * error = nil;
    NSArray<PowerAuthDevicePublicKeyData*> * keys = [powerAuth exportDevicePublicKeysToFormat:nativeFormat error:&error];
    if (error) {
        ProcessError(error, reject);
        return;
    }
    if (!keys) {
        reject(EC_UNKNOWN_ERROR, @"PowerAuth SDK returned neither device public keys nor an error.", nil);
        return;
    }
    NSMutableArray * result = [[NSMutableArray alloc] initWithCapacity:keys.count];
    for (PowerAuthDevicePublicKeyData * key in keys) {
        NSString * keyType;
        switch (key.keyType) {
            case PowerAuthSignatureKeyType_EC:
                keyType = @"ec";
                break;
            case PowerAuthSignatureKeyType_ML_DSA:
                keyType = @"mlDsa";
                break;
            default:
                reject(EC_UNKNOWN_ERROR, @"PowerAuth SDK returned an unknown signature key type.", nil);
                return;
        }
        [result addObject:@{
            @"keyType": keyType,
            @"keyAlgorithm": key.keyAlgorithm,
            @"keyData": [key.keyData base64EncodedStringWithOptions:0]
        }];
    }
    resolve(result);
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(verifyJwsSignature,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(signature, PAJS_NONNULL_ARGUMENT NSString*)
                  PAJS_BOOL_ARGUMENT(compact)
                  PAJS_BOOL_ARGUMENT(strict)
                  PAJS_ARGUMENT(signatureKeyId, PAJS_NONNULL_ARGUMENT NSString*))
{
    PA_BLOCK_START
    PowerAuthSignatureKeyId keyId;
    if (!PAJSParseSignatureKeyId(signatureKeyId, &keyId, reject)) {
        return;
    }
    NSError * error = nil;
    if ([powerAuth verifyJwsSignature:signature compact:compact strict:strict keyIdentifier:keyId error:&error]) {
        resolve(nil);
    } else if (error) {
        ProcessError(error, reject);
    } else {
        reject(EC_UNKNOWN_ERROR, @"PowerAuth SDK failed to verify a JWS signature without an error.", nil);
    }
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(calculateJwsSignature,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(data, PAJS_NONNULL_ARGUMENT NSString*)
                  PAJS_ARGUMENT(dataType, PAJS_NULLABLE_ARGUMENT NSString*)
                  PAJS_BOOL_ARGUMENT(compact)
                  PAJS_ARGUMENT(signatureKeyId, PAJS_NONNULL_ARGUMENT NSString*))
{
    PA_BLOCK_START
    PowerAuthAuthentication * auth = [self constructAuthentication:authDict reject:reject forPersist:NO];
    if (!auth) {
        return;
    }
    NSData * decodedData = DecodeNSDataValue(data, DF_BASE64, reject);
    if (!decodedData) {
        return;
    }
    PowerAuthSignatureKeyId keyId;
    if (!PAJSParseSignatureKeyId(signatureKeyId, &keyId, reject)) {
        return;
    }
    [powerAuth calculateJwsSignature:auth
                         dataToSign:decodedData
                           dataType:dataType
                            compact:compact
                      keyIdentifier:keyId
                           callback:^(NSString * signature, NSError * error) {
        (void)auth;
        if (error) {
            ProcessError(error, reject);
        } else if (signature) {
            resolve(signature);
        } else {
            reject(EC_UNKNOWN_ERROR, @"PowerAuth SDK returned neither a JWS signature nor an error.", nil);
        }
    }];
    PA_BLOCK_END
}
PAJS_METHOD_END

PAJS_METHOD_START(createCertificateSigningRequest,
                  PAJS_ARGUMENT(instanceId, NSString*)
                  PAJS_ARGUMENT(authDict, NSDictionary*)
                  PAJS_ARGUMENT(distinguishedNames, NSDictionary*)
                  PAJS_ARGUMENT(subjectAltNames, PAJS_NULLABLE_ARGUMENT NSArray*)
                  PAJS_ARGUMENT(signatureKeyId, PAJS_NONNULL_ARGUMENT NSString*))
{
    PA_BLOCK_START
    PowerAuthAuthentication * auth = [self constructAuthentication:authDict reject:reject forPersist:NO];
    if (!auth) {
        return;
    }
    PowerAuthSignatureKeyId keyId;
    if (!PAJSParseSignatureKeyId(signatureKeyId, &keyId, reject)) {
        return;
    }
    [powerAuth createCertificateSigningRequestWithAuthentication:auth
                                              distinguishedNames:distinguishedNames
                                                 subjectAltNames:subjectAltNames
                                                   keyIdentifier:keyId
                                                        callback:^(NSString * csr, NSError * error) {
        (void)auth;
        if (error) {
            ProcessError(error, reject);
        } else if (csr) {
            resolve(csr);
        } else {
            reject(EC_UNKNOWN_ERROR, @"PowerAuth SDK returned neither a certificate signing request nor an error.", nil);
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
