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

#import "PowerAuthObjectRegister.h"
#import "Constants.h"
#import "PAJS.h"

// MARK: - Release policies -

/**
 Defines how managed object is dereferenced.
 */
typedef NS_ENUM(NSUInteger, ReleasePolicyType) {
    /// Object is manually released. Overrides all other possible policies.
    RPT_Manual,
    /// Object is released after use. The number of use attemtps
    /// is specified in `maxUsageCount` parameter.
    RPT_AfterUse,
    /// Object is kept alive for a specified time interval, since
    /// the last use.
    RPT_KeepAlive,
    /// Object is released automatically after the time interval
    /// specified in `timeInterval` paramter.
    RPT_Expire
};

/**
 Defines release policy for managed object.
 */
typedef struct ReleasePolicy {
    union {
        struct {
            ReleasePolicyType policyType  : 8;
            NSUInteger        policyParam : 24;
        } policy;
        NSUInteger numericValue;
    };

} ReleasePolicy;

NSNumber * RP_MANUAL(void) {
    ReleasePolicy rp = { 0 };
    rp.policy.policyType = RPT_Manual;
    return @(rp.numericValue);
}

NSNumber * RP_AFTER_USE(NSUInteger usageCount) {
    ReleasePolicy rp = { 0 };
    rp.policy.policyType = RPT_AfterUse;
    rp.policy.policyParam = usageCount;
    return @(rp.numericValue);
}

NSNumber * RP_KEEP_ALIVE(NSUInteger timeIntervalMs) {
    ReleasePolicy rp = { 0 };
    rp.policy.policyType = RPT_KeepAlive;
    rp.policy.policyParam = timeIntervalMs;
    return @(rp.numericValue);
}

NSNumber * RP_EXPIRE(NSUInteger timeIntervalMs) {
    ReleasePolicy rp = { 0 };
    rp.policy.policyType = RPT_Expire;
    rp.policy.policyParam = timeIntervalMs;
    return @(rp.numericValue);
}

#if DEBUG
NSUInteger RP_TIME_INTERVAL(id _Nullable anyValue, NSUInteger defaultValue)
{
    NSNumber * time = [RCTConvert NSNumber:anyValue];
    if (time) {
        NSUInteger timeValue = [time unsignedIntegerValue];
        // Ignore zero result and make sure that time doesn't exceed 5 minutes
        if (timeValue) {
            return MIN(timeValue, defaultValue);
        } else {
            return defaultValue;
        }
    }
    return defaultValue;
}
#endif


static NSString * _GetRandomString(void)
{
    uint32_t count = 3 * (3 + arc4random_uniform(6));
    NSMutableData * data = [NSMutableData dataWithLength:count];
    arc4random_buf(data.mutableBytes, data.length);
    return [data base64EncodedStringWithOptions:0];
}


// MARK: - Managed Object Interface -

@interface PowerAuthManagedObject : NSObject

- (instancetype) initWithObject:(id)object
                            key:(NSString*)key
                            tag:(NSString*)tag
                       policies:(NSArray<NSNumber*>*)policies;

@property (nonatomic, nonnull, readonly, strong) id object;
@property (nonatomic, nonnull, readonly, strong) NSString * key;
@property (nonatomic, nonnull, readonly, strong) NSString * tag;
@property (nonatomic, readonly) NSUInteger usageCount;
@property (nonatomic, nonnull, readonly) NSDate * createDate;
@property (nonatomic, nonnull, readonly) NSDate * lastUseDate;

- (void) setUsed;
- (void) touch;
- (BOOL) isStillValid;
- (NSDictionary*) debugDump;

@end


// MARK: - Object Manger Implementation -

@implementation PowerAuthObjectRegister
{
    dispatch_semaphore_t _lock;
    NSMutableDictionary<NSString*, PowerAuthManagedObject*> * _register;
    BOOL _scheduledCleanup;
    NSInteger _cleanupPeriod;
}

RCT_EXPORT_MODULE(PowerAuthObjectRegister);

#define OPT_NONE        0    // no options
#define OPT_SET_USE     1    // set object as used
#define OPT_TOUCH       2    // touch object
#define OPT_REMOVE      3    // remove object

- (instancetype) init
{
    self = [super init];
    if (self) {
        _lock = dispatch_semaphore_create(1);
        _register = [NSMutableDictionary dictionaryWithCapacity:16];
        _scheduledCleanup = NO;
        _cleanupPeriod = CLEANUP_PERIOD_DEFAULT;
    }
    return self;
}

