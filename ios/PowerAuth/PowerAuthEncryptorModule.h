/*
 * Copyright 2023 Wultra s.r.o.
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

@class PowerAuthCoreEciesEncryptor;

/// Object containing all encryptor's data required for the request encryption.
@interface PowerAuthJsEncryptor: NSObject

- (nonnull instancetype) initWithEncryptor:(nonnull PowerAuthCoreEciesEncryptor*)encryptor
                       powerAuthInstanceId:(nonnull NSString*)powerAuthInstanceId
                          activationScoped:(BOOL)activationScoped;

@property (nonatomic, readonly) BOOL activationScoped;
@property (nonatomic, readonly, strong, nonnull) PowerAuthCoreEciesEncryptor * coreEncryptor;
@property (nonatomic, readonly, strong, nonnull) NSString * powerAuthInstanceId;

@end

// "PowerAuthEncryptor" module

PAJS_MODULE(PowerAuthEncryptorModule)

/// Use native encryptor object with given identifier.
/// - Parameters:
///   - encryptorId: Encryptor's identifier.
///   - reject: Reject function.
///   - action: Action to execute when encryptor exists and can be used.
- (void) useEncryptor:(nullable NSString*)encryptorId
             rejecter:(nonnull RCTPromiseRejectBlock)reject
               action:(NS_NOESCAPE void(^_Nonnull)(PowerAuthJsEncryptor * _Nonnull encryptor))action;

/// Touch native encryptor object with given identifier in the object register.
/// - Parameters:
///   - encryptorId: Encryptor's identifier.
///   - reject: Reject function.
///   - action: Action to execute when encryptor exists and can be used.
- (void) touchEncryptor:(nullable NSString*)encryptorId
               rejecter:(nonnull RCTPromiseRejectBlock)reject
                 action:(NS_NOESCAPE void(^_Nonnull)(PowerAuthJsEncryptor * _Nonnull encryptor))action;

@end
