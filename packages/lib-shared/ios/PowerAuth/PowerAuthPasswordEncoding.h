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
 Determines how `PowerAuthGroupedPassword` characters are encoded for an activation.
 
 Activations persisted by this version of the wrapper are marked with their activation
 identifier and use all code points of each character. Activations without a matching
 marker were created by an older version and keep the legacy encoding that used only the
 first code point of each character. The marker is not secret and is stored in the
 PowerAuth SDK's status keychain, so it shares the lifetime of the activation data.
 */
@interface PowerAuthPasswordEncoding : NSObject

/// Determine whether the current activation requires the legacy password encoding.
/// Returns NO if the encoding cannot be determined.
+ (BOOL) resolveLegacyEncoding:(nonnull BOOL*)useLegacyEncoding forSdk:(nonnull PowerAuthSDK*)sdk;

/// Mark the pending activation to use the full password encoding. Must be called before
/// the activation is persisted. Returns NO if the marker cannot be stored.
+ (BOOL) markPendingActivationForSdk:(nonnull PowerAuthSDK*)sdk;

/// Remove the marker. Intended only for testing the legacy encoding in DEBUG builds.
+ (void) removeMarkerForSdk:(nonnull PowerAuthSDK*)sdk;

@end
