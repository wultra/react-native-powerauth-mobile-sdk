/**
 * Copyright 2020 Wultra s.r.o.
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
#import <PowerAuth2/PowerAuthClientConfiguration.h>
#import <PowerAuth2/PowerAuthKeychainConfiguration.h>
#import <PowerAuth2/PowerAuthConfiguration.h>

@interface PowerAuth: NSObject<RCTBridgeModule>

/**
 * Prepares the PowerAuth instance.
 *
 * @param config PowerAuth configuration
 * @param keychainConfig PowerAuth Keychain configuration
 * @param clientConfig PowerAuth HTTP client configuration
 * @return If the configuration was successful.
*/
- (BOOL) configureWithConfig:(nonnull PowerAuthConfiguration *)config
             keychainConfig:(nullable PowerAuthKeychainConfiguration *)keychainConfig
               clientConfig:(nullable PowerAuthClientConfiguration *)clientConfig;
@end
