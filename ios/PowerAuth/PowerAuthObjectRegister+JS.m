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

#import "PowerAuthObjectRegister.h"
#import "PowerAuthData.h"
#import "PAJS.h"
#import "PowerAuthEncryptorModule.h"

@import PowerAuthCore;

/*
 This class category exports several debug methods to JavaScript.
 The 'debug' methods are available only if library is compiled in DEBUG configuration.
 */
@interface PowerAuthObjectRegister (JS) PAJS_MODULE_INVALIDATING
@end

@implementation PowerAuthObjectRegister (JS)

// MARK: - JS interface

// TODO: fixme
- (void) PAJS_INVALIDATE_METHOD
{
    // This is invoked by RN bridge when devmode reload is requested.
    // We should remove all objects from the register.
    [self removeAllObjectsWithTag:nil];
}

+ (BOOL) requiresMainQueueSetup
{
    return NO;
}

PAJS_METHOD_START(isValidNativeObject,
                  PAJS_ARGUMENT(objectId, id))
{
    resolve(@([self containsObjectWithId:objectId]));
}
PAJS_METHOD_END

#if DEBUG

// MARK: - JS DEBUG

PAJS_METHOD_START(debugDump,
                  PAJS_ARGUMENT(instanceId, id))
{
    resolve([self debugDumpObjectsWithTag:[RCTConvert NSString:instanceId]]);
}
PAJS_METHOD_END

PAJS_METHOD_START(debugCommand,
                  PAJS_ARGUMENT(command, NSString*)
                  PAJS_ARGUMENT(options, NSDictionary*))
{
    NSString * objectId     = [RCTConvert NSString:options[@"objectId"]];
    NSString * objectTag    = [RCTConvert NSString:options[@"objectTag"]];
    NSString * objectType   = [RCTConvert NSString:options[@"objectType"]];
    Class objectClass = Nil;
    if ([@"data" isEqual:objectType] || [@"secure-data" isEqual:objectType]) {
        objectClass = [PowerAuthData class];
    } else if ([@"number" isEqual:objectType]) {
        objectClass = [NSNumber class];
    } else if ([@"password" isEqual:objectType]) {
        objectClass = [PowerAuthCoreMutablePassword class];
    } else if ([@"encryptor" isEqual:objectType]) {
        objectClass = [PowerAuthJsEncryptor class];
    }
    if ([@"create" isEqual:command]) {
        // The "create" command creates a new instance of managed object
        // and returns its ID to JavaScript.
        
        // Prepare Release policy
        NSMutableArray * policies = [NSMutableArray array];
        [[RCTConvert NSStringArray:options[@"releasePolicy"]] enumerateObjectsUsingBlock:^(NSString * policy, NSUInteger idx, BOOL * stop) {
            NSArray * components = [policy componentsSeparatedByString:@" "];
            NSInteger param = [[components lastObject] integerValue];
            if ([@"manual" isEqualToString:policy]) {
                [policies addObject:RP_MANUAL()];
            } else if ([policy hasPrefix:@"afterUse"]) {
                [policies addObject:RP_AFTER_USE(param)];
            } else if ([policy hasPrefix:@"keepAlive"]) {
                [policies addObject:RP_KEEP_ALIVE(param)];
            } else if ([policy hasPrefix:@"expire"]) {
                [policies addObject:RP_EXPIRE(param)];
            }
        }];
        if (policies.count > 0) {
            // Create new object
            id instance = nil;
            if ([@"data" isEqual:objectType]) {
                NSData * td = [@"TEST-DATA" dataUsingEncoding:NSUTF8StringEncoding];
                instance = [[PowerAuthData alloc] initWithData:td cleanup:NO];
            } else if ([@"secure-data" isEqual:objectType]) {
                NSData * td = [[@"SECURE-DATA" dataUsingEncoding:NSUTF8StringEncoding] mutableCopy];
                instance = [[PowerAuthData alloc] initWithData:td cleanup:YES];
            } else if ([@"number" isEqual:objectType]) {
                instance = [[NSNumber alloc] initWithInt:42];
            } else if ([@"password" isEqual:objectType]) {
                instance = [PowerAuthCoreMutablePassword mutablePassword];
            }
            if (instance) {
                NSString * objectId = [self registerObject:instance tag:objectTag policies:policies];
                resolve(objectId);
                return;
            }
        }
    } else if ([@"release" isEqual:command]) {
        // The "release" command release object with given identifier and returns true / false whether object was removed.
        if (objectId) {
            // release allows to release any object
            resolve([self removeObjectWithId:objectId expectedClass:objectClass] != nil ? @YES : @NO);
            return;
        }
    } else if ([@"releaseAll" isEqual:command]) {
        // The "releaseAll" command release all objects with a specified tag. If tag is nil, then releases all objects
        // from the register.
        [self removeAllObjectsWithTag:objectTag];
        resolve(nil);
        return;
    } else if ([@"use" isEqual:command]) {
        // The "use" command find object and mark it as used and returns true / false whether object was found.
        if (objectClass && objectId) {
            resolve([self useObjectWithId:objectId expectedClass:objectClass] != nil ? @YES : @NO);
            return;
        }
    } else if ([@"find" isEqual:command]) {
        // The "find" command just find the object in the register and returns true / false if object still exists.
        if (objectClass && objectId) {
            resolve([self findObjectWithId:objectId expectedClass:objectClass] != nil ? @YES : @NO);
            return;
        }
    } else if ([@"touch" isEqual:command]) {
        // The "touch" command prolongs lifetime of object in the register and returns true / false if object still exists.
        if (objectClass && objectId) {
            resolve([self touchObjectWithId:objectId expectedClass:objectClass] != nil ? @YES : @NO);
            return;
        }
    } else if ([@"setPeriod" isEqual:command]) {
        [self setCleanupPeriod:[[RCTConvert NSNumber:options[@"cleanupPeriod"]] integerValue]];
        resolve(nil);
        return;
    }
    reject(EC_WRONG_PARAMETER, [NSString stringWithFormat:@"Wrong parameter for cmd %@, %@", command, options], nil);
}
PAJS_METHOD_END

#else

// MARK: - JS RELEASE

PAJS_METHOD_START(debugDump,
                  PAJS_ARGUMENT(instanceId, NSString*))
{
    resolve(nil);
}
PAJS_METHOD_END

PAJS_METHOD_START(debugCommand,
                  PAJS_ARGUMENT(command, NSString*)
                  PAJS_ARGUMENT(options, NSDictionary*))
{
    resolve(nil);
}
PAJS_METHOD_END

#endif // DEBUG

@end
