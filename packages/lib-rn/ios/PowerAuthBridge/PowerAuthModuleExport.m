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

// Declarations only: exports methods of the Swift `PowerAuthModule` class to React Native as `PowerAuth`.

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_REMAP_MODULE(PowerAuth, PowerAuthModule, NSObject)

RCT_EXTERN_METHOD(isConfigured:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cleanupInstanceData:(NSString *)instanceId
                  configuration:(NSDictionary *)configuration
                  keychainConfiguration:(NSDictionary *)keychainConfiguration
                  sharingConfiguration:(NSDictionary *)sharingConfiguration
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getConfiguration:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getCurrentAlgorithm:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(beginPasswordChange:(NSString *)instanceId
                  oldPassword:(id)oldPassword
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(finishPasswordChange:(NSString *)instanceId
                  newPassword:(id)newPassword
                  passwordChangeDataId:(NSString *)passwordChangeDataId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getClientConfiguration:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getBiometryConfiguration:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getKeychainConfiguration:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSharingConfiguration:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(configure:(NSString *)instanceId
                  configuration:(NSDictionary *)configuration
                  clientConfiguration:(NSDictionary *)clientConfiguration
                  biometryConfiguration:(NSDictionary *)biometryConfiguration
                  keychainConfiguration:(NSDictionary *)keychainConfiguration
                  sharingConfiguration:(NSDictionary *)sharingConfiguration
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deconfigure:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasValidActivation:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(canStartActivation:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasPendingActivation:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getExternalPendingOperation:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchActivationStatus:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasProtocolUpgradeAvailable:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasPendingProtocolUpgrade:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startProtocolUpgrade:(NSString *)instanceId
                  password:(id)password
                  upgradeBiometry:(BOOL)upgradeBiometry
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(createActivation:(NSString *)instanceId
                  activation:(NSDictionary *)activation
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(persistActivation:(NSString *)instanceId
                  authentication:(NSDictionary *)authentication
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(activationIdentifier:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(activationFingerprint:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeActivationWithAuthentication:(NSString *)instanceId
                  authDict:(NSDictionary *)authDict
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeActivationLocal:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(authenticationHeaderForRequestWithParams:(NSString *)instanceId
                  authDict:(NSDictionary *)authDict
                  method:(NSString *)method
                  uriId:(NSString *)uriId
                  params:(NSDictionary *)params
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(authenticationHeaderForRequestWithBody:(NSString *)instanceId
                  authDict:(NSDictionary *)authDict
                  method:(NSString *)method
                  uriId:(NSString *)uriId
                  body:(nullable NSString *)body
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(offlineAuthenticationCode:(NSString *)instanceId
                  authDict:(NSDictionary *)authDict
                  uriId:(NSString *)uriId
                  body:(nullable NSString *)body
                  nonce:(nonnull NSString *)nonce
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(verifyDigitalSignature:(NSString *)instanceId
                  signature:(nonnull NSString *)signature
                  data:(nonnull NSString *)data
                  signatureKeyId:(nonnull NSString *)signatureKeyId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(calculateDigitalSignature:(NSString *)instanceId
                  authDict:(NSDictionary *)authDict
                  data:(nonnull NSString *)data
                  signatureKeyId:(nonnull NSString *)signatureKeyId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(exportDevicePublicKeys:(NSString *)instanceId
                  format:(nonnull NSString *)format
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(verifyJwsSignature:(NSString *)instanceId
                  signature:(nonnull NSString *)signature
                  compact:(BOOL)compact
                  strict:(BOOL)strict
                  signatureKeyId:(nonnull NSString *)signatureKeyId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(calculateJwsSignature:(NSString *)instanceId
                  authDict:(NSDictionary *)authDict
                  data:(nonnull NSString *)data
                  dataType:(nullable NSString *)dataType
                  compact:(BOOL)compact
                  signatureKeyId:(nonnull NSString *)signatureKeyId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(createCertificateSigningRequest:(NSString *)instanceId
                  authDict:(NSDictionary *)authDict
                  distinguishedNames:(NSDictionary *)distinguishedNames
                  subjectAltNames:(nullable NSArray *)subjectAltNames
                  signatureKeyId:(nonnull NSString *)signatureKeyId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(verifyServerSignedData:(NSString *)instanceId
                  data:(nonnull NSString *)data
                  signature:(nonnull NSString *)signature
                  masterKey:(BOOL)masterKey
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(unsafeChangePassword:(NSString *)instanceId
                  oldPassword:(id)oldPassword
                  newPassword:(id)newPassword
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(changePassword:(NSString *)instanceId
                  oldPassword:(id)oldPassword
                  newPassword:(id)newPassword
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(addBiometryFactor:(NSString *)instanceId
                  password:(id)password
                  foo:(id)foo
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasBiometryFactor:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeBiometryFactor:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getBiometricStatus:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isAuthenticationWithBiometricsAvailable:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getBiometryInfo:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchEncryptionKey:(NSString *)instanceId
                  authDict:(NSDictionary *)authDict
                  index:(nonnull NSNumber *)index
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchSecureVaultKey:(NSString *)instanceId
                  authDict:(NSDictionary *)authDict
                  keyIdentifierValue:(NSString *)keyIdentifierValue
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deriveSecureVaultKey:(NSString *)objectId
                  index:(nonnull NSNumber *)index
                  keySize:(nonnull NSNumber *)keySize
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(signDataWithDevicePrivateKey:(NSString *)instanceId
                  authDict:(NSDictionary *)authDict
                  data:(NSString *)data
                  dataFormat:(NSString *)dataFormat
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(validatePassword:(NSString *)instanceId
                  password:(id)password
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(authenticateWithBiometry:(NSString *)instanceId
                  prompt:(nonnull NSDictionary *)prompt
                  makeReusable:(BOOL)makeReusable
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(parseActivationCode:(NSString *)activationCode
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(validateActivationCode:(NSString *)activationCode
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(validateTypedCharacter:(nonnull NSNumber *)utfCodepoint
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(correctTypedCharacter:(nonnull NSNumber *)utfCodepoint
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(requestAccessToken:(NSString *)instanceId
                  tokenName:(nonnull NSString *)tokenName
                  authDict:(NSDictionary *)authDict
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeAccessToken:(NSString *)instanceId
                  tokenName:(nonnull NSString *)tokenName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasLocalToken:(NSString *)instanceId
                  tokenName:(nonnull NSString *)tokenName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getLocalToken:(NSString *)instanceId
                  tokenName:(nonnull NSString *)tokenName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeLocalToken:(NSString *)instanceId
                  tokenName:(nonnull NSString *)tokenName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(removeAllLocalTokens:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(generateAuthenticationHeaderForToken:(NSString *)instanceId
                  tokenName:(nonnull NSString *)tokenName
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchUserInfo:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getLastFetchedUserInfo:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isTimeSynchronized:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(localTimeAdjustment:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(localTimeAdjustmentPrecision:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(currentTime:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(synchronizeTime:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(resetTimeSynchronization:(NSString *)instanceId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getEnvironmentInfo:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
