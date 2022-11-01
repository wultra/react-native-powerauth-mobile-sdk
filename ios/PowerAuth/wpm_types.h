/**
 * Copyright 2018 Wultra s.r.o.
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

#ifndef wultra_wpm_types_h
#define wultra_wpm_types_h

#ifdef __cplusplus
extern "C" {
#endif

/// Result of WPM_testPasscode function that can result in multiple issues.
typedef enum _WPM_PasscodeResult {
    /// The passcode is OK, no issues found
    WPM_PasscodeResult_Ok             = 1 << 0,
    /// The passcode doesn't have enough unique digits
    WPM_PasscodeResult_NotUnique      = 1 << 1,
    /// There is a significant amount of repeating characters in the passcode
    WPM_PasscodeResult_RepeatingChars = 1 << 2,
    /// A repeating pattern was found in the passcode
    WPM_PasscodeResult_HasPattern     = 1 << 3,
    /// This passcode can be a date (and possible birthday of the user)
    WPM_PasscodeResult_PossiblyDate   = 1 << 4,
    /// The passcode is in most used passcodes
    WPM_PasscodeResult_FrequentlyUsed = 1 << 5,
    /// Wrong input
    WPM_PasscodeResult_WrongInput     = 1 << 6
    
} WPM_PasscodeResult;

/// Classification of the password strength
typedef enum _WPM_PasswordResult {
    WPM_PasswordResult_VeryWeak   = 0,
    WPM_PasswordResult_Weak       = 1,
    WPM_PasswordResult_Moderate   = 2,
    WPM_PasswordResult_Good       = 3,
    WPM_PasswordResult_Strong     = 4,
    WPM_PasswordResult_WrongInput = 5,
} WPM_PasswordResult;

#ifdef __cplusplus
}
#endif
    
#endif /* wultra_wpm_types_h */
