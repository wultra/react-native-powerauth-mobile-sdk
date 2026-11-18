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

// Declarations only: exports methods of the Swift `PowerAuthCryptoUtilsModule` class to React Native as `PowerAuthCryptoUtils`.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_REMAP_MODULE(PowerAuthCryptoUtils, PowerAuthCryptoUtilsModule, NSObject)

RCT_EXTERN_METHOD(hashSha256:(NSString *)input
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(randomBytes:(nonnull NSNumber *)length
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
