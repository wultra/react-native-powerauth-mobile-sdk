/**
 * Copyright 2024 Wultra s.r.o.
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
@import PowerAuth2;
#import <React/RCTBridge.h>

#ifdef __cplusplus
    // C++
    #define PA_EXTERN_C                extern "C"
    #define PA_EXTERN_C_BEGIN          extern "C" {
    #define PA_EXTERN_C_END            }
#else
    // C
    #define PA_EXTERN_C                extern
    #define PA_EXTERN_C_BEGIN
    #define PA_EXTERN_C_END
#endif

/// Function that lifts PowerAuthSDK instance from the React-Native module if present (configured). If the object is not available, returns nil.
/// @param instanceId Id of the instance that was configured from the JS/TS layer.
/// @param bridge React bridge reference obtained from your ReactNative module or app.
/// @return Native PowerAuthSDK or nil if such instance is not configured.
PA_EXTERN_C PowerAuthSDK * LiftPowerAuthSdk(NSString * instanceId, RCTBridge * bridge);
