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

#import "Errors.h"
#import "PowerAuthObjectRegister.h"
#import <React/RCTConvert.h>

@import PowerAuthCore;

id CastObjectTo(id instance, Class desiredClass) {
    if ([instance isKindOfClass:desiredClass]) {
        return instance;
    }
    return nil;
}

id PatchNull(id object) {
    if (object == [NSNull null]) {
        return nil;
    }
    if ([object isKindOfClass:[NSDictionary class]]) {
        // Key-value dictionary
        NSMutableDictionary * newObject = [object mutableCopy];
        [(NSDictionary*)object enumerateKeysAndObjectsUsingBlock:^(id key, id value, BOOL * stop) {
            newObject[key] = PatchNull(value);
        }];
        return newObject;
    }
    return object;
}

NSString * GetNSStringValueFromDict(NSDictionary * dict, NSString * key)
{
    id value = dict[key];
    if (value == nil || value == [NSNull null]) {
        return nil;
    }
    return [RCTConvert NSString:value];
}

id GetValueAtPathFromDict(NSDictionary * dict, NSString * path, Class expectedClass)
{
    NSArray * pathComponents = [path componentsSeparatedByString:@"."];
    NSUInteger lastIndex = pathComponents.count - 1;
    __block id result = nil;
    __block NSDictionary * currentDict = dict;
    [pathComponents enumerateObjectsUsingBlock:^(NSString * component, NSUInteger idx, BOOL * stop) {
        if (idx == lastIndex) {
            result = CastObjectTo(currentDict[component], expectedClass);
        } else {
            currentDict = CastObjectTo(currentDict[component], [NSDictionary class]);
            if (!currentDict) {
                *stop = YES;
            }
        }
    }];
    return result;
}

NSData * GetNSDataValueFromDict(NSDictionary * dict, NSString * key)
{
    NSString * encodedData = GetNSStringValueFromDict(dict, key);
    if (encodedData) {
        return [[NSData alloc] initWithBase64EncodedString:encodedData options:NSDataBase64DecodingIgnoreUnknownCharacters];
    }
    return nil;
}

/// Function translate object into PowerAuthCorePassword. If such conversion is not possible then use reject promise to
/// report an error. The password object is marked as used or touched if found in register.
/// - Parameters:
///   - anyPassword: Object to convert into PowerAuthCorePassword.
///   - objectRegister: Object register instance.
///   - reject: Reject function to call in case of failure
///   - use: If YES then object is marked as used, otherwise touched.
static PowerAuthCorePassword * FindPasswordImpl(id anyPassword, PowerAuthObjectRegister * objectRegister, RCTPromiseRejectBlock reject, BOOL use)
{
    if ([anyPassword isKindOfClass:[NSString class]]) {
        // Password is in form of string
        return [PowerAuthCorePassword passwordWithString:anyPassword];
    }
    if ([anyPassword isKindOfClass:[NSDictionary class]]) {
        // It appears that this is an object
        id passwordObjectId = [(NSDictionary*)anyPassword objectForKey:@"passwordObjectId"];
        if (!passwordObjectId) {
            // Object identifier is not present in the object. This means that wrong object is passed to call,
            // or PowerAuthPassword javascript object is not initialized yet.
            reject(EC_WRONG_PARAMETER, @"PowerAuthPassword is not initialized", nil);
            return nil;
        }
        PowerAuthCorePassword * password = use
            ? [objectRegister useObjectWithId:passwordObjectId expectedClass:[PowerAuthCorePassword class]]
            : [objectRegister touchObjectWithId:passwordObjectId expectedClass:[PowerAuthCorePassword class]];
        if (!password) {
            reject(EC_INVALID_NATIVE_OBJECT, @"PowerAuthPassword object is no longer valid", nil);
            return nil;
        }
        return password;
    }
    reject(EC_WRONG_PARAMETER, @"PowerAuthPassword or string is required", nil);
    return nil;
}

PowerAuthCorePassword * UsePassword(id anyPassword, PowerAuthObjectRegister * objectRegister, RCTPromiseRejectBlock reject)
{
    return FindPasswordImpl(anyPassword, objectRegister, reject, YES);
}

PowerAuthCorePassword * TouchPassword(id anyPassword, PowerAuthObjectRegister * objectRegister, RCTPromiseRejectBlock reject)
{
    return FindPasswordImpl(anyPassword, objectRegister, reject, NO);
}
