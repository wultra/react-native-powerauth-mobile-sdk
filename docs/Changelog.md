# Changelog

## TBA
- Updated React Native support to 0.87+, raising the minimum supported versions to Android 7.0 (API 24) and iOS 15.1 (issue[#440](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/440))
- Added support for OIDC Activation (issue[#235](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/235))
- Fixed issue, when entered correct password was reported as invalid in some rare cases (issue[#329](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/329))
- Changed end-to-end encryption to use an asynchronously acquired, single-use `PowerAuthEncryptor` for each request and response exchange. Removed the legacy cryptogram, separate decryptor, data-format, specialized encryption-header APIs, and `PowerAuthErrorCode.INVALID_ENCRYPTOR`.

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
