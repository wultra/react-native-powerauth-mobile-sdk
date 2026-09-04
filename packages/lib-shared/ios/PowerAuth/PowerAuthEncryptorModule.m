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

@import PowerAuth2;

@implementation PowerAuthEncryptorModule
{
    PowerAuthObjectRegister * _objectRegister;
}

PAJS_MODULE_REGISTRY

RCT_EXPORT_MODULE(PowerAuthEncryptor);

- (void) PAJS_INITIALIZE_METHOD
{
    PAJS_OBJECT_REGISTER
}

+ (BOOL) requiresMainQueueSetup
{
    return NO;
}

PAJS_METHOD_START(initialize,
                  PAJS_ARGUMENT(scope, NSString*)
                  PAJS_ARGUMENT(ownerId, NSString*))
{
    NSString * scopeType = [RCTConvert NSString:scope];
    BOOL activationScope;
    if ([scopeType isEqualToString:@"APPLICATION"]) {
        activationScope = NO;
    } else if ([scopeType isEqualToString:@"ACTIVATION"]) {
        activationScope = YES;
    } else {
        reject(EC_WRONG_PARAMETER, @"scope parameter is missing or contains invalid value", nil);
        return;
    }

    PowerAuthSDK * sdk = GetPowerAuthSdk(ownerId, _objectRegister, reject);
    if (!sdk) {
        return;
    }

    void (^callback)(PowerAuthEncryptor*, NSError*) = ^(PowerAuthEncryptor * encryptor, NSError * error) {
        if (!encryptor) {
            ProcessError(error, reject);
            return;
        }
        NSString * objectId = [self->_objectRegister registerObject:encryptor
                                                     ifOwnerMatches:sdk
                                                            ownerId:ownerId
                                                           policies:@[ RP_KEEP_ALIVE(ENCRYPTOR_KEEP_ALIVE_TIME) ]];
        if (!objectId) {
            reject(EC_INSTANCE_NOT_CONFIGURED, @"PowerAuth instance is no longer configured", nil);
            return;
        }
        resolve(objectId);
    };

    if (activationScope) {
        [sdk encryptorForActivationScopeWithCallback:callback];
    } else {
        [sdk encryptorForApplicationScopeWithCallback:callback];
    }
}
PAJS_METHOD_END

PAJS_METHOD_START(canEncryptRequest,
                  PAJS_ARGUMENT(encryptorId, NSString*))
{
    PowerAuthEncryptor * encryptor = [_objectRegister touchObjectWithId:encryptorId
                                                         expectedClass:[PowerAuthEncryptor class]];
    if (!encryptor) {
        reject(EC_INVALID_NATIVE_OBJECT, @"Encryptor object is no longer valid", nil);
        return;
    }
    resolve(@(encryptor.canEncryptRequest));
}
PAJS_METHOD_END

PAJS_METHOD_START(canDecryptResponse,
                  PAJS_ARGUMENT(encryptorId, NSString*))
{
    PowerAuthEncryptor * encryptor = [_objectRegister touchObjectWithId:encryptorId
                                                         expectedClass:[PowerAuthEncryptor class]];
    if (!encryptor) {
        reject(EC_INVALID_NATIVE_OBJECT, @"Encryptor object is no longer valid", nil);
        return;
    }
    resolve(@(encryptor.canDecryptResponse));
}
PAJS_METHOD_END

PAJS_METHOD_START(encryptRequest,
                  PAJS_ARGUMENT(encryptorId, NSString*)
                  PAJS_ARGUMENT(requestBodyBase64, NSString*))
{
    NSData * clearBody = requestBodyBase64
        ? [[NSData alloc] initWithBase64EncodedString:requestBodyBase64 options:0]
        : nil;
    if (requestBodyBase64 && !clearBody) {
        reject(EC_WRONG_PARAMETER, @"Request body is not valid Base64", nil);
        return;
    }
    PowerAuthEncryptor * encryptor = [_objectRegister touchObjectWithId:encryptorId
                                                         expectedClass:[PowerAuthEncryptor class]];
    if (!encryptor) {
        reject(EC_INVALID_NATIVE_OBJECT, @"Encryptor object is no longer valid", nil);
        return;
    }
    NSError * encryptionError = nil;
    PowerAuthEncryptedRequest * encryptedRequest = [encryptor encryptRequest:clearBody error:&encryptionError];
    NSString * serializedBody = encryptedRequest
        ? [encryptedRequest.requestBody base64EncodedStringWithOptions:0]
        : nil;
    if (!serializedBody) {
        ProcessError(encryptionError, reject);
        return;
    }
    NSMutableArray * headers = [NSMutableArray arrayWithCapacity:encryptedRequest.requestHeaders.count];
    for (PowerAuthHttpHeader * header in encryptedRequest.requestHeaders) {
        [headers addObject:@{ @"name": header.key, @"value": header.value }];
    }
    resolve(@{ @"requestBody": serializedBody, @"requestHeaders": headers });
}
PAJS_METHOD_END

PAJS_METHOD_START(decryptResponse,
                  PAJS_ARGUMENT(encryptorId, NSString*)
                  PAJS_ARGUMENT(responseBodyBase64, NSString*))
{
    PowerAuthEncryptor * encryptor = [_objectRegister touchObjectWithId:encryptorId
                                                         expectedClass:[PowerAuthEncryptor class]];
    NSData * bodyData = [[NSData alloc] initWithBase64EncodedString:responseBodyBase64 options:0];
    if (!bodyData) {
        [_objectRegister releaseObjectWithId:encryptorId];
        reject(EC_WRONG_PARAMETER, @"Response body is not valid Base64", nil);
        return;
    }
    if (!encryptor) {
        [_objectRegister releaseObjectWithId:encryptorId];
        reject(EC_INVALID_NATIVE_OBJECT, @"Encryptor object is no longer valid", nil);
        return;
    }
    NSError * decryptionError = nil;
    PowerAuthEncryptedResponse * encryptedResponse = [[PowerAuthEncryptedResponse alloc] initWithResponseBody:bodyData error:&decryptionError];
    NSData * clearResponse = encryptedResponse
        ? [encryptor decryptResponse:encryptedResponse error:&decryptionError]
        : nil;
    NSString * result = [clearResponse base64EncodedStringWithOptions:0];

    [_objectRegister releaseObjectWithId:encryptorId];

    if (!result) {
        ProcessError(decryptionError, reject);
        return;
    }
    resolve(result);
}
PAJS_METHOD_END

@end
