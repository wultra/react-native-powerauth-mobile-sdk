/*
 * Copyright 2022 Wultra s.r.o.
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

#import "PowerAuthPasswordModule.h"
#import "PowerAuthObjectRegister.h"
#import "Utilities.h"
#import "Constants.h"
#import "PAJS.h"

@import PowerAuthCore;

@implementation PowerAuthPasswordModule
{
    PowerAuthObjectRegister * _objectRegister;
}

// MARK: - ReactNative bridge

PAJS_MODULE_REGISTRY

RCT_EXPORT_MODULE(PowerAuthPassword);

- (void) PAJS_INITIALIZE_METHOD
{
    PAJS_OBJECT_REGISTER
}

+ (BOOL) requiresMainQueueSetup
{
    return NO;
}

// MARK: - JS interface

PAJS_METHOD_START(initialize,
                  PAJS_ARGUMENT(destroyAfterUse, BOOL)
                  PAJS_ARGUMENT(ownerId, NSString*)
                  PAJS_ARGUMENT(autoreleaseTime, PAJS_NONNULL_ARGUMENT NSNumber*))
{
    NSString * powerAuthInstanceId = [RCTConvert NSString: ownerId];
    // If owning PowerAuth instnace is specified, then make sure it still exists
    if (powerAuthInstanceId && ![_objectRegister containsObjectWithId:powerAuthInstanceId]) {
        reject(EC_INSTANCE_NOT_CONFIGURED, @"PowerAuth instance is not configured", nil);
        return;
    }
    NSUInteger releaseTime = RP_TIME_INTERVAL(autoreleaseTime, PASSWORD_KEY_KEEP_ALIVE_TIME);
    // Now create and register a new password object
    NSArray * policies = destroyAfterUse
        ? @[ RP_KEEP_ALIVE(releaseTime), RP_AFTER_USE(1) ]
        : @[ RP_KEEP_ALIVE(releaseTime) ];
    resolve([_objectRegister registerObject:[PowerAuthCoreMutablePassword mutablePassword]
                                        tag:powerAuthInstanceId
                                   policies:policies]);
}
PAJS_METHOD_END

PAJS_METHOD_START(release,
                  PAJS_ARGUMENT(objectId, NSString*))
{
    [_objectRegister removeObjectWithId:objectId expectedClass:[PowerAuthCoreMutablePassword class]];
    resolve(nil);
}
PAJS_METHOD_END

PAJS_METHOD_START(clear,
                  PAJS_ARGUMENT(objectId, NSString*))
{
    [self withPassword:objectId rejecter:reject action:^(PowerAuthCoreMutablePassword *password) {
        [password clear];
        resolve(nil);
    }];
}
PAJS_METHOD_END

PAJS_METHOD_START(length,
                  PAJS_ARGUMENT(objectId, NSString*))
{
    [self withPassword:objectId rejecter:reject action:^(PowerAuthCoreMutablePassword *password) {
        resolve(@([password length]));
    }];
}
PAJS_METHOD_END

// TODO: resolve warning
PAJS_METHOD_START(isEqual,
                  PAJS_ARGUMENT(id1, NSString*)
                  PAJS_ARGUMENT(id2, NSString*))
{
    [self withPassword:id1 rejecter:reject action:^(PowerAuthCoreMutablePassword *password1) {
        [self withPassword:id2 rejecter:reject action:^(PowerAuthCoreMutablePassword *password2) {
            resolve([password1 isEqualToPassword:password2] ? @YES : @NO);
        }];
    }];
}
PAJS_METHOD_END

PAJS_METHOD_START(addCharacter,
                  PAJS_ARGUMENT(objectId, NSString*)
                  PAJS_ARGUMENT(character, PAJS_NONNULL_ARGUMENT NSNumber*))
{
    [self withPassword:objectId character:character rejecter:reject action:^(PowerAuthCoreMutablePassword *password, UInt32 character) {
        [password addCharacter:character];
        resolve(@(password.length));
    }];
}
PAJS_METHOD_END

PAJS_METHOD_START(insertCharacter,
                  PAJS_ARGUMENT(objectId, NSString*)
                  PAJS_ARGUMENT(character, PAJS_NONNULL_ARGUMENT NSNumber*)
                  PAJS_ARGUMENT(position, PAJS_NONNULL_ARGUMENT NSNumber*))
{
    [self withPassword:objectId character:character rejecter:reject action:^(PowerAuthCoreMutablePassword *password, UInt32 character) {
        NSInteger pos = [[RCTConvert NSNumber:position] integerValue];
        if (pos >= 0 && pos <= password.length) {
            [password insertCharacter:character atIndex:pos];
            resolve(@(password.length));
        } else {
            reject(EC_WRONG_PARAMETER, @"Position is out of range", nil);
        }
    }];
}
PAJS_METHOD_END

PAJS_METHOD_START(removeCharacter,
                  PAJS_ARGUMENT(objectId, NSString*)
                  PAJS_ARGUMENT(position, PAJS_NONNULL_ARGUMENT NSNumber*))
{
    [self withPassword:objectId rejecter:reject action:^(PowerAuthCoreMutablePassword *password) {
        NSInteger pos = [[RCTConvert NSNumber:position] integerValue];
        if (pos >= 0 && pos < password.length) {
            [password removeCharacterAtIndex:pos];
            resolve(@(password.length));
        } else {
            reject(EC_WRONG_PARAMETER, @"Position is out of range", nil);
        }
    }];
}
PAJS_METHOD_END

PAJS_METHOD_START(removeLastCharacter,
                  PAJS_ARGUMENT(objectId, NSString*))
{
    [self withPassword:objectId rejecter:reject action:^(PowerAuthCoreMutablePassword *password) {
        [password removeLastCharacter];
        resolve(@(password.length));
    }];
}
PAJS_METHOD_END

// MARK: - Private interface

- (void) withPassword:(NSString*)passwordId
             rejecter:(RCTPromiseRejectBlock)reject
               action:(NS_NOESCAPE void(^)(PowerAuthCoreMutablePassword * password))action
{
    PowerAuthCoreMutablePassword * password = [_objectRegister touchObjectWithId:passwordId expectedClass:[PowerAuthCoreMutablePassword class]];
    if (password) {
        action(password);
    } else {
        reject(EC_INVALID_NATIVE_OBJECT, @"Password object is no longer valid", nil);
    }
}

- (void) withPassword:(NSString*)passwordId
            character:(NSNumber*)character
             rejecter:(RCTPromiseRejectBlock)reject
               action:(NS_NOESCAPE void(^)(PowerAuthCoreMutablePassword * password, UInt32 character))action
{
    NSNumber * cp = [RCTConvert NSNumber:character];
    if (!cp) {
        reject(EC_WRONG_PARAMETER, @"Empty or invalid character object", nil);
        return;
    }
    NSUInteger codePoint = [cp unsignedIntValue];
    if (codePoint > CODEPOINT_MAX) {
        reject(EC_WRONG_PARAMETER, @"CodePoint is too big", nil);
        return;
    }
    PowerAuthCoreMutablePassword * password = [_objectRegister touchObjectWithId:passwordId expectedClass:[PowerAuthCoreMutablePassword class]];
    if (password) {
        action(password, (UInt32)codePoint);
    } else {
        reject(EC_INVALID_NATIVE_OBJECT, @"Password object is no longer valid", nil);
    }
}

@end
