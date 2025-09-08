# Changelog

## TBA
- Fixed Android Encryptor crashing on missing `putLong` JNI bindings (issue [#264](https://github.com/wultra/react-native-powerauth-mobile-sdk/issues/264))

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