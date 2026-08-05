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

void PACPS_MarkActivationWithCorrectedPasswordScheme(NSString * instanceId, PowerAuthObjectRegister * objectRegister)
{
    PowerAuthSDK * sdk = PACPS_FindSdk(instanceId, objectRegister);
    NSString * activationId = sdk.activationIdentifier;
    if (activationId) {
        [[NSUserDefaults standardUserDefaults] setBool:YES forKey:PACPS_SchemeKeyForActivation(activationId)];
    }
}

void PACPS_ClearPasswordCodePointScheme(NSString * activationId)
{
    if (activationId) {
        [[NSUserDefaults standardUserDefaults] removeObjectForKey:PACPS_SchemeKeyForActivation(activationId)];
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
    return [[NSUserDefaults standardUserDefaults] boolForKey:PACPS_SchemeKeyForActivation(activationId)];
}
