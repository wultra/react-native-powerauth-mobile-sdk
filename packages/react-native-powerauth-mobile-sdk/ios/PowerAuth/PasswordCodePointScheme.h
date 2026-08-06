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

#import <Foundation/Foundation.h>
#import "PowerAuthObjectRegister.h"

#ifdef __cplusplus
    #define PACPS_EXTERN_C extern "C"
#else
    #define PACPS_EXTERN_C extern
#endif

/**
 Determines how many code points from an `addCharacter`/`insertCharacter` call actually get stored:

 - legacy (marker missing) - only the 1st. code point is stored, the rest dropped. Kept for every
   activation that existed before this scheme was introduced, so derived password bytes never change.
 - corrected (marker present, or no valid activation yet) - every code point is stored, so multi-code-
   point graphemes (decomposed diacritics, ZWJ/flag/skin-tone emoji) are preserved in full.

 */

/// Marks the activation currently associated with the given PowerAuth instance (if any) as using the
/// corrected scheme. Must be called right after a new activation is persisted.
PACPS_EXTERN_C void PACPS_MarkActivationWithCorrectedPasswordScheme(NSString * _Nonnull instanceId, PowerAuthObjectRegister * _Nonnull objectRegister);

/// Clears the scheme marker for the given (already captured) activation identifier. No-op if nil.
PACPS_EXTERN_C void PACPS_ClearPasswordCodePointScheme(NSString * _Nullable activationId);

/// Returns YES if password characters typed for the given PowerAuth instance should use the corrected
/// scheme, NO for legacy.
PACPS_EXTERN_C BOOL PACPS_ShouldUseCorrectedPasswordScheme(NSString * _Nullable instanceId, PowerAuthObjectRegister * _Nonnull objectRegister);

/// Returns the NFC-normalized form of the given raw Unicode code points (e.g. composing a base letter +
/// combining mark into one code point where possible; sequences with no NFC rule, like ZWJ emoji, are
/// unchanged). Only used for the corrected scheme - legacy always stores the raw 1st. code point as-is.
PACPS_EXTERN_C NSArray<NSNumber*> * _Nonnull PACPS_NFCNormalizeCodePoints(NSArray<NSNumber*> * _Nonnull codePoints);
