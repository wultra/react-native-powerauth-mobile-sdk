/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTConvert.h"

#import <objc/message.h>

#import <CoreText/CoreText.h>

#import "RCTDefines.h"

@implementation RCTConvert

RCT_CONVERTER(id, id, self)

RCT_CONVERTER(BOOL, BOOL, boolValue)
RCT_NUMBER_CONVERTER(double, doubleValue)
RCT_NUMBER_CONVERTER(float, floatValue)
RCT_NUMBER_CONVERTER(int, intValue)

RCT_NUMBER_CONVERTER(int64_t, longLongValue);
RCT_NUMBER_CONVERTER(uint64_t, unsignedLongLongValue);

RCT_NUMBER_CONVERTER(NSInteger, integerValue)
RCT_NUMBER_CONVERTER(NSUInteger, unsignedIntegerValue)

/**
 * This macro is used for creating converter functions for directly
 * representable json values that require no conversion.
 */
#if RCT_DEBUG
#define RCT_JSON_CONVERTER(type)             \
  +(type *)type : (id)json                   \
  {                                          \
    if ([json isKindOfClass:[type class]]) { \
      return json;                           \
    } else if (json) {                       \
      RCTLogConvertError(json, @ #type);     \
    }                                        \
    return nil;                              \
  }
#else
#define RCT_JSON_CONVERTER(type) \
  +(type *)type : (id)json       \
  {                              \
    return json;                 \
  }
#endif

#define RCTLogInfo(...)

RCT_JSON_CONVERTER(NSArray)
RCT_JSON_CONVERTER(NSDictionary)
RCT_JSON_CONVERTER(NSString)
RCT_JSON_CONVERTER(NSNumber)

RCT_CUSTOM_CONVERTER(NSSet *, NSSet, [NSSet setWithArray:json])
RCT_CUSTOM_CONVERTER(NSData *, NSData, [json dataUsingEncoding:NSUTF8StringEncoding])

+ (NSIndexSet *)NSIndexSet:(id)json
{
  json = [self NSNumberArray:json];
  NSMutableIndexSet *indexSet = [NSMutableIndexSet new];
  for (NSNumber *number in json) {
    NSInteger index = number.integerValue;
    if (RCT_DEBUG && index < 0) {
      RCTLogInfo(@"Invalid index value %lld. Indices must be positive.", (long long)index);
    }
    [indexSet addIndex:index];
  }
  return indexSet;
}

+ (NSDate *)NSDate:(id)json
{
  if ([json isKindOfClass:[NSNumber class]]) {
    return [NSDate dateWithTimeIntervalSince1970:[self NSTimeInterval:json]];
  } else if ([json isKindOfClass:[NSString class]]) {
    static NSDateFormatter *formatter;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
      formatter = [NSDateFormatter new];
      formatter.dateFormat = @"yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ";
      formatter.locale = [NSLocale localeWithLocaleIdentifier:@"en_US_POSIX"];
      formatter.timeZone = [NSTimeZone timeZoneWithName:@"UTC"];
    });
    NSDate *date = [formatter dateFromString:json];
    if (!date) {
      RCTLogInfo(
          @"JSON String '%@' could not be interpreted as a date. "
           "Expected format: YYYY-MM-DD'T'HH:mm:ss.sssZ",
          json);
    }
    return date;
  } else if (json) {
    RCTLogConvertError(json, @"a date");
  }
  return nil;
}

+ (NSLocale *)NSLocale:(id)json
{
  if ([json isKindOfClass:[NSString class]]) {
    NSLocale *locale = [[NSLocale alloc] initWithLocaleIdentifier:json];
    if (!locale) {
      RCTLogInfo(@"JSON String '%@' could not be interpreted as a valid locale. ", json);
    }
    return locale;
  } else if (json) {
    RCTLogConvertError(json, @"a locale");
  }
  return nil;
}

// JS Standard for time is milliseconds
RCT_CUSTOM_CONVERTER(NSTimeInterval, NSTimeInterval, [self double:json] / 1000.0)

// JS standard for time zones is minutes.
RCT_CUSTOM_CONVERTER(NSTimeZone *, NSTimeZone, [NSTimeZone timeZoneForSecondsFromGMT:[self double:json] * 60.0])