// MARK: - Native interface

- (NSString*) registerObject:(id)object tag:(NSString*)tag policies:(NSArray<NSNumber *> *)policies
{
    return [self synchronized:^id{
        NSString * identifier = [self generateIdentifier];
        PowerAuthManagedObject * managedObject = [[PowerAuthManagedObject alloc] initWithObject:object key:identifier tag:tag policies:policies];
        _register[identifier] = managedObject;
        [self scheduleClenaup];
        return identifier;
    }];
}

- (BOOL) registerObject:(id)object withId:(NSString*)objectId tag:(NSString*)tag policies:(NSArray<NSNumber*>*)policies
{
    return [self registerObjectWithId:objectId tag:tag policies:policies objectFactory:^id{
        return object;
    }];
}

- (BOOL) registerObjectWithId:(NSString*)objectId tag:(NSString*)tag policies:(NSArray<NSNumber*>*)policies objectFactory:(id(^)(void))objectFactory
{
    if (![self isValidObjectId:objectId]) {
        return NO;
    }
    return [[self synchronized:^id{
        NSString * registeredId = [self translateObjectId:objectId];
        if ([_register objectForKey:registeredId] != nil) {
            return @NO;
        }
        id object = objectFactory();
        if (!object) {
            return @NO;
        }
        PowerAuthManagedObject * managedObject = [[PowerAuthManagedObject alloc] initWithObject:object key:objectId tag:tag policies:policies];
        _register[registeredId] = managedObject;
        [self scheduleClenaup];
        return @YES;
    }] boolValue];
}

- (id) useObjectWithId:(NSString *)objectId expectedClass:(Class)expectedClass
{
    return [self synchronized:^id{
        return [self findManagedObject:objectId expectedClass:expectedClass options:OPT_SET_USE];
    }];
}

- (id) findObjectWithId:(NSString *)objectId expectedClass:(Class)expectedClass
{
    return [self synchronized:^id{
        return [self findManagedObject:objectId expectedClass:expectedClass options:0];
    }];
}

- (id) touchObjectWithId:(NSString *)objectId expectedClass:(Class)expectedClass
{
    return [self synchronized:^id{
        return [self findManagedObject:objectId expectedClass:expectedClass options:OPT_TOUCH];
    }];
}

- (BOOL) containsObjectWithId:(nonnull NSString*)objectId
{
    return [[self synchronized:^id{
        return @([self findManagedObject:objectId expectedClass:Nil options:0] != nil);
    }] boolValue];
}

- (void) removeAllObjectsWithTag:(NSString *)tag
{
    return [self synchronizedVoid:^{
        [self findAndRemoveObjects:^BOOL(NSString *key, PowerAuthManagedObject *obj) {
            return tag ? [obj.tag isEqualToString:tag] : YES;
        }];
    }];
}

- (id) removeObjectWithId:(NSString*)objectId expectedClass:(Class)expectedClass
{
    return [self synchronized:^{
        return [self findManagedObject:objectId expectedClass:expectedClass options:OPT_REMOVE];
    }];
}

- (BOOL) isValidObjectId:(id)objectId
{
    return [CAST_TO(objectId, NSString) length] > 0;
}

- (void) setCleanupPeriod:(NSInteger)period
{
    [self synchronizedVoid:^{
        if (period >= CLEANUP_PERIOD_MIN && period <= CLEANUP_PERIOD_MAX) {
            _cleanupPeriod = period;
        } else {
            _cleanupPeriod = CLEANUP_PERIOD_DEFAULT;
        }
        // Kick the cleanup now, because we don't want to wait for the next
        // tick if period is shorter.
        [self doCleanup];
    }];
}

// MARK: - Private

/// Execute block when internal mutex is acquired.
/// - Parameter block: Block to execute.
/// - Returns: Value returned from the block.
- (id) synchronized:(NS_NOESCAPE id(^)(void))block
{
    dispatch_semaphore_wait(_lock, DISPATCH_TIME_FOREVER);
    id result = block();
    dispatch_semaphore_signal(_lock);
    return result;
}

/// Execute void block when internal mutex is acquired.
/// - Parameter block: Block to execute.
- (void) synchronizedVoid:(NS_NOESCAPE void(^)(void))block
{
    dispatch_semaphore_wait(_lock, DISPATCH_TIME_FOREVER);
    block();
    dispatch_semaphore_signal(_lock);
}


