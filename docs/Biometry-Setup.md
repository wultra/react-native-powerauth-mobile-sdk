# Biometry Setup

PowerAuth SDK provides an abstraction on top of the base biometry (on Android) and Touch and Face ID (on iOS) support. While the authentication / data signing itself is nicely and transparently embedded in the `PowerAuthAuthentication` object used in [regular request signing](Data-Signing.md), other biometry-related processes require their own API.

## Check Biometry Status

You have to check for biometry on three levels:

- **System Availability**: If a biometric scanner (for example Touch ID on iOS or Fingerprint reader on Android) is present on the system/device.
- **Activation Availability**: If biometry factor data are available for given activation.
- **Application Availability**: If the user decided to use biometry for the given app. _(optional)_

PowerAuth SDK provides code for the first two of these checks.

To check if you can use biometry on the system, use the following code:

```javascript
const biometryStatus = await powerAuth.getBiometricStatus();

// Is biometric authentication available for this activation?
const isAvailable = biometryStatus.isAuthenticationWithBiometricsAvailable;

// Type of biometry supported on the system.
// For example "FINGERPRINT" if Fingerprint scanner/TouchID is present on the device
const biometryType = biometryStatus.biometryType;

// Status of biometric authentication availability.
// For example "NOT_ENROLLED". 
const authenticateStatus = biometryStatus.systemStatus;

// Does the current activation have a biometric factor configured?
const hasBiometricFactor = biometryStatus.isBiometricFactorConfigured;

// A convenience method returns the combined availability directly.
const canAuthenticate = await powerAuth.isAuthenticationWithBiometricsAvailable();
```

On Android, the overall availability value does not reflect a temporarily or permanently locked biometric sensor. That state is available only after an authentication attempt. On iOS, `systemStatus` can report `PowerAuthBiometryStatus.LOCKOUT`.

To check if a given activation has biometry factor-related data available, use the following code:

```javascript
// Does activation have biometric factor-related data in place?
const hasBiometryFactor = await powerAuth.hasBiometryFactor();
```

The last check (Application Availability) is fully under your control. By keeping the biometry settings flag, for example, a `boolean` in `NSUserDefaults`/`SharedPreferences`, you are able to show expected user biometry status (in a disabled state, though) even in the case biometry is not enabled or when no finger or face is enrolled on the device.

## Enable Biometry

In case an activation does not yet have biometry-related factor data, and you would like to enable it, the device must first retrieve the original private key from the secure vault for the purpose of key derivation. As a result, you have to use a successful 2FA with a password to enable biometry support.

Use the following code to enable biometric authentication:

```javascript
const password = "1234";
try {
    // Establish biometric data using provided password
    await powerAuth.addBiometryFactor(password, {
        promptTitle: "Add biometry", 
        promptMessage: "Allow biometry factor"
    });
    // You can also use simplified variant on iOS, or if `authenticateOnBiometricKeySetup` 
    // is `false` on Android.
    await powerAuth.addBiometryFactor(password)
} catch (e) {
    //failed
}
```

## Disable Biometry

You can remove biometry related factor data by simply removing the related key locally, using this one-liner:

```javascript
// Remove biometric data
const result =  await powerAuth.removeBiometryFactor();
```

After an add or remove operation fails, fetch the activation status to synchronize the local biometric-factor configuration with the server.

## Fetch Biometry Credentials In Advance

You can acquire biometry credentials in advance in case that business processes require computing two or more different PowerAuth biometry signatures in one interaction with the user. To achieve this, the application must acquire the custom-created `PowerAuthAuthentication` object first and then use it for the required signature calculations. It's recommended to keep this instance referenced only for a limited time, required for all future signature calculations. If you don't reuse the instance within the 10 seconds of expiration period, then the biometry key is released from the memory and the biometric authentication is displayed again.

Be aware, that you must not execute the next HTTP request signed with the same credentials when the previous one fails with the 401 HTTP status code. If you do, then you risk blocking the user's activation on the server.

In order to obtain biometry credentials for the future signature calculation, call the following code:

```javascript
// Authenticate user with biometry and obtain PowerAuthAuthentication credentials for future signature calculation.
const auth = PowerAuthAuthentication.biometry({
    promptTitle: 'Grouped authentication',
    promptMessage: 'One biometric authentication will be used for 2 operations.'
}); 
try {
    await powerAuth.groupedBiometricAuthentication(auth, async (reusableAuth) => {
        try {
            const r1 = await powerAuth.authenticationHeaderForRequestWithBody(reusableAuth, "POST", "/operation/test", "{jsonbody: \"test1\"}");
            console.log(`r1 success`);
            const r2 = await powerAuth.authenticationHeaderForRequestWithBody(reusableAuth, "POST", "/operation/test2", "{jsonbody: \"test2\"}");
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

<!-- begin box warning -->
On Android and iOS, a biometric lockout can deliberately produce an invalid biometry factor-related key while reporting successful local key retrieval. The following authenticated request then fails on the server and increases the failed-attempt counter. This limits repeated attempts to deceive the biometric sensor.
<!-- end -->

## Interaction and Concurrency

Allow only one biometric authentication at a time. Do not start parallel biometric prompts or authenticated operations that compete for the same reusable credentials.

On Android, the application can regain focus after the system prompt closes but before the SDK finishes its background cryptographic work. Keep buttons and other interactive controls disabled until the awaited PowerAuth operation completes or throws. Update the UI from that final result, not merely from application focus changes.

The wrapper does not expose Android `Activity` or `Fragment` prompt objects or iOS `LAContext`.

## Biometry Factor-Related Key Lifetime

By default, the biometry factor-related key is **invalidated on Android** and **not invalidated on iOS** after the biometry enrolled in the system is changed. For example, if the user adds or removes a finger or enrolls a new face, this determines whether the existing key remains available for signing. To change this behavior, see `invalidateBiometricFactorAfterChange` [in the advanced configuration](Configuration.md#advanced-configuration).

Be aware that the change in the configuration is effective only for the new keys. So, if your application is already using the biometry factor-related key with a different configuration, then the configuration change doesn't change the existing key. You have to [disable](#disable-biometry) and [enable](#enable-biometry) biometry to apply the change.

## Read Next

- [Device Activation Removal](Device-Activation-Removal.md)
