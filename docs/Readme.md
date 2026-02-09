# PowerAuth Mobile JS SDK

In order to connect to the [PowerAuth](https://www.wultra.com/mobile-security-suite) service, mobile applications need to perform the required network and cryptographic processes, as described in the PowerAuth documentation. To simplify the implementation of these processes, developers can use This PowerAuth Mobile JS SDK library (for Android and iOS) from this repository.

<!-- begin box info -->
We currently support __REACT NATIVE__ and __APACHE CORDOVA__ development platforms.
<!-- end -->

<!-- begin remove -->
## Integration Tutorials

- [Installation](Installation.md)
- [Configuration](Configuration.md)
- [Device Activation](Device-Activation.md)
- [Requesting Device Activation Status](Requesting-Device-Activation-Status.md)
- [Data Signing](Data-Signing.md)
- [Password Management](Password-Management.md)
- [Working with passwords securely](Secure-Password.md)
- [Biometry Setup](Biometry-Setup.md)
- [Device Activation Removal](Device-Activation-Removal.md)
- [End-To-End Encryption](End-To-End-Encryption.md)
- [Secure Vault](Secure-Vault.md)
- [Recovery Codes](Recovery-Codes.md)
- [Token Based Authentication](Token-Based-Authentication.md)
- [User Info](User-Info.md)

## Additional Topics

- [Troubleshooting](Troubleshooting.md)
- [Migration Instructions](Migration-Instructions.md)
- [Sample Integration](Sample-Integration.md)
- [Accessing the Native PowerAuthSDK](Accessing-Native-PowerAuthSDK.md)
- [Additional Utilities](Additional-Utilities.md)

## Other
- [Changelog](Changelog.md)
<!-- end -->

## Support and compatibility

| Version | React-Native<sup>1</sup> | Cordova   | Native SDK   | Server version | Support Status    |
|---------|--------------------------|-----------|--------------|----------------|-------------------|
| `4.3.x` | `0.73+`                  | `12.0.0+` | `1.9.x`      | `1.9+`         | Fully supported   |
| `4.2.x` | `0.73+`                  | `12.0.0+` | `1.9.x`      | `1.9+`         | Not supported     |
| `4.1.x` | `0.73+`                  | `12.0.0+` | `1.9.x`      | `1.9+`         | Not supported.    |
| `3.2.x` | `0.73+`                  | `12.0.0+` | `1.7.x`      | `0.24+`        | Security fixes    |
| `4.0.x` | `0.73+`                  | `12.0.0+` | `1.9.x`      | `1.9+`         | Not supported     |
| `3.1.x` | `0.73+`                  | `12.0.0+` | `1.7.x`      | `0.24+`        | Not supported     |
| `3.0.x` | `0.73+`                  | `12.0.0+` | `1.7.x`      | `0.24+`        | Not supported     |
| `2.5.x` | `0.73+`                  | -         | `1.7.x`      | `0.24+`        | Not supported     |
| `2.4.x` | `0.71+`                  | -         | `1.7.x`      | `0.24+`        | Not supported     |
| `2.3.x` | `0.64` - `0.70`          | -         | `1.7.x`      | `0.24+`        | Not supported     |
| `2.2.x` |                          | -         | `1.6.x`      | `0.24+`        | Not supported     |

<!-- begin box info -->
> Note 1: The library may also work with other React-Native versions, but we don't guarantee compatibility. The specified version is the version that we use for the development and for the tests.
<!-- end -->

## License

All sources are licensed using Apache 2.0 license, you can use them with no restriction. If you are using PowerAuth 2.0, please let us know. We will be happy to share and promote your project.

## Contact

If you need any assistance, do not hesitate to drop us a line at [hello@wultra.com](mailto:hello@wultra.com).

### Security Disclosure

If you believe you have identified a security vulnerability with PowerAuth, you should report it as soon as possible via email to [support@wultra.com](mailto:support@wultra.com). Please do not post it to a public issue tracker.
