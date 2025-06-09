# Changelog

## 4.0.0 TBD
- Migration to the latest native PowerAuthSDK stack (1.9.x)
  - Use [migration guide](Version-4.0.md) for a smooth migration
- Possibility to sign Base64 encoded data with `signDataWithDevicePrivateKey`
  - we added the `dataFormat` parameter with possible `UTF8` and `BASE64` values for the data to be signed

## 3.1.0 TBD
- Support for the new React Architecture

## 3.0.1 (4/2025)
- Native PowerAuth SDK version raised to 1.7.12
  - Fixed build problems on Xcode 16.3
  - OpenSSL upgraded to version `1.1.1w`

## 3.0.0 (1/2025)

- Library renamed to `PowerAuth Mobile JS`
- Added Cordova support