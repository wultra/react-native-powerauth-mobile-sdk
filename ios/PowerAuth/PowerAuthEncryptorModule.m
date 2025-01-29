/*
 * Copyright 2023 Wultra s.r.o.
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

#import "PowerAuthEncryptorModule.h"
#import "PowerAuthObjectRegister.h"
#import "Constants.h"
#import "Utilities.h"
#import "PAJS.h"

#import <PowerAuth2/PowerAuthSDK.h>
@import PowerAuthCore;

// MARK: - Module

@implementation PowerAuthEncryptorModule
{
    PowerAuthObjectRegister * _objectRegister;
}

// MARK: - ReactNative bridge

PAJS_MODULE_REGISTRY

RCT_EXPORT_MODULE(PowerAuthEncryptor);

- (void) PAJS_INITIALIZE_METHOD
{
    // RCTInitializing protocol allows us to get module dependencies before the object is used from JS.
    PAJS_OBJECT_REGISTER
}

+ (BOOL) requiresMainQueueSetup
{
    return NO;
}

// MARK: - Helpers

/// Touch or use native encryptor object with given identifier.
/// - Parameters:
///   - objectRegister: Native object register
///   - encryptorId: Enccryptor's identifier.
///   - touch: Determine whether "touch" or "use" function will be used to access the register.
///   - reject: Reject function.
///   - action: Action to execute when encryptor exists and can be used.
static void WithEncryptor(PowerAuthObjectRegister * objectRegister, NSString * encryptorId, BOOL touch, RCTPromiseRejectBlock reject, NS_NOESCAPE void(^action)(PowerAuthJsEncryptor * encryptor))
{
    PowerAuthJsEncryptor * encryptor = touch
                            ? [objectRegister touchObjectWithId:encryptorId expectedClass:[PowerAuthJsEncryptor class]]
                            : [objectRegister useObjectWithId:encryptorId expectedClass:[PowerAuthJsEncryptor class]];
    if (encryptor) {
        action(encryptor);
    } else {
        reject(EC_INVALID_NATIVE_OBJECT, @"Encryptor object is no longer valid", nil);
    }
}

- (void) useEncryptor:(NSString*)encryptorId
             rejecter:(RCTPromiseRejectBlock)reject
               action:(NS_NOESCAPE void(^)(PowerAuthJsEncryptor * encryptor))action
{
    WithEncryptor(_objectRegister, encryptorId, NO, reject, action);
}

- (void) touchEncryptor:(NSString*)encryptorId
               rejecter:(RCTPromiseRejectBlock)reject
                 action:(NS_NOESCAPE void(^)(PowerAuthJsEncryptor * encryptor))action
{
    WithEncryptor(_objectRegister, encryptorId, YES, reject, action);
}

// MARK: - JS interface

PAJS_METHOD_START(initialize,
                  PAJS_ARGUMENT(scope, NSString*)
                  PAJS_ARGUMENT(ownerId, NSString*)
                  PAJS_ARGUMENT(autoreleaseTime, PAJS_NONNULL_ARGUMENT NSNumber*))
{
    // Input parameters validation
    NSString * scopeType = [RCTConvert NSString: scope];
    BOOL activationScope;
    if ([scopeType isEqualToString:@"APPLICATION"]) {
        activationScope = NO;
    } else if ([scopeType isEqualToString:@"ACTIVATION"]) {
        activationScope = YES;
    } else {
        reject(EC_WRONG_PARAMETER, @"scope parameter is missing or contains invalid value", nil);
        return;
    }
    // Resolve PowerAuthSDK
    PowerAuthSDK * sdk = GetPowerAuthSdk(ownerId, _objectRegister, reject);
    if (!sdk) {
        return;
    }
    PowerAuthCoreEciesEncryptor * coreEncryptor = activationScope ? [sdk eciesEncryptorForActivationScope] : [sdk eciesEncryptorForApplicationScope];
    if (!coreEncryptor) {
        if (activationScope && ![sdk hasValidActivation]) {
            reject(EC_MISSING_ACTIVATION, nil, nil);
        } else {
            reject(EC_UNKNOWN_ERROR, @"Failed to create ECIES encryptor", nil);
        }
        return;
    }
    // Create container with all required objects and register it to the register
    PowerAuthJsEncryptor * encryptor = [[PowerAuthJsEncryptor alloc] initWithEncryptor:coreEncryptor powerAuthInstanceId:ownerId activationScoped:activationScope];
    NSArray * policies = @[ RP_KEEP_ALIVE(RP_TIME_INTERVAL(autoreleaseTime, ENCRYPTOR_KEEP_ALIVE_TIME)) ];
    NSString * encryptorId = [_objectRegister registerObject:encryptor tag:ownerId policies:policies];
    resolve(encryptorId);
}
PAJS_METHOD_END

PAJS_METHOD_START(release,
                  PAJS_ARGUMENT(encryptorId, NSString*))
{
    [_objectRegister removeObjectWithId:encryptorId expectedClass:[PowerAuthJsEncryptor class]];
    resolve(nil);
}
PAJS_METHOD_END

// MARK: Encryption

/// Determine whether encryptor is able to encrypt the request data. The function also validate state of PowerAuthSDK if
/// encryptor is configured for an activation scope.
/// - Parameters:
///   - encryptor: Encryptor container
///   - objectRegister: Object register.
///   - reject: Reject function
static BOOL CanEncrypt(PowerAuthJsEncryptor * encryptor, PowerAuthObjectRegister * objectRegister, RCTPromiseRejectBlock reject) {
    PowerAuthSDK * sdk = GetPowerAuthSdk(encryptor.powerAuthInstanceId, objectRegister, reject);
    if (!sdk) {
        return NO;
    }
    if (encryptor.activationScoped) {
        if (![sdk hasValidActivation]) {
            if (reject) reject(EC_MISSING_ACTIVATION, nil, nil);
            return NO;
        }
    }
    BOOL result = encryptor.coreEncryptor.canEncryptRequest;
    if (!result && reject) {
        reject(EC_INVALID_ENCRYPTOR, @"Encryptor is not constructed for request encryption", nil);
    }
    return result;
}

PAJS_METHOD_START(canEncryptRequest,
                  PAJS_ARGUMENT(encryptorId, NSString*))
{
    [self touchEncryptor:encryptorId rejecter:reject action:^(PowerAuthJsEncryptor *encryptor) {
        resolve(CanEncrypt(encryptor, _objectRegister, nil) ? @YES : @NO);
    }];
}
PAJS_METHOD_END

PAJS_METHOD_START(encryptRequest,
                  PAJS_ARGUMENT(encryptorId, NSString*)
                  PAJS_ARGUMENT(body, NSString*)
                  PAJS_ARGUMENT(bodyFormat, NSString*))
{
    [self useEncryptor:encryptorId rejecter:reject action:^(PowerAuthJsEncryptor *encryptor) {
        // Input validations
        DataFormat bodyDataFormat = GetPowerAuthDataFormat(bodyFormat, reject);
        if (!bodyDataFormat) {
            return;
        }
        NSData * data = DecodeNSDataValue(body, bodyDataFormat, reject);
        if (!data) {
            return;
        }
        // Test whether this is encryptor
        if (!CanEncrypt(encryptor, _objectRegister, reject)) {
            // If encryption is not available, then remove the object from the register.
            [_objectRegister removeObjectWithId:encryptorId expectedClass:[PowerAuthJsEncryptor class]];
            return;
        }
        // Encrypt
        [encryptor.coreEncryptor encryptRequest:data completion:^(PowerAuthCoreEciesCryptogram * _Nullable cryptogram, PowerAuthCoreEciesEncryptor * _Nullable decryptor) {
            if (!cryptogram || !decryptor) {
                reject(EC_ENCRYPTION_ERROR, @"Failed to encrypt request", nil);
                return;
            }
            PowerAuthCoreEciesMetaData * metadata = decryptor.associatedMetaData;
            if (!metadata) {
                // PA_SDK behavior has been changed...
                reject(EC_INVALID_ENCRYPTOR, @"Incompatible native SDK", nil);
                return;
            }
            // Wrap decryptor and register it in the object register
            PowerAuthJsEncryptor * jsDecryptor = [[PowerAuthJsEncryptor alloc] initWithEncryptor:decryptor powerAuthInstanceId:encryptor.powerAuthInstanceId activationScoped:encryptor.activationScoped];
            NSArray * policies = @[ RP_AFTER_USE(1), RP_EXPIRE(DECRYPTOR_KEEP_ALIVE_TIME) ];
            NSString * decryptorId = [_objectRegister registerObject:jsDecryptor tag:encryptor.powerAuthInstanceId policies:policies];
            // Resolve...
            resolve(@{
                @"cryptogram": @{
                    @"ephemeralPublicKey": cryptogram.keyBase64,
                    @"encryptedData": cryptogram.bodyBase64,
                    @"mac": cryptogram.macBase64,
                    @"nonce": cryptogram.nonceBase64
                },
                @"header": @{
                    @"key": metadata.httpHeaderKey,
                    @"value": metadata.httpHeaderValue
                },
                @"decryptorId": decryptorId
            });
        }];
    }];
}
PAJS_METHOD_END

// MARK: Decryption

/// Determine whether encryptor is able to decrypt the response cryptogram. The function also validate state of PowerAuthSDK if
/// encryptor is configured for an activation scope.
/// - Parameters:
///   - encryptor: Encryptor container.
///   - objectRegister: Object register.
///   - reject: Reject function.
static BOOL CanDecrypt(PowerAuthJsEncryptor * encryptor, PowerAuthObjectRegister * objectRegister, RCTPromiseRejectBlock reject) {
    PowerAuthSDK * sdk = GetPowerAuthSdk(encryptor.powerAuthInstanceId, objectRegister, reject);
    if (!sdk) {
        return NO;
    }
    if (encryptor.activationScoped) {
        if (![sdk hasValidActivation]) {
            if (reject) reject(EC_MISSING_ACTIVATION, nil, nil);
            return NO;
        }
    }
    BOOL result = encryptor.coreEncryptor.canDecryptResponse;
    if (!result && reject) {
        reject(EC_INVALID_ENCRYPTOR, @"Encryptor is not constructed for response decryption", nil);
    }
    return result;
}

PAJS_METHOD_START(canDecryptResponse,
                  PAJS_ARGUMENT(encryptorId, NSString*))
{
    [self touchEncryptor:encryptorId rejecter:reject action:^(PowerAuthJsEncryptor *encryptor) {
        resolve(CanDecrypt(encryptor, _objectRegister, nil) ? @YES : @NO);
    }];
}
PAJS_METHOD_END

PAJS_METHOD_START(decryptResponse,
                  PAJS_ARGUMENT(encryptorId, NSString*)
                  PAJS_ARGUMENT(data, NSDictionary*)
                  PAJS_ARGUMENT(outputFormat, NSString*))
{
    [self useEncryptor:encryptorId rejecter:reject action:^(PowerAuthJsEncryptor *encryptor) {
        // Input validations
        DataFormat dataFormat = GetPowerAuthDataFormat(outputFormat, reject);
        if (!dataFormat) {
            return;
        }
        if (![data isKindOfClass:[NSDictionary class]]) {
            reject(EC_WRONG_PARAMETER, @"cryptogram is not an object", nil);
            return;
        }
        // Test whether this is decryptor
        if (!CanDecrypt(encryptor, _objectRegister, reject)) {
            // Remove object from the register if decryption is no longer available.
            [_objectRegister removeObjectWithId:encryptorId expectedClass:[PowerAuthJsEncryptor class]];
            return;
        }
        // Decrypt
        PowerAuthCoreEciesEncryptor * coreEncryptor = encryptor.coreEncryptor;
        PowerAuthCoreEciesCryptogram * cryptogram = [[PowerAuthCoreEciesCryptogram alloc] init];
        cryptogram.bodyBase64 = [RCTConvert NSString:data[@"encryptedData"]];
        cryptogram.macBase64 = [RCTConvert NSString:data[@"mac"]];
        NSData * response = [coreEncryptor decryptResponse:cryptogram];
        if (!response) {
            reject(EC_ENCRYPTION_ERROR, @"Failed to decrypt response", nil);
            return;
        }
        NSString * result = EncodeNSDataValue(response, dataFormat, reject);
        if (result) {
            resolve(result);
        }
    }];
}
PAJS_METHOD_END

@end


// MARK: - JS object container

@implementation PowerAuthJsEncryptor

- (instancetype) initWithEncryptor:(PowerAuthCoreEciesEncryptor *)encryptor powerAuthInstanceId:(NSString *)powerAuthInstanceId activationScoped:(BOOL)activationScoped
{
    self = [super init];
    if (self) {
        _activationScoped = activationScoped;
        _coreEncryptor = encryptor;
        _powerAuthInstanceId = powerAuthInstanceId;
    }
    return self;
}

@end
