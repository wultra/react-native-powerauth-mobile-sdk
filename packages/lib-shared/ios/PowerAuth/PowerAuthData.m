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

#import "PowerAuthData.h"
#import "Utilities.h"

@implementation PowerAuthData
{
    BOOL _cleanup;
}

- (instancetype) initWithData:(nonnull NSData*)data
                      cleanup:(BOOL)cleanup
{
    self = [super init];
    if (self) {
        _data = data;
        _cleanup = cleanup;
    }
    return self;
}

- (void) dealloc
{
    if (_cleanup) {
        NSMutableData * mutable = CAST_TO(_data, NSMutableData);
        if (mutable) {
            memset(mutable.mutableBytes, 0, mutable.length);
        }
    }
}

@end
