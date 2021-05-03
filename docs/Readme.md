# React Native PowerAuth Mobile SDK

In order to connect to the [PowerAuth](https://www.wultra.com/product/powerauth-mobile-security-suite) service, mobile applications need to perform the required network and cryptographic processes, as described in the PowerAuth documentation. To simplify the implementation of these processes, developers can use React Native library from this repository.

## Integration Tutorials

- [Installation](Installation.md)
- [Configuration](Configuration.md)
- [Device Activation](Device-Activation.md)
- [Requesting Device Activation Status](Requesting-Device-Activation-Status.md)
- [Data Signing](Data-Signing.md)
- [Password Change](Password-Change.md)
- [Biometry Setup](Biometry-Setup.md)
- [Device Activation Removal](Device-Activation-Removal.md)
<!-- - [End-To-End Encryption](End-To-End-Encryption.md) -->
- [Secure Vault](Secure-Vault.md)
- [Recovery Codes](Recovery-Codes.md)
- [Token Based Authentication](Token-Based-Authentication.md)
<!-- - [Common SDK Tasks](Common-SDK-Tasks.md) -->

## Additional Topics

- [Sample Integration](Sample-Integration.md)

## Native Library

This React Native library is a wrapper for the native Android and iOS [PowerAuth SDK library](https://github.com/wultra/powerauth-mobile-sdk), which is a dependency of this project.

<!-- begin remove -->
## Demo application & example usage

Demo application with the PowerAuth React Native SDK integration can be found inside the `demoapp` folder.

Visit [App.tsx](https://github.com/wultra/react-native-powerauth-mobile-sdk/blob/develop/demoapp/App.tsx#docucheck-keep-link) for example usage of every available API method.
<!-- end -->