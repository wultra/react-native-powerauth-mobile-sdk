/*
 * Copyright 2026 Wultra s.r.o.
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

#import "PowerAuthPasswordEncoding.h"

static NSString * const MARKER_KEY_PREFIX = @"com.wultra.powerauth.js.passwordEncoding.";

@implementation PowerAuthPasswordEncoding

+ (BOOL) resolveLegacyEncoding:(BOOL*)useLegacyEncoding forSdk:(PowerAuthSDK*)sdk
{
    if (![sdk hasValidActivation]) {
        *useLegacyEncoding = NO;
        return YES;
    }
    NSData * activationId = [sdk.activationIdentifier dataUsingEncoding:NSUTF8StringEncoding];
    if (!activationId) {
        *useLegacyEncoding = YES;
        return YES;
    }
    OSStatus status = errSecSuccess;
    NSData * marker = [[self statusKeychainForSdk:sdk] dataForKey:[self markerKeyForSdk:sdk] status:&status authentication:nil];
    if (marker) {
        *useLegacyEncoding = ![marker isEqualToData:activationId];
        return YES;
    }
    if (status == errSecItemNotFound) {
        *useLegacyEncoding = YES;
        return YES;
    }
    return NO;
}

+ (BOOL) markPendingActivationForSdk:(PowerAuthSDK*)sdk
{
    if (![sdk hasPendingActivation]) {
        // Let the SDK report the missing pending activation.
        return YES;
    }
    NSData * activationId = [sdk.activationIdentifier dataUsingEncoding:NSUTF8StringEncoding];
    if (!activationId) {
        return NO;
    }
    PowerAuthKeychain * keychain = [self statusKeychainForSdk:sdk];
    NSString * key = [self markerKeyForSdk:sdk];
    PowerAuthKeychainStoreItemResult result = [keychain addValue:activationId forKey:key];
    if (result == PowerAuthKeychainStoreItemResult_Duplicate) {
        result = [keychain updateValue:activationId forKey:key];
    }
    if (result != PowerAuthKeychainStoreItemResult_Ok) {
        return NO;
    }
    NSData * marker = [keychain dataForKey:key status:NULL authentication:nil];
    return [marker isEqualToData:activationId];
}

+ (void) removeMarkerForSdk:(PowerAuthSDK*)sdk
{
    [[self statusKeychainForSdk:sdk] deleteDataForKey:[self markerKeyForSdk:sdk]];
}

// MARK: - Private

+ (PowerAuthKeychain*) statusKeychainForSdk:(PowerAuthSDK*)sdk
{
    // Use the same keychain as PowerAuthSDK uses for its activation data.
    NSString * accessGroup;
    PowerAuthSharingConfiguration * sharingConfiguration = sdk.configuration.sharingConfiguration;
    if (sharingConfiguration) {
        accessGroup = sharingConfiguration.keychainAccessGroup;
    } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
        accessGroup = sdk.keychainConfiguration.keychainAttribute_AccessGroup;
#pragma clang diagnostic pop
    }
    return [[PowerAuthKeychain alloc] initWithIdentifier:sdk.keychainConfiguration.keychainInstanceName_Status
                                             accessGroup:accessGroup];
}

+ (NSString*) markerKeyForSdk:(PowerAuthSDK*)sdk
{
    return [MARKER_KEY_PREFIX stringByAppendingString:sdk.configuration.instanceId];
}

@end
