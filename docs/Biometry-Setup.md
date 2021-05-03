# Biometry Setup

PowerAuth SDK provides an abstraction on top of the base biometry (on Android) and Touch and Face ID (on iOS) support. While the authentication / data signing itself is nicely and transparently embedded in the `PowerAuthAuthentication` object used in [regular request signing](Data-Signing.md), other biometry-related processes require their own API.

## Check Biometry Status

You have to check for biometry on three levels:

- **System Availability**: If biometric scanner (for example Touch ID on iOS or Fingerprint reader on Android) is present on the system/device.
- **Activation Availability**: If biometry factor data are available for given activation.
- **Application Availability**: If user decided to use biometry for given app. _(optional)_

PowerAuth SDK provides code for the first two of these checks.

To check if you can use biometry on the system, use the following code:

```javascript
const biometryStatus = await PowerAuth.getBiometryInfo();

// Is biometric authentication is supported on the system?
// Note that the property contains "false" on iOS if biometry is not enrolled or if it has been locked down. 
// To distinguish between an availability and lockdown you can use `biometryType` and `canAuthenticate`.
const isAvailable = biometryStatus.isAvailable;

// Type of biometry supported on the system.
// For example "FINGERPRINT" if Fingerprint scanner/TouchID is present on the device
const biometryType = biometryStatus.biometryType;

// Status of biometric authentication availability.
// For example "NOT_ENROLLED". 
const authenticateStatus = biometryStatus.canAuthenticate;
```

To check if a given activation has biometry factor-related data available, use the following code:

```javascript
// Does activation have biometric factor-related data in place?
const hasBiometryFactor = await PowerAuth.hasBiometryFactor();
```

The last check (Application Availability) is fully under your control. By keeping the biometry settings flag, for example, a `boolean` in `NSUserDefaults`/`SharedPreferences`, you are able to show expected user biometry status (in a disabled state, though) even in the case biometry is not enabled or when no finger or face is enrolled on the device.

## Enable Biometry

In case an activation does not yet have biometry-related factor data, and you would like to enable it, the device must first retrieve the original private key from the secure vault for the purpose of key derivation. As a result, you have to use a successful 2FA with a password to enable biometry support.

Use the following code to enable biometric authentication:

```javascript
const password = "1234";
try {
    // Establish biometric data using provided password
    await PowerAuth.addBiometryFactor(password, "Add biometry", "Allow biometry factor");
    // success
} catch (e) {
    //failed
}
```

## Disable Biometry

You can remove biometry related factor data by simply removing the related key locally, using this one-liner:

```javascript
// Remove biometric data
const result =  await PowerAuth.removeBiometryFactor();
```

## Fetch Biometry Credentials In Advance

You can acquire biometry credentials in advance in case that business processes require computing two or more different PowerAuth biometry signatures in one interaction with the user. To achieve this, the application must acquire the custom-created `PowerAuthAuthentication` object first and then use it for the required signature calculations. It's recommended to keep this instance referenced only for a limited time, required for all future signature calculations.

Be aware, that you must not execute the next HTTP request signed with the same credentials when the previous one fails with the 401 HTTP status code. If you do, then you risk blocking the user's activation on the server.

In order to obtain biometry credentials for the future sig  nature calculation, call the following code:

```javascript
// Authenticate user with biometry and obtain PowerAuthAuthentication credentials for future signature calculation.
const auth = new PowerAuthAuthentication();
auth.usePossession = true;
auth.userPassword = null;
auth.useBiometry = true;
auth.biometryTitle = "Grouped authentication";
auth.biometryMessage = "One biometric authentication will be used for 2 operations.";
    
try {
    await PowerAuth.groupedBiometricAuthentication(auth, async (reusableAuth) => {
        try {
            const r1 = await PowerAuth.requestSignature(reusableAuth, "POST", "/operation/test", "{jsonbody: \"test1\"}");
            console.log(`r1 success`);
            const r2 = await PowerAuth.requestSignature(reusableAuth, "POST", "/operation/test2", "{jsonbody: \"test2\"}");
            console.log(`r2 success`);
            // success
        } catch (e) {
            // reusableAuth usage failed    
        }
    });
} catch(e) {
    // failed to create grouped biometric authentication
}
```

## Biometry Factor-Related Key Lifetime

By default, the biometry factor-related key is **NOT** invalidated after the biometry enrolled in the system is changed. For example, if the user adds or removes the finger or enrolls with a new face, then the biometry factor-related key is still available for the signing operation. To change this behavior, you have to initialize the SDK [in the native layer](Configuration.md#configuration-from-native-code). 

Be aware that the configuration below is effective only for the new keys. So, if your application is already using the biometry factor-related key with a different configuration, then the configuration change doesn't change the existing key. You have to [disable](#disable-biometry) and [enable](#enable-biometry) biometry to apply the change.

### iOS

On iOS, you have to provide `PA2KeychainConfiguration` object with `linkBiometricItemsToCurrentSet` parameter set to `YES` and use that configuration for the `PowerAuth` object configuration:

```objc
// Get the React Native bridge module
PowerAuth *pa = [bridge moduleForClass:PowerAuth.class];
// Prepare your PA config
PowerAuthConfiguration *config = [[PowerAuthConfiguration alloc] init];
// ...

// Prepare PA2KeychainConfiguration
// Set YES to 'linkBiometricItemsToCurrentSet' property.
PA2KeychainConfiguration *keychainConfiguration = [[PA2KeychainConfiguration alloc] init];
keychainConfiguration.linkBiometricItemsToCurrentSet = YES;

// Init shared PowerAuthSDK instance
[pa configureWithConfig:config keychainConfig:keychainConfiguration clientConfig:nil];
```

### Android

On Android, you have to provide `PowerAuthKeychainConfiguration` object with `linkBiometricItemsToCurrentSet` parameter set to `true` and use that configuration for the `PowerAuthRNPackage` object configuration:

```java
for (ReactPackage pkg : this.getReactNativeHost().getReactInstanceManager().getPackages()) {
    if (pkg instanceof PowerAuthRNPackage) {
        try {
            PowerAuthSDK.Builder builder = new PowerAuthSDK.Builder(
              new PowerAuthConfiguration.Builder("your-app-activation", "https://your-powerauth-endpoint.com/", "APPLICATION_KEY", "APPLICATION_SECRET", "KEY_SERVER_MPK").build()
            );
            PowerAuthKeychainConfiguration.Builder keychainConfiguration = new PowerAuthKeychainConfiguration.Builder();
            keychainConfiguration.linkBiometricItemsToCurrentSet(true);
            builder.keychainConfiguration(keychainConfiguration.build());
            ((PowerAuthRNPackage) pkg).configure(builder);
        } catch (Exception e) {
            // error
        }
    }
}
```

## Read Next

- [Device Activation Removal](Device-Activation-Removal.md)
