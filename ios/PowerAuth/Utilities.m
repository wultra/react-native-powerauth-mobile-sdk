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
#import "PAJS.h"

#import <PowerAuth2/PowerAuthSDK.h>
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

DataFormat GetPowerAuthDataFormat(NSString * format, RCTPromiseRejectBlock reject)
{
    if (!format) {
        return DF_UTF8;
    } else if ([format isEqualToString:@"UTF8"]) {
        return DF_UTF8;
    } else if ([format isEqualToString:@"BASE64"]) {
        return DF_BASE64;
    }
    if (reject) {
        reject(EC_WRONG_PARAMETER, @"Invalid data format specified", nil);
    }
    return DF_ERROR;
}

NSData * DecodeNSDataValue(NSString * dataValue, DataFormat dataFormat, RCTPromiseRejectBlock reject)
{
    NSData * result;
    if (dataValue) {
        if (dataFormat == DF_UTF8) {
            result = [RCTConvert NSData:dataValue];
            if (!result && reject) {
                reject(EC_WRONG_PARAMETER, @"Failed to convert string into UTF8 encoded data", nil);
            }
        } else {
            result = [[NSData alloc] initWithBase64EncodedString:dataValue options:NSDataBase64DecodingIgnoreUnknownCharacters];
            if (!result && reject) {
                reject(EC_WRONG_PARAMETER, @"Failed to decode Base64 encoded data.", nil);
            }
        }
    } else {
        result = [NSData data];
    }
    return result;
}

NSString * EncodeNSDataValue(NSData * dataValue, DataFormat dataFormat, RCTPromiseRejectBlock reject)
{
    if (!dataValue) {
        return nil;
    } else if (dataFormat == DF_UTF8) {
        NSString * result = [[NSString alloc] initWithData:dataValue encoding:NSUTF8StringEncoding];
        if (!result && reject) {
            reject(EC_UNKNOWN_ERROR, @"Failed to create string from UTF-8 encoded data", nil);
        }
        return result;
    } else {
        return [dataValue base64EncodedStringWithOptions:0];
    }
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
        id passwordObjectId = [(NSDictionary*)anyPassword objectForKey:@"objectId"];
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

PowerAuthSDK * GetPowerAuthSdk(id anyId, PowerAuthObjectRegister * objectRegister, RCTPromiseRejectBlock reject)
{
    PowerAuthSDK * sdk;
    if (![objectRegister isValidObjectId: anyId]) {
        if (reject) reject(EC_WRONG_PARAMETER, @"PowerAuth instance identifier is missing or empty string", nil);
        sdk = nil;
    } else {
        sdk = [objectRegister findObjectWithId:anyId expectedClass:[PowerAuthSDK class]];
        if (!sdk) {
            if (reject) reject(EC_INSTANCE_NOT_CONFIGURED, @"PowerAuth instance is not configured.", nil);
        }
    }
    return sdk;
}