NSNumber *RCTConvertEnumValue(const char *typeName, NSDictionary *mapping, NSNumber *defaultValue, id json)
{
  if (!json) {
    return defaultValue;
  }
  if ([json isKindOfClass:[NSNumber class]]) {
    NSArray *allValues = mapping.allValues;
    if ([allValues containsObject:json] || [json isEqual:defaultValue]) {
      return json;
    }
    RCTLogInfo(@"Invalid %s '%@'. should be one of: %@", typeName, json, allValues);
    return defaultValue;
  }
  if (RCT_DEBUG && ![json isKindOfClass:[NSString class]]) {
    RCTLogInfo(@"Expected NSNumber or NSString for %s, received %@: %@", typeName, [json classForCoder], json);
  }
  id value = mapping[json];
  if (RCT_DEBUG && !value && [json description].length > 0) {
    RCTLogInfo(
        @"Invalid %s '%@'. should be one of: %@",
        typeName,
        json,
        [[mapping allKeys] sortedArrayUsingSelector:@selector(caseInsensitiveCompare:)]);
  }
  return value ?: defaultValue;
}

NSNumber *RCTConvertMultiEnumValue(const char *typeName, NSDictionary *mapping, NSNumber *defaultValue, id json)
{
  if ([json isKindOfClass:[NSArray class]]) {
    if ([json count] == 0) {
      return defaultValue;
    }
    long long result = 0;
    for (id arrayElement in json) {
      NSNumber *value = RCTConvertEnumValue(typeName, mapping, defaultValue, arrayElement);
      result |= value.longLongValue;
    }
    return @(result);
  }
  return RCTConvertEnumValue(typeName, mapping, defaultValue, json);
}

RCT_ENUM_CONVERTER(
    NSLineBreakMode,
    (@{
      @"clip" : @(NSLineBreakByClipping),
      @"head" : @(NSLineBreakByTruncatingHead),
      @"tail" : @(NSLineBreakByTruncatingTail),
      @"middle" : @(NSLineBreakByTruncatingMiddle),
      @"wordWrapping" : @(NSLineBreakByWordWrapping),
    }),
    NSLineBreakByTruncatingTail,
    integerValue)

RCT_ENUM_CONVERTER(
    NSTextAlignment,
    (@{
      @"auto" : @(NSTextAlignmentNatural),
      @"left" : @(NSTextAlignmentLeft),
      @"center" : @(NSTextAlignmentCenter),
      @"right" : @(NSTextAlignmentRight),
      @"justify" : @(NSTextAlignmentJustified),
    }),
    NSTextAlignmentNatural,
    integerValue)

RCT_ENUM_CONVERTER(
    NSUnderlineStyle,
    (@{
      @"solid" : @(NSUnderlineStyleSingle),
      @"double" : @(NSUnderlineStyleDouble),
      @"dotted" : @(NSUnderlinePatternDot | NSUnderlineStyleSingle),
      @"dashed" : @(NSUnderlinePatternDash | NSUnderlineStyleSingle),
    }),
    NSUnderlineStyleSingle,
    integerValue)

RCT_ENUM_CONVERTER(
    NSWritingDirection,
    (@{
      @"auto" : @(NSWritingDirectionNatural),
      @"ltr" : @(NSWritingDirectionLeftToRight),
      @"rtl" : @(NSWritingDirectionRightToLeft),
    }),
    NSWritingDirectionNatural,
    integerValue)

+ (NSLineBreakStrategy)NSLineBreakStrategy:(id)json RCT_DYNAMIC
{
  if (@available(iOS 14.0, *)) {
    static NSDictionary *mapping;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
      mapping = @{
        @"none" : @(NSLineBreakStrategyNone),
        @"standard" : @(NSLineBreakStrategyStandard),
        @"hangul-word" : @(NSLineBreakStrategyHangulWordPriority),
        @"push-out" : @(NSLineBreakStrategyPushOut)
      };
    });
    return RCTConvertEnumValue("NSLineBreakStrategy", mapping, @(NSLineBreakStrategyNone), json).integerValue;
  } else {
    return NSLineBreakStrategyNone;
  }
}

/**
 * This macro is used for creating converter functions for structs that consist
 * of a number of CGFloat properties, such as CGPoint, CGRect, etc.
 */
