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

#import "PowerAuthGroupedPassword.h"
#import "Constants.h"

@implementation PowerAuthGroupedPassword
{
    PowerAuthMutablePassword * _full;
    PowerAuthMutablePassword * _legacy;
    NSMutableArray<NSNumber*> * _groupSizes;
}

- (instancetype) init
{
    self = [super init];
    if (self) {
        _full = [PowerAuthMutablePassword mutablePassword];
        _legacy = [PowerAuthMutablePassword mutablePassword];
        _groupSizes = [NSMutableArray array];
    }
    return self;
}

- (NSUInteger) length
{
    @synchronized (self) {
        return _groupSizes.count;
    }
}

- (void) clear
{
    @synchronized (self) {
        [_full clear];
        [_legacy clear];
        [_groupSizes removeAllObjects];
    }
}

- (void) addCharacter:(NSArray<NSNumber*>*)codePoints
{
    @synchronized (self) {
        [self insertCharacter:codePoints atIndex:_groupSizes.count];
    }
}

- (BOOL) insertCharacter:(NSArray<NSNumber*>*)codePoints atIndex:(NSUInteger)index
{
    @synchronized (self) {
        if (codePoints.count == 0 || index > _groupSizes.count) {
            return NO;
        }
        // Valid code points guarantee that the native insertions below cannot fail.
        for (NSNumber * codePoint in codePoints) {
            if (codePoint.unsignedIntValue > CODEPOINT_MAX) {
                return NO;
            }
        }
        NSUInteger offset = [self fullOffsetAtIndex:index];
        for (NSNumber * codePoint in codePoints) {
            [_full insertCharacter:codePoint.unsignedIntValue atIndex:offset++];
        }
        [_legacy insertCharacter:codePoints.firstObject.unsignedIntValue atIndex:index];
        [_groupSizes insertObject:@(codePoints.count) atIndex:index];
        return YES;
    }
}

- (BOOL) removeCharacterAtIndex:(NSUInteger)index
{
    @synchronized (self) {
        if (index >= _groupSizes.count) {
            return NO;
        }
        NSUInteger offset = [self fullOffsetAtIndex:index];
        NSUInteger groupSize = _groupSizes[index].unsignedIntegerValue;
        for (NSUInteger i = 0; i < groupSize; i++) {
            [_full removeCharacterAtIndex:offset];
        }
        [_legacy removeCharacterAtIndex:index];
        [_groupSizes removeObjectAtIndex:index];
        return YES;
    }
}

- (void) removeLastCharacter
{
    @synchronized (self) {
        if (_groupSizes.count > 0) {
            [self removeCharacterAtIndex:_groupSizes.count - 1];
        }
    }
}

- (BOOL) isEqualToGroupedPassword:(PowerAuthGroupedPassword*)password
{
    PowerAuthPassword * other = [password immutablePassword];
    @synchronized (self) {
        BOOL result = [_full isEqualToPassword:other];
        [other secureClear];
        return result;
    }
}

- (PowerAuthPassword*) immutablePassword
{
    @synchronized (self) {
        return [_full copyToImmutable];
    }
}

- (PowerAuthPassword*) immutablePasswordWithLegacy:(PowerAuthPassword * _Nullable * _Nonnull)legacyPassword
{
    @synchronized (self) {
        *legacyPassword = _full.length != _legacy.length ? [_legacy copyToImmutable] : nil;
        return [_full copyToImmutable];
    }
}

// MARK: - Private

- (NSUInteger) fullOffsetAtIndex:(NSUInteger)index
{
    NSUInteger offset = 0;
    for (NSUInteger i = 0; i < index; i++) {
        offset += _groupSizes[i].unsignedIntegerValue;
    }
    return offset;
}

@end