/// Translate generated object ID or application specific object ID into
/// key to register. The function also handles possible invalid, or null
/// objects are passed from JavaScript by accident.
///
/// - Parameter objectId: Object ID to translate.
/// - Returns: Translated key to object register.
- (NSString*) translateObjectId:(id)objectId
{
    NSString * stringId = [RCTConvert NSString:objectId];
    if (stringId.length == 0) {
        return nil;
    }
    return objectId;
}

/// Find object in the object register.
/// - Parameters:
///   - objectId: Generated or application specific object register.
///   - expectedClass: Expected class to retrieve. If not provided, then the stored object can be anything.
///   - options: Additional operations that will be performed with the object. See `OPT_*` macros for more details.
/// - Returns: Object retrieved from the register or nil if no such object exist.
- (id) findManagedObject:(NSString*)objectId expectedClass:(Class)expectedClass options:(NSInteger)options
{
    NSString * registeredId = [self translateObjectId:objectId];
    if (registeredId) {
        PowerAuthManagedObject * managedObject = _register[registeredId];
        if (managedObject) {
            if (expectedClass == Nil || [managedObject.object isKindOfClass:expectedClass]) {
                if ([managedObject isStillValid]) {
                    // Still valid. Mark as used and then return the object.
                    if (options == OPT_SET_USE) {
                        // Set object as used.
                        [managedObject setUsed];
                    } else if (options == OPT_TOUCH) {
                        // Just touch the object and prolong its lifetime.
                        [managedObject touch];
                    } else if (options == OPT_REMOVE) {
                        // Remove object from the register.
                        [_register removeObjectForKey:registeredId];
                    }
                    return managedObject.object;
                }
            }
        }
    }
    return nil;
}

/// Schedule an object cleanup job.
- (void) scheduleClenaup
{
    if (!_scheduledCleanup && _register.count > 0) {
        _scheduledCleanup = YES;
        // Wake-up after cleanup period seconds and do the cleanup.
        dispatch_time_t when = dispatch_time(DISPATCH_TIME_NOW, _cleanupPeriod * NSEC_PER_MSEC);
        dispatch_queue_t queue = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0);
        dispatch_after(when, queue, ^{
            [self synchronizedVoid:^{
                [self doCleanup];
            }];
        });
    }
}

/// Function remove expired or no loner valid objects from the register.
- (void) doCleanup
{
    // Clear scheduled flag.
    _scheduledCleanup = NO;
    // Remove all invalid objects
    [self findAndRemoveObjects:^BOOL(NSString *key, PowerAuthManagedObject *obj) {
        return ![obj isStillValid];
    }];
    // Schedule cleanup for the next round
    [self scheduleClenaup];
}

/// Function find and remove objects from the register. The provided block decide whether object
/// needs to be removed.
/// - Parameter block: Block that decide whether object needs to be removed.
- (void) findAndRemoveObjects:(NS_NOESCAPE BOOL(^)(NSString * key, PowerAuthManagedObject * obj))block
{
    // Find objects that should be removed
    NSMutableArray * objectsToRemove = [NSMutableArray array];
    [_register enumerateKeysAndObjectsUsingBlock:^(NSString * key, PowerAuthManagedObject * obj, BOOL * stop) {
        if (block(key, obj)) {
            [objectsToRemove addObject:key];
        }
    }];
    // Remove objects found in the previous step.
    [_register removeObjectsForKeys:objectsToRemove];
}

/// Generate a new object identifier.
/// - Returns: New unique object identifier.
- (NSString*) generateIdentifier
{
    while(true) {
        NSString * identifier = _GetRandomString();
        if (![_register objectForKey:identifier]) {
            return identifier;
        }
    }
}

- (NSArray<NSDictionary*>*) debugDumpObjectsWithTag:(nullable NSString*)tag
{
#if DEBUG
    return [self synchronized:^{
        NSMutableArray * content = [NSMutableArray arrayWithCapacity:_register.count];
        [_register enumerateKeysAndObjectsUsingBlock:^(NSString * key, PowerAuthManagedObject * obj, BOOL * stop) {
            if (tag && (!obj.tag || ![obj.tag isEqualToString:tag])) {
                return;
            }
            [content addObject:[obj debugDump]];
        }];
        return content;
    }];
#else
    return @[];
#endif
}

