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

#import <React/RCTBridgeModule.h>

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

/**
 Macro to cast object to desired class, or return nil if object is different kind of class.
 */
#define CAST_TO(object, requiredClass) ((requiredClass*)(CastObjectTo(object, [requiredClass class])))

/// Cast object to desired class, or return nil if object is different kind of class.
/// @param instance Object to cast.
/// @param desiredClass Required class
/// @return The provided instance or nil if object is not kind of required class.
PA_EXTERN_C id CastObjectTo(id instance, Class desiredClass);

/// Patch nulls in object to undefined (e.g. remove keys with nulls)
/// @param object Object to patch.
/// @return Patched object that doesn't contain `NSNull` instances.
PA_EXTERN_C id PatchNull(id object);

/// Extract NSString value from dictionary containing encoded JS object.
/// @param dict Dictionary containing JS object.
/// @param key Key for value to extract from the dictionary.
/// @return String extracted from the dictionary.
PA_EXTERN_C NSString * GetNSStringValueFromDict(NSDictionary * dict, NSString * key);

/// Extract value from dictionary containing encoded JS object at given path.
/// @param dict Dictionary containing JS object.
/// @param path Path object to extract from the dictionary. Use dot notation.
/// @return String extracted from the dictionary.
PA_EXTERN_C id GetValueAtPathFromDict(NSDictionary * dict, NSString * path, Class expectedClass);

/// Extract NSData value from dictionary containing encoded JS object. The dictionary must contain
/// Base64 encoded string for the provided key.
/// @param dict Dictionary containing JS object.
/// @param key Key for value to extract from the dictionary.
/// @return NSData extracted from the dictionary.
PA_EXTERN_C NSData * GetNSDataValueFromDict(NSDictionary * dict, NSString * key);

@class PowerAuthCorePassword, PowerAuthObjectRegister;

/// Function translate object into PowerAuthCorePassword. If such conversion is not possible then use reject promise to
/// report an error. The password object is marked as used if found in register.
/// @param anyPassword Object to convert into PowerAuthCorePassword.
/// @param objectRegister Object register instance.
/// @param reject Reject function to call in case of failure
/// @return PowerAuthCorePassword or nil if no such conversion is possible.
PA_EXTERN_C PowerAuthCorePassword * UsePassword(id anyPassword, PowerAuthObjectRegister * objectRegister, RCTPromiseRejectBlock reject);

/// Function translate object into PowerAuthCorePassword. If such conversion is not possible then use reject promise to
/// report an error.
/// @param anyPassword Object to convert into PowerAuthCorePassword.
/// @param objectRegister Object register instance.
/// @param reject Reject function to call in case of failure
/// @return PowerAuthCorePassword or nil if no such conversion is possible.
PA_EXTERN_C PowerAuthCorePassword * TouchPassword(id anyPassword, PowerAuthObjectRegister * objectRegister, RCTPromiseRejectBlock reject);
