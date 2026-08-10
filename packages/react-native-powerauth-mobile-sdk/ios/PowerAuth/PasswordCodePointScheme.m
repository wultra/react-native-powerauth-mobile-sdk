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

#import "PasswordCodePointScheme.h"
#import <PowerAuth2/PowerAuthSDK.h>

static NSString * const kPACPS_KeyPrefix = @"com.wultra.powerauth.passwordCodePointScheme.";

static NSString * PACPS_SchemeKeyForActivation(NSString * activationId)
{
    return [kPACPS_KeyPrefix stringByAppendingString:activationId];
}

static PowerAuthSDK * PACPS_FindSdk(NSString * instanceId, PowerAuthObjectRegister * objectRegister)
{
    if (!instanceId) {
        return nil;
    }
    return [objectRegister findObjectWithId:instanceId expectedClass:[PowerAuthSDK class]];
}

// Activation Sharing (App Group) redirects PowerAuth's own storage to a suite-scoped NSUserDefaults -
// the marker has to follow the same suite, or a sharing participant with its own standardUserDefaults
// sandbox would never see a marker written by another one.
static NSUserDefaults * PACPS_UserDefaultsForSdk(PowerAuthSDK * sdk)
{
    NSString * suiteName = sdk.keychainConfiguration.keychainAttribute_UserDefaultsSuiteName;
    if (suiteName.length > 0) {
        NSUserDefaults * suiteDefaults = [[NSUserDefaults alloc] initWithSuiteName:suiteName];
        if (suiteDefaults) {
            return suiteDefaults;
        }
    }
    return [NSUserDefaults standardUserDefaults];
}

void PACPS_MarkActivationWithCorrectedPasswordScheme(NSString * instanceId, PowerAuthObjectRegister * objectRegister)
{
    PowerAuthSDK * sdk = PACPS_FindSdk(instanceId, objectRegister);
    NSString * activationId = sdk.activationIdentifier;
    if (activationId) {
        [PACPS_UserDefaultsForSdk(sdk) setBool:YES forKey:PACPS_SchemeKeyForActivation(activationId)];
    }
}

void PACPS_ClearPasswordCodePointScheme(NSString * activationId, PowerAuthSDK * sdk)
{
    if (activationId) {
        [PACPS_UserDefaultsForSdk(sdk) removeObjectForKey:PACPS_SchemeKeyForActivation(activationId)];
    }
}

BOOL PACPS_ShouldUseCorrectedPasswordScheme(NSString * instanceId, PowerAuthObjectRegister * objectRegister)
{
    PowerAuthSDK * sdk = PACPS_FindSdk(instanceId, objectRegister);
    if (!sdk) {
        return NO;
    }
    if (![sdk hasValidActivation]) {
        return YES;
    }
    NSString * activationId = sdk.activationIdentifier;
    if (!activationId) {
        return NO;
    }
    return [PACPS_UserDefaultsForSdk(sdk) boolForKey:PACPS_SchemeKeyForActivation(activationId)];
}

NSArray<NSNumber*> * PACPS_NFCNormalizeCodePoints(NSArray<NSNumber*> * codePoints)
{
    // Pack the raw code points as UTF-32 and let Foundation decode/re-encode them, instead of manually
    // handling UTF-16 surrogate pairs - this is exactly what NSString already does internally.
    NSUInteger count = codePoints.count;
    NSMutableData * rawData = [NSMutableData dataWithCapacity:count * sizeof(UInt32)];
    for (NSNumber * cp in codePoints) {
        UInt32 value = (UInt32)[cp unsignedIntValue];
        [rawData appendBytes:&value length:sizeof(UInt32)];
    }
    NSString * string = [[NSString alloc] initWithData:rawData encoding:NSUTF32LittleEndianStringEncoding];
    NSString * normalized = [string precomposedStringWithCanonicalMapping]; // NFC
    NSData * normalizedData = [normalized dataUsingEncoding:NSUTF32LittleEndianStringEncoding];
    NSUInteger normalizedCount = normalizedData.length / sizeof(UInt32);
    const UInt32 * normalizedBytes = normalizedData.bytes;
    NSMutableArray<NSNumber*> * result = [NSMutableArray arrayWithCapacity:normalizedCount];
    for (NSUInteger i = 0; i < normalizedCount; i++) {
        [result addObject:@(normalizedBytes[i])];
    }
    return result;
}
