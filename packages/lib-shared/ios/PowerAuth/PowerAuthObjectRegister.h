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
#import "Errors.h"

/**
 Object register that allows us to expose native objects into JavaScript world.
 The object is identified by an unique identifier created at the time of registration
 or by application provided identifier.
 */
PAJS_MODULE_BASIC(PowerAuthObjectRegister)

/**
 Register object and return auto generated object identifier.
 */
- (nonnull NSString*) registerObject:(nonnull id)object
                                 tag:(nullable NSString*)tag
                            policies:(NSArray<NSNumber*>*_Nonnull)policies;
/**
 Register object with application specific identifier. Returns NO if such object is already
 registered.
 */
- (BOOL) registerObject:(nonnull id)object
                 withId:(nonnull NSString*)objectId
                    tag:(nullable NSString*)tag
               policies:(NSArray<NSNumber*>*_Nonnull)policies;
/**
 Register object returned from object factory with application specific identifier. Returns NO if such object
 is already registered or if the factory returns nil.
 */
- (BOOL) registerObjectWithId:(nonnull NSString*)objectId
                          tag:(nullable NSString*)tag
                     policies:(NSArray<NSNumber*>*_Nonnull)policies
                objectFactory:(id _Nullable (^ _Nonnull)(void))objectFactory;

/**
 Find object with given identifier. The identifier may be auto-generated or application specific.
 This method doesn't increase object's usage count, so it will not cause an object relase.
 */
- (nullable id) findObjectWithId:(nonnull NSString*)objectId
                   expectedClass:(nonnull Class)expectedClass;

/**
 Find object with given identifier and prolong its lifetime if `RP_KEEP_ALIVE` policy is specified.
 The identifier may be auto-generated or application specific. This method doesn't increase object's
 usage count, so it will not cause an object relase.
 */
- (nullable id) touchObjectWithId:(nonnull NSString*)objectId
                    expectedClass:(nonnull Class)expectedClass;

/**
 Find object with given identifier and increase its usage counter.
 */
- (nullable id) useObjectWithId:(nonnull NSString*)objectId
                  expectedClass:(nonnull Class)expectedClass;

/**
 Returns true if object with given identifier is still valid. Unlike find method, this
 doesn't require Class to validate the object existence.
 */
- (BOOL) containsObjectWithId:(nonnull NSString*)objectId;


/**
 Remove all object with given tag. If tag is not specified, then remove all objects.
 */
- (void) removeAllObjectsWithTag:(nullable NSString*)tag;

/**
 Remove object with given identifier. The identifier may be auto-generated or application specific.
 Return instance of just removed object or nil if no such object was found.
 */
- (nullable id) removeObjectWithId:(nonnull NSString*)objectId expectedClass:(nonnull Class)expectedClass;

/**
 Validate whether provided object is a valid application specific object identifier. The object ID can be invalid
 in case that it's not provided, is empty string or identifier collide with an internal implementation.
 */
- (BOOL) isValidObjectId:(nullable id)objectId;

/**
 Returns array with debug information about objects stored in the register. The method is available only
 if library is compiled in DEBUG configuration.
 */
- (nonnull NSArray<NSDictionary*>*) debugDumpObjectsWithTag:(nullable NSString*)tag;

/**
 Set interval for internal cleanup job that removes objects that are not valid.
 Only the value in range 100 to 60000ms is accepted. If 0 is provided, then register sets
 interval to the default period.
 */
- (void) setCleanupPeriod:(NSInteger)periodInMs;

@end

/**
 Creates a new release policy configured to a manual release. This type of policy
 cannot be combined with other policy types, because the object owner manages the object's
 lifetime.
 */
PA_EXTERN_C NSNumber * _Nonnull RP_MANUAL(void);
/**
 Creates a new release policy configured to release object after expected amount of use.
 It's recommended to combine this type of policy with `RP_EXPIRE()` to make sure
 that object is always released from the memory.
 */
PA_EXTERN_C NSNumber * _Nonnull RP_AFTER_USE(NSUInteger usageCount);
/**
 Creates a new release policy configured to release object after a required time of inactivity.
 The inactivity means that no JavaScript call interacted with the object in the defined
 time window.
 */
PA_EXTERN_C NSNumber * _Nonnull RP_KEEP_ALIVE(NSUInteger timeIntervalMs);
/**
 Creates a new release policy configured to release object after a required time.
 */
PA_EXTERN_C NSNumber * _Nonnull RP_EXPIRE(NSUInteger timeIntervalMs);
/**
 Convert JS number into time interval in milliseconds, required for `RP_KEEP_ALIVE()` or `RP_EXPIRE()` modes.
 The function is implemented only for DEBUG build. For release build it's always converted to defaultValue.
 */
#if DEBUG
    PA_EXTERN_C NSUInteger RP_TIME_INTERVAL(id _Nullable anyValue, NSUInteger defaultValue);
#else
    #define RP_TIME_INTERVAL(anyValue, defaultValue) (defaultValue)
#endif