#if DEBUG
- (NSString*) description
{
    return [[self debugDumpObjectsWithTag:nil] description];
}
#endif // DEBUG

@end


// MARK: - Managed Object Implementation -

@implementation PowerAuthManagedObject
{
    BOOL          _managedByOwner;
    NSUInteger    _policiesCount;
    ReleasePolicy _policies[4];
}

- (instancetype) initWithObject:(id)object key:(NSString*)key tag:(NSString*)tag policies:(NSArray<NSNumber *> *)policies
{
    self = [super init];
    if (self) {
        _object = object;
        _key = key;
        _tag = tag;
        _usageCount = 0;
        _createDate = [NSDate date];
        _lastUseDate = _createDate;
        // Update policies array
        _policiesCount = MIN(policies.count, 4);
        _managedByOwner = NO;
        [policies enumerateObjectsUsingBlock:^(NSNumber * policy, NSUInteger idx, BOOL * stop) {
            if (idx < _policiesCount) {
                _policies[idx].numericValue = [policy unsignedIntegerValue];
                if (_policies[idx].policy.policyType == RPT_Manual) {
                    _managedByOwner = YES;
                }
            }
        }];
    }
    return self;
}

- (void) setUsed
{
    _usageCount++;
    _lastUseDate = [NSDate date];
}

- (void) touch
{
    _lastUseDate = [NSDate date];
}


/// Evaluate whether time interval between now and reference date is greater or equal than time interval in release policy.
/// - Parameters:
///   - refDate: Reference date.
///   - rp: Pointer to release policy structure.
static inline BOOL _IsExpired(NSDate * refDate, ReleasePolicy rp)
{
    return (NSInteger)(-[refDate timeIntervalSinceNow] * 1000.0) >= rp.policy.policyParam;
}

- (BOOL) isStillValid
{
    // In case that object is manually managed, then don't iterate over the policies.
    if (_managedByOwner) {
        return YES;
    }
    for (NSUInteger idx = 0; idx < _policiesCount; ++idx) {
        switch (_policies[idx].policy.policyType) {
            case RPT_AfterUse:
                if (_usageCount >= _policies[idx].policy.policyParam) {
                    return NO;
                }
                break;
            case RPT_Expire:
                if (_IsExpired(_createDate, _policies[idx])) {
                    return NO;
                }
                break;
            case RPT_KeepAlive:
                if (_IsExpired(_lastUseDate, _policies[idx])) {
                    return NO;
                }
                break;
            default:
                break;
        }
    }
    return YES;
}

- (NSDictionary*) debugDump
{
#if DEBUG
    // Iterate over policies
    __block BOOL printLastUseDate = NO;
    __block BOOL printUsageCount = NO;
    NSArray * policies;
    if (_managedByOwner) {
        policies = @[ @"MANUAL" ];
    } else {
        NSMutableArray * p = [NSMutableArray array];
        for (NSUInteger idx = 0; idx < _policiesCount; ++idx) {
            switch (_policies[idx].policy.policyType) {
                case RPT_AfterUse:
                    [p addObject:[NSString stringWithFormat:@"AFTER_USE(%@/%@)", @(_usageCount), @(_policies[idx].policy.policyParam)]];
                    printUsageCount = YES;
                    break;
                case RPT_KeepAlive:
                    [p addObject:[NSString stringWithFormat:@"KEEP_ALIVE(%@)", @(_policies[idx].policy.policyParam)]];
                    printLastUseDate = YES;
                    break;
                case RPT_Expire:
                    [p addObject:[NSString stringWithFormat:@"EXPIRE(%@)", @(_policies[idx].policy.policyParam)]];
                    break;
                case RPT_Manual:
                    break;
            }
        }
        policies = p;
    }
    return @{
        @"id": _key,
        @"class": NSStringFromClass([_object class]),
        @"tag": _tag ? _tag : [NSNull null],
        @"createDate": @([_createDate timeIntervalSince1970]),
        @"lastUseDate": printLastUseDate ? @([_lastUseDate timeIntervalSince1970]) : [NSNull null],
        @"usageCount": printUsageCount ? @(_usageCount) : [NSNull null],
        @"policies": policies,
        @"isValid": @([self isStillValid])
    };
#else
    return @{};
#endif // DEBUG
}

@end
