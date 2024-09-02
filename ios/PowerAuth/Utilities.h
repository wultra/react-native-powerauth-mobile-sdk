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

#import "PAJS.h"

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


/// Specifies data format requested by the application.
typedef NS_ENUM(NSInteger, DataFormat) {
    DF_ERROR    = 0,    /// Unsupported data format.
    DF_UTF8     = 1,    /// Plain string
    DF_BASE64   = 2     /// Base64 encoded string
};

/// Convert data format into DataFormat enumeration.
/// @param format Format to convert.
/// @param reject Optional reject block, called in case of invalid format is provided.
PA_EXTERN_C DataFormat GetPowerAuthDataFormat(NSString * format, RCTPromiseRejectBlock reject);

/// Convert provided value into NSData object, depending on data format.
/// @param dataValue Value containaing encoded data. If nil is provided, then function returns empty data object.
/// @param dataFormat Requested data format.
/// @param reject Optional reject block, called in case of invalid format is provided, or conversion failed.
/// @return NSData converted from data value or nil in case of error.
PA_EXTERN_C NSData * DecodeNSDataValue(NSString * dataValue, DataFormat dataFormat, RCTPromiseRejectBlock reject);

/// Convert provided data into string representation depending on data format.
/// @param dataValue Value to encode. If nil is provided, then function returns empty string.
/// @param dataFormat Requested data format.
PA_EXTERN_C NSString * EncodeNSDataValue(NSData * dataValue, DataFormat dataFormat, RCTPromiseRejectBlock reject);


@class PowerAuthCorePassword, PowerAuthObjectRegister, PowerAuthSDK;

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

/// Function translate object identifier into PowerAuthSDK instance. If such conversion is not possible, then use reject promise
/// to report an error.
/// @param anyId Object to convert into PowerAuthSDK.
/// @param objectRegister Object register instance.
/// @param reject Reject function to call in case of failure
/// @return PowerAuthSDK or nil if such instance is not configured.
PA_EXTERN_C PowerAuthSDK * GetPowerAuthSdk(id anyId, PowerAuthObjectRegister * objectRegister, RCTPromiseRejectBlock reject);
