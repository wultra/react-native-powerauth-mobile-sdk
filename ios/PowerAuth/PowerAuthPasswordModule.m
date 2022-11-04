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

#import <React/RCTConvert.h>

@import PowerAuthCore;

@implementation PowerAuthPasswordModule
{
    PowerAuthObjectRegister * _objectRegister;
}

// MARK: - ReactNative bridge

@synthesize moduleRegistry = _moduleRegistry;

RCT_EXPORT_MODULE(PowerAuthPassword);

- (void) initialize
{
    // RCTInitializing protocol allows us to get module dependencies before the object is used from JS.
    _objectRegister = [_moduleRegistry moduleForName:"PowerAuthObjectRegister"];
}

+ (BOOL) requiresMainQueueSetup
{
    return NO;
}

// MARK: - JS interface

RCT_EXPORT_METHOD(initialize:(BOOL)destroyAfterUse
                  ownerId:(NSString*)ownerId
                  autoreleaseTime:(nonnull NSNumber*)autoreleaseTime
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    NSString * powerAuthInstanceId = [RCTConvert NSString: ownerId];
    // If owning PowerAuth instnace is specified, then make sure it still exists
    if (powerAuthInstanceId && ![_objectRegister containsObjectWithId:powerAuthInstanceId]) {
        reject(EC_INSTANCE_NOT_CONFIGURED, @"PowerAuth instance is not configured", nil);
        return;
    }
    NSUInteger releaseTime = PASSWORD_KEY_KEEP_ALIVE_TIME;
#if DEBUG
    autoreleaseTime = [RCTConvert NSNumber:autoreleaseTime];
    if (autoreleaseTime) {
        releaseTime = [autoreleaseTime unsignedIntegerValue];
        // Ignore zero result and make sure that time doesn't exceed 5 minutes
        if (releaseTime) {
            releaseTime = MIN(releaseTime, PASSWORD_KEY_KEEP_ALIVE_TIME);
        } else {
            releaseTime = PASSWORD_KEY_KEEP_ALIVE_TIME;
        }
    }
#endif // DEBUG
    // Now create and register a new password object
    NSArray * policies = destroyAfterUse
        ? @[ RP_KEEP_ALIVE(releaseTime), RP_AFTER_USE(1) ]
        : @[ RP_KEEP_ALIVE(releaseTime) ];
    resolve([_objectRegister registerObject:[PowerAuthCoreMutablePassword mutablePassword]
                                        tag:powerAuthInstanceId
                                   policies:policies]);
}

RCT_EXPORT_METHOD(release:(NSString*)objectId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [_objectRegister removeObjectWithId:objectId expectedClass:[PowerAuthCoreMutablePassword class]];
    resolve(nil);
}

RCT_EXPORT_METHOD(clear:(NSString*)objectId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self withPassword:objectId rejecter:reject action:^(PowerAuthCoreMutablePassword *password) {
        [password clear];
        resolve(nil);
    }];
}

RCT_EXPORT_METHOD(length:(NSString*)objectId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self withPassword:objectId rejecter:reject action:^(PowerAuthCoreMutablePassword *password) {
        resolve(@([password length]));
    }];
}

RCT_EXPORT_METHOD(isEqual:(NSString*)id1
                  id2:(NSString*)id2
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self withPassword:id1 rejecter:reject action:^(PowerAuthCoreMutablePassword *password1) {
        [self withPassword:id2 rejecter:reject action:^(PowerAuthCoreMutablePassword *password2) {
            resolve([password1 isEqualToPassword:password2] ? @YES : @NO);
        }];
    }];
}

RCT_EXPORT_METHOD(addCharacter:(NSString*)objectId
                  character:(nonnull NSNumber*)character
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self withPassword:objectId character:character rejecter:reject action:^(PowerAuthCoreMutablePassword *password, UInt32 character) {
        [password addCharacter:character];
        resolve(@(password.length));
    }];
}

RCT_EXPORT_METHOD(insertCharacter:(NSString*)objectId
                  character:(nonnull NSNumber*)character
                  position:(nonnull NSNumber*)position
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
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

RCT_EXPORT_METHOD(removeCharacter:(NSString*)objectId
                  position:(nonnull NSNumber*)position
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
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

RCT_EXPORT_METHOD(removeLastCharacter:(NSString*)objectId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    [self withPassword:objectId rejecter:reject action:^(PowerAuthCoreMutablePassword *password) {
        [password removeLastCharacter];
        resolve(@(password.length));
    }];
}

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
