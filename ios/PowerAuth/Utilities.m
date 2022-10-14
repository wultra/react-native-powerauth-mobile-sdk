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

/// Extract NSString value from dictionary containing encoded JS object.
/// @param dict Dictionary containing JS object.
/// @param key Key for value to extract from the dictionary.
/// @return String extracted from the dictionary.
NSString * GetNSStringValueFromDict(NSDictionary * dict, NSString * key)
{
    id value = dict[key];
    if (value == nil || value == [NSNull null]) {
        return nil;
    }
    return [RCTConvert NSString:value];
}

/// Extract NSData value from dictionary containing encoded JS object. The dictionary must contain
/// Base64 encoded string for the provided key.
/// @param dict Dictionary containing JS object.
/// @param key Key for value to extract from the dictionary.
/// @return NSData extracted from the dictionary.
NSData * GetNSDataValueFromDict(NSDictionary * dict, NSString * key)
{
    NSString * encodedData = GetNSStringValueFromDict(dict, key);
    if (encodedData) {
        return [[NSData alloc] initWithBase64EncodedString:encodedData options:NSDataBase64DecodingIgnoreUnknownCharacters];
    }
    return nil;
}
