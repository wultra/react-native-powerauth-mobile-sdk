# Changelog

## TBA

- Updated the minimum supported React Native version to 0.87, Android version to 7.0 (API 24), and iOS version to 15.1. ([#440](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/440))
- Added experimental Swift Package Manager support for iOS with React Native 0.87 or later. ([#463](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/463), [#416](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/416))
- Added support for OIDC activation. ([#235](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/235))
- Fixed an issue where a correct password was occasionally reported as invalid. ([#329](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/329))
- Changed end-to-end encryption to use an asynchronously acquired, single-use `PowerAuthEncryptor` for each request and response exchange. ([#466](https://github.com/wultra/react-native-powerauth-mobile-sdk/pull/466))
  - Removed the legacy cryptogram, separate decryptor, encryption data-format arguments, specialized encryption-header APIs, and `PowerAuthErrorCode.INVALID_ENCRYPTOR`.
- Updated request and token authentication to use the native PowerAuth 2.0 APIs. ([#467](https://github.com/wultra/react-native-powerauth-mobile-sdk/pull/467))
  - Added `PowerAuthHttpHeader`, request authentication header methods, asynchronous offline authentication codes, and `PowerAuthTokenStore.generateAuthenticationHeader()`.
  - Deprecated the legacy signature and token-header wrappers and changed token-header generation to propagate native errors directly.
- Added instance-aware biometric status and availability APIs, biometric configuration and prompt options, asynchronous factor management, and reusable biometric authentication for native PowerAuth 2.0. ([#468](https://github.com/wultra/react-native-powerauth-mobile-sdk/pull/468))
- Changed `groupedBiometricAuthentication()` to report all callback exceptions as `PowerAuthErrorCode.UNKNOWN_ERROR`, including `PowerAuthError` exceptions whose codes were previously preserved. ([#468](https://github.com/wultra/react-native-powerauth-mobile-sdk/pull/468))
- Added algorithm selection, offline authentication-code component length, asynchronous native configuration getters, current algorithm reporting, and instance-data cleanup. ([#472](https://github.com/wultra/react-native-powerauth-mobile-sdk/pull/472))
  - Changed the default algorithm to protocol-4 `PowerAuthAlgorithm.P384_L3`. Applications that need protocol 3.3 must explicitly select `PowerAuthAlgorithm.LEGACY`.
- Added protocol-upgrade availability and pending-state checks, password-authorized upgrade execution, and upgrade result data. ([#474](https://github.com/wultra/react-native-powerauth-mobile-sdk/pull/474))
  - Added optional biometric-factor migration on Android and automatic biometric-factor preservation on iOS.
- Added the native-backed two-step password-change API with `beginPasswordChange()`, `finishPasswordChange()`, and opaque `PowerAuthPasswordChangeData`. ([#476](https://github.com/wultra/react-native-powerauth-mobile-sdk/pull/476))
  - Deprecated the legacy one-step, validation, and unsafe password-change APIs and enforced the distinction between activation-persistence and ordinary authentication objects.
- Added explicit-key digital signatures, JWS/JWT calculation and verification, device public-key export, and certificate signing request generation with Base64 strings for binary inputs and outputs. ([#479](https://github.com/wultra/react-native-powerauth-mobile-sdk/pull/479))
  - Deprecated the legacy server and device signature helpers.
- Added native-backed protocol-4 Secure Vault base keys with purpose-specific derivation and explicit release. ([#480](https://github.com/wultra/react-native-powerauth-mobile-sdk/pull/480))
  - Deprecated `fetchEncryptionKey()` while retaining support for protocol 3.3.

See the [JavaScript SDK 5.0.0 migration guide](Version-5.0.md) for breaking changes and migration instructions.

## 4.2.0 (12/2025)
- Added `PowerAuthCryptoUtils` with functions for hashing and random bytes generation (see [Crypto Utilities](./Crypto-Utilities.md) for more details)
- Added helper method to create `PowerAuthPassword` from string (`PowerAuthPassword.fromString`) (see [Secure Password](./Secure-Password.md) for more details)
- Added [User Info](./User-Info.md) feature to retrieve user-related information from the server
- Added `PowerAuthStorageUtils` cache API with secure & standard storage (see [Storage Utilities](./Storage-Utilities.md))
- Fixed bridged native error processing on Cordova (issue[#302](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/302))

## 4.1.3 (9/2025)
- Token-based authentication now automatically synchronizes time if needed (see [Token-Based Authentication](./Token-Based-Authentication.md) for more details)

## 4.1.2 (9/2025)
- Fixed Android Encryptor crashing on missing `putLong` JNI bindings (issue [#264](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/264))
- Added [Time Synchronization service](./Time-Synchronization.md)

## 4.1.1 (7/2025)

- Upgraded the [PowerAuth native SDK to `1.9.5`](https://github.com/wultra/powerauth-mobile-sdk/releases/tag/1.9.5)
  - Biometric authentication offloaded to the background thread

## 4.1.0 (6/2025)
- Opportunity to sign Base64 encoded data with `signDataWithDevicePrivateKey`
  - we added the `dataFormat` parameter with possible `UTF8` and `BASE64` values for the data to be signed
- Added `PowerAuthUtils` that provides `getEnvironmentInfo` with device, system and app info
- Fixed issue on Cordova when iPadOS was recognized as Android in some cases
- Fixed `validatePassword` API on iOS that returned wrong value

## 3.2.0 (6/2025)
- Added `PowerAuthUtils` that provides `getEnvironmentInfo` with device, system and app info
- Fixed issue on Cordova when iPadOS was recognized as Android in some cases

## 4.0.0 (5/2025)
- Migration to the latest native PowerAuthSDK stack (1.9.x)
  - Use [migration guide](Version-4.0.md) for a smooth migration

## 3.1.0 (5/2025)
- Support for the new React Architecture

## 3.0.1 (4/2025)
- Native PowerAuth SDK version raised to 1.7.12
  - Fixed build problems on Xcode 16.3
  - OpenSSL upgraded to version `1.1.1w`

## 3.0.0 (1/2025)

- Library renamed to `PowerAuth Mobile JS`
- Added Cordova support
