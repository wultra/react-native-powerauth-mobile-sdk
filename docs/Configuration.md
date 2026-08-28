# Configuration

Before you call any method on the newly created `const powerAuth = new PowerAuth(instanceId)` object, you need to configure it first. Unconfigured instance will throw exceptions. Use `await powerAuth.isConfigured()` to check if configured.

## 1. Parameters

You will need the following parameters to prepare and configure a PowerAuth instance:

- **instanceId** - Identifier of the app - the aplication package name/identifier is recommended.  
- **configuration** - String (base64) with the cryptographic configuration.
- **baseEndpointUrl** - Base URL to the PowerAuth Standard RESTful API (the URL part before "/pa/...").  
- **enableUnsecureTraffic** - If HTTP or invalid HTTPS communication should be enabled (do not set `true` in production).

## 2. Configuration

### Basic configuration

To configure PowerAuth instance simply import it from the module and use the following snippet.

```javascript
class AppMyApplication {

    private powerAuth = new PowerAuth("your-app-instance-id");
    
    async setupPowerAuth() {
        // already configured instance will throw an
        // exception when you'll try to configure it again
        const isConfigured = await this.powerAuth.isConfigured();
        if (isConfigured) {
            console.log("PowerAuth was already configured.");
        } else {
            try {
                await this.powerAuth.configure("CONFIGURATION_STRING", "https://your-powerauth-server.com/enrollment-server", false);
                console.log("PowerAuth configuration successfull.");
            } catch(e) {
                console.log(`PowerAuth failed to configure: ${e.code}`);
            }
        }
    }
}
```

### Advanced configuration

In case that you need an advanced configuration, then you can import and use the following configuration classes or interfaces:
- `PowerAuthConfiguration` class or `PowerAuthConfigurationType` interface － to configure instance of `PowerAuth` class. This configuration object contains almost the same parameters you provide to basic configuration.
  - `algorithm` - optional algorithm selected for communication with the server. The available values are `PowerAuthAlgorithm.LEGACY`, `P384`, `P384_L3`, and `P384_L5`. If omitted, the native SDK default (`P384_L3`) is used.
  - `offlineAuthenticationCodeComponentLength` - length of one offline authentication-code component, from `4` through `8`. The default is `8`.

> Upgrading applications that previously relied on the implicit legacy protocol must explicitly set `PowerAuthAlgorithm.LEGACY`. Omitting `algorithm` now enables the native protocol-4 default and requires a compatible PowerAuth Server.

- `PowerAuthClientConfiguration` class or `PowerAuthClientConfigurationType` interface － to configure internal HTTP client. You can alter the following parameters:
  - `enableUnsecureTraffic` - If HTTP or invalid HTTPS communication should be enabled (do not set `true` in production).
  - `connectionTimeout` - timeout in seconds. The default value is `20` seconds.
  - `readTimeout` - timeout in seconds, effective only on Androd platform. The default value is `20` seconds.
  - `customHttpHeaders` - custom HTTP headers that will be added to each HTTP request produced by the PowerAuth instance.
  - `basicHttpAuthentication` - basic HTTP Authentication will be added to each HTTP request produced by the PowerAuth instance.

- `PowerAuthBiometryConfiguration` class or `PowerAuthBiometryConfigurationType` interface － to configure biometric authentication. You can alter the following parameters:
  - `invalidateBiometricFactorAfterChange` - set to `true` if the key protected with the biometry is invalidated if fingers are added or removed, or if the user re-enrolls for face. The default value depends on platform:
    - On Android is set to `true`
    - On iOS  is set to `false`
  - `fallbackToDevicePasscode` - iOS specific, If set to `true`, then the key protected with the biometry can be accessed also with a device passcode. If set, then `invalidateBiometricFactorAfterChange` option has no effect. The default is `false`, so fallback to device's passcode is not enabled.
  - `confirmBiometricAuthentication` - Android specific, if set to `true`, then the user's confirmation will be required after the successful biometric authentication. The default value is `false`.
  - `authenticateOnBiometricKeySetup` - Android specific, if set to `true`, then the biometric key setup always require a biometric authentication. See note<sup>1</sup> below. The default value is `true`.
  - `fallbackToSharedBiometryKey` - Android specific, defines whether fallback to a shared, legacy biometry key is enabled. By default, this is enabled for compatibility reasons.
  - `useLegacySymmetricKey` - Android specific, if set to `true`, newly configured factors use the legacy AES-KDF protection. The default is `false`.

- `PowerAuthKeychainConfiguration` class or `PowerAuthKeychainConfigurationType` interface － to configure secure data storage on Android. You can alter the following parameters:
  - `accessGroupName` and `userDefaultsSuiteName` remain as deprecated compatibility properties for existing Apple applications. Configure new activation sharing with `PowerAuthSharingConfiguration`.
  - `minimalRequiredKeychainProtection` - Android specific, defines minimal required keychain protection level that must be supported on the current device. The default value is `PowerAuthKeychainProtection.NONE`. See note<sup>3</sup> below.

