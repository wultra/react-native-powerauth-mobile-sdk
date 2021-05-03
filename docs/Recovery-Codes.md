# Recovery Codes

The recovery codes allow your users to recover their activation in case that mobile device is lost or stolen. Before you start, please read the [Activation Recovery](https://github.com/wultra/powerauth-crypto/blob/develop/docs/Activation-Recovery.md) document, available in our [powerauth-crypto](https://github.com/wultra/powerauth-crypto) repository.

## Recovery Code Data

To recover an activation, the user has to re-type two separate values:

1. **Recovery Code** itself, which is very similar to an activation code. So you can detect typing errors before you submit such code to the server.
2. **PUK**, which is an additional numeric value and acts as a one-time password in the scheme.

## Recovery Code Scenarios

PowerAuth currently supports two basic types of recovery codes:

1. Recovery Code bound to a previous PowerAuth activation.
   - This type of code can be obtained only in an already activated application.
   - This type of code has only one PUK available, so only one recovery operation is possible.
   - The activation associated with the code is removed once the recovery operation succeeds.

2. Recovery Code delivered via OOB channel, typically in the form of a securely printed postcard, delivered by the post service.
   - This type of code has typically more than one PUK associated with the code, so it can be used multiple times.
   - The user has to keep that postcard in safe and secure place, and mark already used PUKs.
   - The code delivery must be confirmed by the user before the code can be used for a recovery operation.

The feature is not automatically available. It must be enabled and configured on PowerAuth Server. If it's so, then your mobile application can use several methods related to this feature.

## Getting Recovery Data

If the recovery data was received during the activation process, then you can later display that information to the user. To check existence of recovery data and get that information, use the following code:

```javascript
const hasRecovery = await PowerAuth.hasActivationRecoveryData();
if (!hasRecovery) {
    // Recovery information is not available
    return;
}

// 2FA signature, uses device related key and user PIN code
const auth = new PowerAuthAuthentication();
auth.usePossession = true;
auth.userPassword = "1234";

try {
    const recoveryData = await PowerAuth.activationRecoveryData(auth);
    const recoveryCode = recoveryData.recoveryCode;
    const puk = recoveryData.puk;
    // Show values on the screen
} catch (e) {
    // Show an error
}
```

<!-- begin box warning -->
The obtained information is very sensitive, so you should be very careful how your application manipulates the received values:

- You should never store `recoveryCode` or `puk` on the device.
- You should never print the values to the debug log.
- You should never send the values over the network.
- You should never copy the values to the clipboard.
- You should require PIN code every time to display the values on the screen.
- You should warn user that taking screenshot of the values is not recommended.
- Do not cache the values in RAM.

You should inform the user that:

- Making a screenshot when values are displayed on the screen is dangerous.
- The user should write down that values on paper and keep it as much safe as possible for future use.
<!-- end -->


## Confirm Recovery Postcard

The recovery postcard can contain the recovery code and multiple PUK values on one printed card. Due to security reasons, this kind of recovery code cannot be used for the recovery operation before the user confirms its physical delivery. To confirm such recovery code, use the following code:

```javascript
// 2FA signature with possession factor is required
const auth = new PowerAuthAuthentication();
auth.usePossession = true;
auth.userPassword = "1234";

const recoveryCode = "VVVVV-VVVVV-VVVVV-VTFVA"; // You can also use code scanned from QR
try {
    const result = await PowerAuth.confirmRecoveryCode(recoveryCode, auth);
    if (result.alreadyConfirmed) {
        console.log("Recovery code has been already confirmed. This is not an error, just information.");
    } else {
        console.log("Recovery code has been successfully confirmed.");
    }
} catch (e) {
    // error
}
```

The `alreadyConfirmed` boolean indicates that the code was already confirmed in the past. You can choose a different "success" screen, describing that the user has already confirmed such code. Also, note that codes bound to the activations are already confirmed.

## Read Next

- [Token Based Authentication](Token-Based-Authentication.md)
