# React Native PowerAuth Mobile SDK

In order to connect to the [PowerAuth](https://www.wultra.com/product/powerauth-mobile-security-suite) service, mobile applications need to perform the required network and cryptographic processes, as described in the PowerAuth documentation. To simplify implementation of these processes, developers can use React Native library from this repository.

## Supported Platforms

The library is available for the following __React Native (0.64.0+)__ platforms:

- __Android 5.0 (API 21)__ and newer
- __iOS 11.0__ and newer

## Integration Tutorials

- [Integration](SDK-Integration.md)
- [Configuration](Configuration.md)
- [Device Activation](Device-Activation.md)
- [Requesting Device Activation Status](Requesting-Device-Activation-Status.md)
- [Data Signing](Data-Signing.md)
- [Password Change](Password-Change.md)
- [Biometry Setup](Biometry-Setup.md)
- [Device Activation Removal](Device-Activation-Removal.md)
- [End-To-End Encryption](End-To-End-Encryption.md)
- [Secure Vault](Secure-Vault.md)
- [Recovery Codes](Recovery-Codes.md)
- [Token Based Authentication](Token-Based-Authentication.md)
- [Common SDK Tasks](Common-SDK-Tasks.md)

## Native Library

This React Native library is a wrapper for the native Android and iOS [PowerAuth SDK library](https://github.com/wultra/powerauth-mobile-sdk), which is a dependency of this project.

## Demo application & example usage

Demo application with the integration of the PowerAuth React Native SDK can be found inside the `demoapp` folder.

Visit [App.tsx](https://github.com/wultra/react-native-powerauth-mobile-sdk/blob/develop/demoapp/App.tsx) for example usage of every available API method.

## License

All sources are licensed using Apache 2.0 license, you can use them with no restriction. If you are using PowerAuth 2.0, please let us know. We will be happy to share and promote your project.

## Contact

If you need any assistance, do not hesitate to drop us a line at [hello@wultra.com](mailto:hello@wultra.com).

### Security Disclosure

If you believe you have identified a security vulnerability with PowerAuth, you should report it as soon as possible via email to [support@wultra.com](mailto:support@wultra.com). Please do not post it to a public issue tracker.