- `PowerAuthSharingConfiguration` class or `PowerAuthSharingConfigurationType` interface - to configure an activation data sharing on iOS platform. You can alter the following parameters:
  - `appGroup` - defines name of app group that allows you sharing data between multiple applications. Be aware that the value  overrides `accessGroupName` property if it's provided in `PowerAuthKeychainConfiguration`.
  - `appIdentifier`- defines unique application identifier. This identifier helps you to determine which application currently holds the lock on activation data in a special operations.
  - `keychainAccessGroup` - defines keychain access group name used by the PowerAuthSDK keychain instances.
  - `sharedMemoryIdentifier` - defines optional identifier of memory shared between the applications in app group. If identifier is not provided then PowerAuthSDK calculate unique identifier based on `PowerAuth.instanceId`.
  - If you're not familiar with sharing data between iOS applications, or app extensions, then please refer the native PowerAuth mobile SDK documentation, where this topic is explained in more detail. 


> Note 1: Setting `authenticateOnBiometricKeySetup` to `true` requires a biometric prompt while persisting an activation or adding a biometric factor. If set to `false`, key setup can proceed without user interaction. The default key protection uses HMAC-KDF; set `useLegacySymmetricKey` only when compatibility with the legacy AES-KDF protection is required.

> Note 2: You're responsible for migrating keychain and `UserDefaults` data from non-shared storage before configuring activation sharing in a shipped application.

> Note 3: If you enforce the protection higher than `PowerAuthKeychainProtection.NONE`, then your application must target at least Android 6.0. Your application should also properly handle `"INSUFFICIENT_KEYCHAIN_PROTECTION"` error code reported when the device has insufficient capabilities to run your application. You should properly inform user about this situation.

<!-- begin box warning -->
Do not enable `fallbackToDevicePasscode` when your application must distinguish biometric authentication from knowledge-factor authentication, including applications subject to regulations that require a biometric factor. If the key is unlocked with the device passcode, the resulting authentication is no longer proof that the user authenticated with biometry.
<!-- end -->

The following code snipped shows usage of the advanced configuration:

```javascript
class AppMyApplication {

    private powerAuth = new PowerAuth("your-app-instance-id");
    
    async setupPowerAuth() {
        // already configured instance will throw an
        // exception when you'll try to configure it again
        const isConfigured = await this.powerAuth.isConfigured();
        if (isConfigured) {
            console.log("PowerAuth was already configured.");
        } else {
            try {
              const configuration = new PowerAuthConfiguration(
                    "CONFIGURATION_STRING",
                    "https://your-powerauth-server.com/enrollment-server",
                    PowerAuthAlgorithm.P384_L3,
                    8
              )
              const clientConfiguration = { enableUnsecureTraffic: false };
              const biometryConfiguration = { invalidateBiometricFactorAfterChange: true };
              const keychainConfiguration = { minimalRequiredKeychainProtection: PowerAuthKeychainProtection.SOFTWARE };
              const sharingConfiguration = {
                    // This is iOS specific. All values will be ignored on Android platform.
                    // All the following values are fake. Please read a native PowerAuth mobile SDK documentation
                    // about activation data sharing that explains how to prepare parameters in detail.
                    appGroup: "group.your.app.group",
                    appIdentifier: "some.identifier",
                    keychainAccessGroup: "keychain.access.group"
              };
              await this.powerAuth.configure(configuration, clientConfiguration, biometryConfiguration, keychainConfiguration, sharingConfiguration);
              console.log("PowerAuth configuration successfull.");
            } catch(e) {
                console.log(`PowerAuth failed to configure: ${e.code}`);
            }
        }
    }
}
```

### Effective configuration

Configuration properties are asynchronous and return values from the configured native SDK:

```javascript
const configuration = await powerAuth.configuration;
const currentAlgorithm = await powerAuth.currentAlgorithm;
const clientConfiguration = await powerAuth.clientConfiguration;
const biometryConfiguration = await powerAuth.biometryConfiguration;
const keychainConfiguration = await powerAuth.keychainConfiguration; // Android only
const sharingConfiguration = await powerAuth.sharingConfiguration;   // iOS only
```

The effective client configuration does not contain `customHttpHeaders` or `basicHttpAuthentication`. Native SDKs store those input-only values as request interceptors and cannot safely reconstruct them. Keep the original values if you need to configure another instance.

If configuration fails because stored instance data has an incompatible format, remove that data with the same configuration values before retrying:

```javascript
await PowerAuth.cleanupInstanceData(
    instanceId,
    configuration,
    keychainConfiguration,
    sharingConfiguration
);
```

## Read Next

- [Device Activation](./Device-Activation.md)
