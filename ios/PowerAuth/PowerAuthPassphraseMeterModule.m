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

#import "PowerAuthPassphraseMeterModule.h"
#import "PowerAuthObjectRegister.h"
#import "Errors.h"

#import <React/RCTConvert.h>

#include "pin_tester.h"

@import PowerAuthCore;

@implementation PowerAuthPassphraseMeterModule
{
    PowerAuthObjectRegister * _objectRegister;
}

// MARK: - ReactNative bridge

@synthesize moduleRegistry = _moduleRegistry;

RCT_EXPORT_MODULE(PowerAuthPassphraseMeter);

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

RCT_EXPORT_METHOD(testPin:(id)pin
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    PowerAuthCorePassword * corePin = TouchPassword(pin, _objectRegister, reject);
    if (corePin) {
        __block NSDictionary * resolveResult = nil;
        __block NSString * rejectMessage = nil;
        [corePin validatePasswordComplexity:^NSInteger(const char * _Nonnull passphrase, NSInteger length) {
            if (length < 4) {
                rejectMessage = @"PIN is too short";
            } else {
                WPM_PasscodeResult result = PinTester_testPasscode(passphrase);
                if (result & WPM_PasscodeResult_WrongInput) {
                    rejectMessage = @"Not a PIN";
                } else {
                    // Some issues found, so prepare array with issues.
                    NSMutableArray * issues = [NSMutableArray array];
                    if (result & WPM_PasscodeResult_NotUnique) {
                        [issues addObject:@"NOT_UNIQUE"];
                    }
                    if (result & WPM_PasscodeResult_RepeatingChars) {
                        [issues addObject:@"REPEATING_CHARS"];
                    }
                    if (result & WPM_PasscodeResult_HasPattern) {
                        [issues addObject:@"PATTERN_FOUND"];
                    }
                    if (result & WPM_PasscodeResult_PossiblyDate) {
                        [issues addObject:@"POSSIBLY_DATE"];
                    }
                    if (result & WPM_PasscodeResult_FrequentlyUsed) {
                        [issues addObject:@"FREQUENTLY_USED"];
                    }
                    // Prepare weak flag
                    BOOL isWeak;
                    if (result != WPM_PasscodeResult_Ok) {
                        if (length <= 4) {
                            isWeak = (result & (WPM_PasscodeResult_FrequentlyUsed | WPM_PasscodeResult_NotUnique)) != 0;
                        } else if (length <= 6) {
                            isWeak = (result & (WPM_PasscodeResult_FrequentlyUsed | WPM_PasscodeResult_NotUnique | WPM_PasscodeResult_RepeatingChars)) != 0;
                        } else {
                            isWeak = (result & (WPM_PasscodeResult_FrequentlyUsed | WPM_PasscodeResult_NotUnique | WPM_PasscodeResult_RepeatingChars | WPM_PasscodeResult_HasPattern)) != 0;
                        }
                    } else {
                        isWeak = NO;
                    }
                    resolveResult = @{
                        @"issues" : issues,
                        @"shouldWarnUserAboutWeakPin" : isWeak ? @YES : @NO
                    };
                }
            }
            return 0;
        }];
        if (resolveResult) {
            resolve(resolveResult);
        } else {
            reject(EC_WRONG_PARAMETER, rejectMessage, nil);
        }
    }
}

@end
