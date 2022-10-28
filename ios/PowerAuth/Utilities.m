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

#import "Utilities.h"
#import <React/RCTConvert.h>

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
