/*
 * Copyright 2025 Wultra s.r.o.
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

#import "PowerAuthCryptoUtilsModule.h"
#import "Errors.h"
#import <PowerAuthCore/PowerAuthCoreCryptoUtils.h>

@implementation PowerAuthCryptoUtilsModule

RCT_EXPORT_MODULE(PowerAuthCryptoUtils);

+ (BOOL) requiresMainQueueSetup
{
    return NO;
}

// MARK: - JS interface

PAJS_METHOD_START(hashSha256,
                  PAJS_ARGUMENT(input, NSString*))
{
    NSString * inputBase64 = [RCTConvert NSString:input];
    if (!inputBase64) {
        reject(EC_WRONG_PARAMETER, @"Input cannot be converted to String.", nil);
        return;
    }
    NSData * decoded = [[NSData alloc] initWithBase64EncodedString:inputBase64 options:0];
    if (!decoded) {
        reject(EC_WRONG_PARAMETER, @"Input is not valid Base64.", nil);
        return;
    }
    NSData * hashData = [PowerAuthCoreCryptoUtils hashSha256:decoded];
    NSString * encoded = [hashData base64EncodedStringWithOptions:0];
    resolve(encoded);
}
PAJS_METHOD_END

PAJS_METHOD_START(randomBytes,
                  PAJS_ARGUMENT(length, PAJS_NONNULL_ARGUMENT NSNumber*))
{
    NSInteger len = [[RCTConvert NSNumber:length] integerValue];
    if (len < 0) {
        reject(EC_WRONG_PARAMETER, @"Length must be a non-negative integer", nil);
        return;
    }
    // Handle zero-length explicitly to return valid Base64 for empty data and avoid calling underlying generator with 0
    if (len == 0) {
        resolve(@"");
        return;
    }
    NSData * data = [PowerAuthCoreCryptoUtils randomBytes:(NSUInteger)len];
    if (!data) {
        NSError * error = [NSError errorWithDomain:NSOSStatusErrorDomain code:-1 userInfo:@{ NSLocalizedDescriptionKey: @"Failed to generate random bytes" }];
        ProcessError(error, reject);
        return;
    }
    NSString * encoded = [data base64EncodedStringWithOptions:0];
    resolve(encoded);
}
PAJS_METHOD_END

@end