#define RCT_CGSTRUCT_CONVERTER(type, values)                  \
  +(type)type : (id)json                                      \
  {                                                           \
    static NSArray *fields;                                   \
    static dispatch_once_t onceToken;                         \
    dispatch_once(&onceToken, ^{                              \
      fields = values;                                        \
    });                                                       \
    type result;                                              \
    convertCGStruct(#type, fields, (CGFloat *)&result, json); \
    return result;                                            \
  }

RCT_CUSTOM_CONVERTER(CGFloat, CGFloat, [self double:json])

static NSString *const RCTFallback = @"fallback";
static NSString *const RCTFallbackARGB = @"fallback-argb";
static NSString *const RCTSelector = @"selector";
static NSString *const RCTIndex = @"index";

NSArray *RCTConvertArrayValue(SEL type, id json)
{
  __block BOOL copy = NO;
  __block NSArray *values = json = [RCTConvert NSArray:json];
  [json enumerateObjectsUsingBlock:^(id jsonValue, NSUInteger idx, __unused BOOL *stop) {
    id value = ((id(*)(Class, SEL, id))objc_msgSend)([RCTConvert class], type, jsonValue);
    if (copy) {
      if (value) {
        [(NSMutableArray *)values addObject:value];
      }
    } else if (value != jsonValue) {
      // Converted value is different, so we'll need to copy the array
      values = [[NSMutableArray alloc] initWithCapacity:values.count];
      for (NSUInteger i = 0; i < idx; i++) {
        [(NSMutableArray *)values addObject:json[i]];
      }
      if (value) {
        [(NSMutableArray *)values addObject:value];
      }
      copy = YES;
    }
  }];
  return values;
}

/**
 * This macro is used for creating converter functions for directly
 * representable json array values that require no conversion.
 */
#if RCT_DEBUG
#define RCT_JSON_ARRAY_CONVERTER_NAMED(type, name) RCT_ARRAY_CONVERTER_NAMED(type, name)
#else
#define RCT_JSON_ARRAY_CONVERTER_NAMED(type, name) \
  +(NSArray *)name##Array : (id)json               \
  {                                                \
    return json;                                   \
  }
#endif
#define RCT_JSON_ARRAY_CONVERTER(type) RCT_JSON_ARRAY_CONVERTER_NAMED(type, type)

RCT_JSON_ARRAY_CONVERTER(NSArray)
RCT_JSON_ARRAY_CONVERTER(NSString)
RCT_JSON_ARRAY_CONVERTER_NAMED(NSArray<NSString *>, NSStringArray)
RCT_JSON_ARRAY_CONVERTER(NSDictionary)
RCT_JSON_ARRAY_CONVERTER(NSNumber)

static id RCTConvertPropertyListValue(id json)
{
  if (!json || json == (id)kCFNull) {
    return nil;
  }

  if ([json isKindOfClass:[NSDictionary class]]) {
    __block BOOL copy = NO;
    NSMutableDictionary *values = [[NSMutableDictionary alloc] initWithCapacity:[json count]];
    [json enumerateKeysAndObjectsUsingBlock:^(NSString *key, id jsonValue, __unused BOOL *stop) {
      id value = RCTConvertPropertyListValue(jsonValue);
      if (value) {
        values[key] = value;
      }
      copy |= value != jsonValue;
    }];
    return copy ? values : json;
  }

  if ([json isKindOfClass:[NSArray class]]) {
    __block BOOL copy = NO;
    __block NSArray *values = json;
    [json enumerateObjectsUsingBlock:^(id jsonValue, NSUInteger idx, __unused BOOL *stop) {
      id value = RCTConvertPropertyListValue(jsonValue);
      if (copy) {
        if (value) {
          [(NSMutableArray *)values addObject:value];
        }
      } else if (value != jsonValue) {
        // Converted value is different, so we'll need to copy the array
        values = [[NSMutableArray alloc] initWithCapacity:values.count];
        for (NSUInteger i = 0; i < idx; i++) {
          [(NSMutableArray *)values addObject:json[i]];
        }
        if (value) {
          [(NSMutableArray *)values addObject:value];
        }
        copy = YES;
      }
    }];
    return values;
  }

  // All other JSON types are supported by property lists
  return json;
}

+ (NSPropertyList)NSPropertyList:(id)json
{
  return RCTConvertPropertyListValue(json);
}

@end
