/**
 * Copyright 2024 Wultra s.r.o.
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

#ifndef PAJS_DEFS
#define PAJS_DEFS

#import "PAJSPlatform.h"

/**
 THIS FILE CONTAINS MACROS THAT ABSTRACT NATIVE BRIDGE CODE SO WE ARE
 ABLE TO USE SINGLE FILE ON BOTH CORDOVA AND REACT-NATIVE
 */


#pragma mark - REACT NATIVE

#ifdef PAJS_REACT

#import <React/RCTBridgeModule.h>
#import <React/RCTInitializing.h>
#import <React/RCTConvert.h>
#import <React/RCTInvalidating.h>

#define PAJS_MODULE(name) @interface name : NSObject<RCTBridgeModule, RCTInitializing>
#define PAJS_MODULE_BASIC(name) @interface name : NSObject<RCTBridgeModule>
#define PAJS_MODULE_INVALIDATING <RCTInvalidating>

#define PAJS_MODULE_REGISTRY @synthesize moduleRegistry = _moduleRegistry;

#define PAJS_OBJECT_REGISTER _objectRegister = [_moduleRegistry moduleForName:"PowerAuthObjectRegister"];

#define PAJS_NULLABLE_ARGUMENT nullable
#define PAJS_NONNULL_ARGUMENT nonnull
#define PAJS_ARGUMENT(name, type) name:(type)name \

#define PAJS_METHOD_START(name, parameters) \
RCT_REMAP_METHOD(name,\
                 parameters \
                 resolve:(RCTPromiseResolveBlock)resolve \
                 name##reject:(RCTPromiseRejectBlock)reject)

#define PAJS_METHOD_END

#define PAJS_INITIALIZE_METHOD initialize
#define PAJS_INVALIDATE_METHOD invalidate

#elif defined PAJS_CORDOVA

#pragma mark - CORDOVA

#import <Cordova/CDVPlugin.h>
#import <Cordova/CDVAppDelegate.h>
#import <Cordova/CDVViewController.h>
#import "RCTConvert.h"

typedef void (^RCTPromiseRejectBlock)(NSString *code, NSString *message, NSError *error);
typedef void (^RCTPromiseResolveBlock)(id result);
#define RCT_EXPORT_MODULE(name)

#define PAJS_MODULE(name) @interface name : CDVPlugin
#define PAJS_MODULE_BASIC(name) PAJS_MODULE(name)
#define PAJS_MODULE_INVALIDATING

#define PAJS_METHOD_START(name, parameters) \
- (void)name:(CDVInvokedUrlCommand*)cmd \
{ \
    int paramIdx = 0; \
    parameters \
    RCTPromiseRejectBlock reject = ^(NSString *code, NSString *message, NSError *error) { \
        [[self commandDelegate] sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_ERROR messageAsString:message] callbackId: cmd.callbackId]; \
    }; \
    RCTPromiseResolveBlock resolve = ^(id result) { \
        NSError *writeError = nil; \
NSData *jsonData = [NSJSONSerialization dataWithJSONObject:@{ @"result": result } options:NSJSONWritingPrettyPrinted error:&writeError]; \
        NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];   \
        [[self commandDelegate] sendPluginResult:[CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsString:jsonString] callbackId: cmd.callbackId]; \
    };

#define PAJS_METHOD_END }

#define PAJS_NULLABLE_ARGUMENT
#define PAJS_NONNULL_ARGUMENT
#define PAJS_ARGUMENT(name, type) type name = [cmd argumentAtIndex:paramIdx++];

#define PAJS_MODULE_REGISTRY

#define PAJS_INITIALIZE_METHOD pluginInitialize
#define PAJS_INVALIDATE_METHOD dispose

#define PAJS_OBJECT_REGISTER CDVAppDelegate *cdvAd = [self appDelegate]; \
CDVViewController *cdvVc = [cdvAd viewController]; \
_objectRegister = [[cdvVc pluginObjects] objectForKey:@"PowerAuthObjectRegister"];

#endif // PAJS_CORDOVA

#endif // PAJS_DEFS
