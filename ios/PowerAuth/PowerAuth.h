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


@interface PowerAuth: NSObject<RCTBridgeModule>

/**
 * Prepares the PowerAuth instance.
 *
 * @param instanceId Identifier of the PowerAuthSDK instance. The package name is recommended.
 * @param appKey APPLICATION_KEY as defined in PowerAuth specification - a key identifying an application version.
 * @param appSecret APPLICATION_SECRET as defined in PowerAuth specification - a secret associated with an application version.
 * @param masterServerPublicKey KEY_SERVER_MASTER_PUBLIC as defined in PowerAuth specification - a master server public key.
 * @param baseEndpointUrl Base URL to the PowerAuth Standard RESTful API (the URL part before "/pa/...").
 * @param enableUnsecureTraffic If HTTP and invalid HTTPS communication should be enabled
 * @return If the configuration was successful.
*/
- (BOOL) configureWithInstanceId:(NSString*)instanceId
                          appKey:(NSString*)appKey
                       appSecret:(NSString*)appSecret
           masterServerPublicKey:(NSString*)masterServerPublicKey
                 baseEndpointUrl:(NSString*)baseEndpointUrl
           enableUnsecureTraffic:(BOOL)enableUnsecureTraffic;

@end
