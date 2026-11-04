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

// Declarations only: exports methods of the Swift `PowerAuthPasswordModule` class to React Native as `PowerAuthPassword`.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_REMAP_MODULE(PowerAuthPassword, PowerAuthPasswordModule, NSObject)

RCT_EXTERN_METHOD(initialize:(BOOL)destroyAfterUse
                  ownerId:(NSString *)ownerId
                  autoreleaseTime:(nonnull NSNumber *)autoreleaseTime
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clear:(NSString *)objectId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(length:(NSString *)objectId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isEqual:(NSString *)id1
                  id2:(NSString *)id2
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addCharacter:(NSString *)objectId
                  character:(nonnull NSNumber *)character
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(insertCharacter:(NSString *)objectId
                  character:(nonnull NSNumber *)character
                  position:(nonnull NSNumber *)position
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeCharacter:(NSString *)objectId
                  position:(nonnull NSNumber *)position
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeLastCharacter:(NSString *)objectId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
