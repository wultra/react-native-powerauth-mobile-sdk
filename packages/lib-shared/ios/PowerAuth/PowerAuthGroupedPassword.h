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

@import PowerAuth2;

/**
 Mutable password where each character added from JavaScript is a group of one or more
 Unicode code points.
 
 The class keeps two native passwords. The full password contains all code points of every
 group. The legacy password contains only the first code point of every group, which is how
 versions before the fix for issue #310 encoded multi-code-point characters. Activations created
 by such versions must keep using this encoding (see `PowerAuthPasswordEncoding`).
 
 The password length and positions are expressed in groups. All methods are thread safe.
 Code points must be validated by the caller.
 */
@interface PowerAuthGroupedPassword : NSObject

/// Number of characters in the password.
- (NSUInteger) length;

/// Remove all characters.
- (void) clear;

/// Append one character composed of code points. The array must not be empty.
- (void) addCharacter:(nonnull NSArray<NSNumber*>*)codePoints;

/// Insert one character composed of code points. The array must not be empty.
/// Returns NO if the index is out of range.
- (BOOL) insertCharacter:(nonnull NSArray<NSNumber*>*)codePoints atIndex:(NSUInteger)index;

/// Remove character at given index. Returns NO if the index is out of range.
- (BOOL) removeCharacterAtIndex:(NSUInteger)index;

/// Remove the last character, if any.
- (void) removeLastCharacter;

/// Compare all code points of both passwords.
- (BOOL) isEqualToGroupedPassword:(nonnull PowerAuthGroupedPassword*)password;

/// Return an immutable password with all code points.
- (nonnull PowerAuthPassword*) immutablePassword;

/// Return an immutable password with all code points, and an immutable password in the legacy
/// encoding if it differs from the full password. Both passwords are copied atomically.
- (nonnull PowerAuthPassword*) immutablePasswordWithLegacy:(PowerAuthPassword * _Nullable * _Nonnull)legacyPassword;

@end
