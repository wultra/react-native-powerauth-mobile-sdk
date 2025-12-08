/*
 * Copyright 2025 Wultra s.r.o.
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

#import "PowerAuthStorageUtilsModule.h"
#import "Errors.h"
#import <PowerAuth2/PowerAuthKeychain.h>

static NSString * const kStorageTypeSecure = @"SECURE";
static NSString * const kStorageTypeStandard = @"STANDARD";
static NSString * const kKeychainServiceName = @"com.wultra.powerauth.jssdk.storageutils.secure";
static NSString * const kUserDefaultsSuiteName = @"com.wultra.powerauth.jssdk.storageutils.standard";

@implementation PowerAuthStorageUtilsModule
{
    PowerAuthKeychain * _keychain;
    NSUserDefaults * _userDefaults;
}

RCT_EXPORT_MODULE(PowerAuthStorageUtils);

+ (BOOL) requiresMainQueueSetup
{
    return NO;
}

- (PowerAuthKeychain *)keychain
{
    if (!_keychain) {
        _keychain = [[PowerAuthKeychain alloc] initWithIdentifier:kKeychainServiceName];
    }
    return _keychain;
}

- (NSUserDefaults *)userDefaults
{
    if (!_userDefaults) {
        _userDefaults = [[NSUserDefaults alloc] initWithSuiteName:kUserDefaultsSuiteName];
    }
    return _userDefaults;
}

// MARK: - JS interface

PAJS_METHOD_START(setString,
                  PAJS_ARGUMENT(key, NSString*)
                  PAJS_ARGUMENT(value, NSString*)
                  PAJS_ARGUMENT(storageType, NSString*))
{
    NSString * keyStr = [RCTConvert NSString:key];
    NSString * valueStr = [RCTConvert NSString:value];
    NSString * storageTypeStr = [RCTConvert NSString:storageType];
    
    if (!keyStr || keyStr.length == 0) {
        reject(EC_WRONG_PARAMETER, @"Key cannot be empty", nil);
        return;
    }
    
    if ([storageTypeStr isEqualToString:kStorageTypeSecure]) {
        NSData * data = [valueStr dataUsingEncoding:NSUTF8StringEncoding];
        PowerAuthKeychainStoreItemResult result = [[self keychain] addValue:data forKey:keyStr];

        if (result == PowerAuthKeychainStoreItemResult_Ok) {
            resolve([NSNull null]);
        } else if (result == PowerAuthKeychainStoreItemResult_Duplicate) {
            PowerAuthKeychainStoreItemResult updateResult = [[self keychain] updateValue:data forKey:keyStr];

            if (updateResult == PowerAuthKeychainStoreItemResult_Ok) {
                resolve([NSNull null]);
            } else {
                reject(EC_ENCRYPTION_ERROR, @"Failed to update value in Keychain", nil);
            }
        } else {
            reject(EC_ENCRYPTION_ERROR, @"Failed to store value in Keychain", nil);
        }
    } else if ([storageTypeStr isEqualToString:kStorageTypeStandard]) {
        [[self userDefaults] setObject:valueStr forKey:keyStr];
        [[self userDefaults] synchronize];

        resolve([NSNull null]);
    } else {
        reject(EC_WRONG_PARAMETER, @"Invalid storage type", nil);
    }
}
PAJS_METHOD_END

PAJS_METHOD_START(getString,
                  PAJS_ARGUMENT(key, NSString*)
                  PAJS_ARGUMENT(storageType, NSString*))
{
    NSString * keyStr = [RCTConvert NSString:key];
    NSString * storageTypeStr = [RCTConvert NSString:storageType];
    
    if (!keyStr || keyStr.length == 0) {
        reject(EC_WRONG_PARAMETER, @"Key cannot be empty", nil);
        return;
    }
    
    if ([storageTypeStr isEqualToString:kStorageTypeSecure]) {
        NSData * data = [[self keychain] dataForKey:keyStr status:nil];
        if (data) {
            NSString * value = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
            resolve(value);
        } else {
            resolve([NSNull null]);
        }
    } else if ([storageTypeStr isEqualToString:kStorageTypeStandard]) {
        NSString * value = [[self userDefaults] stringForKey:keyStr];

        if (value) {
            resolve(value);
        } else {
            resolve([NSNull null]);
        }
    } else {
        reject(EC_WRONG_PARAMETER, @"Invalid storage type", nil);
    }
}
PAJS_METHOD_END

PAJS_METHOD_START(exists,
                  PAJS_ARGUMENT(key, NSString*)
                  PAJS_ARGUMENT(storageType, NSString*))
{
    NSString * keyStr = [RCTConvert NSString:key];
    NSString * storageTypeStr = [RCTConvert NSString:storageType];
    
    if (!keyStr || keyStr.length == 0) {
        reject(EC_WRONG_PARAMETER, @"Key cannot be empty", nil);
        return;
    }
    
    if ([storageTypeStr isEqualToString:kStorageTypeSecure]) {
        BOOL exists = [[self keychain] containsDataForKey:keyStr];
        resolve(@(exists));
    } else if ([storageTypeStr isEqualToString:kStorageTypeStandard]) {
        BOOL exists = [[self userDefaults] objectForKey:keyStr] != nil;
        resolve(@(exists));
    } else {
        reject(EC_WRONG_PARAMETER, @"Invalid storage type", nil);
    }
}
PAJS_METHOD_END

PAJS_METHOD_START(remove,
                  PAJS_ARGUMENT(key, NSString*)
                  PAJS_ARGUMENT(storageType, NSString*))
{
    NSString * keyStr = [RCTConvert NSString:key];
    NSString * storageTypeStr = [RCTConvert NSString:storageType];
    
    if (!keyStr || keyStr.length == 0) {
        reject(EC_WRONG_PARAMETER, @"Key cannot be empty", nil);
        return;
    }
    
    if ([storageTypeStr isEqualToString:kStorageTypeSecure]) {
        BOOL existed = [[self keychain] containsDataForKey:keyStr];
        [[self keychain] deleteDataForKey:keyStr];

        resolve(@(existed));
    } else if ([storageTypeStr isEqualToString:kStorageTypeStandard]) {
        BOOL existed = [[self userDefaults] objectForKey:keyStr] != nil;

        [[self userDefaults] removeObjectForKey:keyStr];
        [[self userDefaults] synchronize];

        resolve(@(existed));
    } else {
        reject(EC_WRONG_PARAMETER, @"Invalid storage type", nil);
    }
}
PAJS_METHOD_END

@end
