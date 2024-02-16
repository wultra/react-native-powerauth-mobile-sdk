# React Native PowerAuth Mobile SDK

In order to connect to the [PowerAuth](https://www.wultra.com/product/powerauth-mobile-security-suite) service, mobile applications need to perform the required network and cryptographic processes, as described in the PowerAuth documentation. To simplify the implementation of these processes, developers can use React Native library from this repository.

<!-- begin remove -->
## Integration Tutorials

- [Installation](Installation.md)
- [Configuration](Configuration.md)
- [Device Activation](Device-Activation.md)
- [Requesting Device Activation Status](Requesting-Device-Activation-Status.md)
- [Data Signing](Data-Signing.md)
- [Password Change](Password-Change.md)
- [Working with passwords securely](Secure-Password.md)
- [Biometry Setup](Biometry-Setup.md)
- [Device Activation Removal](Device-Activation-Removal.md)
- [End-To-End Encryption](End-To-End-Encryption.md)
- [Secure Vault](Secure-Vault.md)
- [Recovery Codes](Recovery-Codes.md)
- [Token Based Authentication](Token-Based-Authentication.md)

## Additional Topics

- [Troubleshooting](Troubleshooting.md)
- [Migration Instructions](Migration-Instructions.md)
- [Sample Integration](Sample-Integration.md)
<!-- end -->

## Support and compatibility

| Version | React-Native<sup>1</sup> | Native SDK   | Server version | Support Status    |
|---------|-----------------|--------------|----------------|-------------------|
| `2.5.x` | `0.73+`         | `1.7.x`      | `0.24+`        | Fully supported   |
| `2.4.x` | `0.71+`         | `1.7.x`      | `0.24+`        | Security bugfixes |
| `2.3.x` | `0.64` - `0.70` | `1.7.x`      | `0.24+`        | Security bugfixes |
| `2.2.x` |                 | `1.6.x`      | `0.24+`        | Not supported     |

<!-- begin box info -->
Note 1: The library may work also with other React-Native versions but we don't guarantee the compatibility. The specified version is version that we use for the development and for the tests.
<!-- end -->

## License

All sources are licensed using Apache 2.0 license, you can use them with no restriction. If you are using PowerAuth 2.0, please let us know. We will be happy to share and promote your project.

## Contact

If you need any assistance, do not hesitate to drop us a line at [hello@wultra.com](mailto:hello@wultra.com).

### Security Disclosure

If you believe you have identified a security vulnerability with PowerAuth, you should report it as soon as possible via email to [support@wultra.com](mailto:support@wultra.com). Please do not post it to a public issue tracker.
