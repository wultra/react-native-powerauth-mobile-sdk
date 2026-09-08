# Device Activation

After you configure the SDK, you are ready to make your first activation.

## Activation via Activation Code

The original activation method uses a one-time activation code generated in PowerAuth Server. To create an activation using this method, some external application (Internet banking, ATM application, branch / kiosk application) must generate an activation code for you and display it (as a text or in a QR code).

Use the following code to create an activation once you have an activation code:

```javascript
const deviceName = "Petr's iPhone 7"; // users phone name
const activationCode = "VVVVV-VVVVV-VVVVV-VTFVA"; // let user type or QR-scan this value

// Create activation object with given activation code.
const activation = PowerAuthActivation.createWithActivationCode(activationCode, deviceName);
try {
    const result = await powerAuth.createActivation(activation);
    // No error occurred, proceed to credentials entry (PIN prompt, Enable Biometry, ...) and persist the activation
    // The 'result' contains 'activationFingerprint', representing the combination of device and server public keys.
    // It may be used as visual confirmation.
} catch (e) {
    // Error occurred, report it to the user
}
```

### Additional Activation OTP

If an [additional activation OTP](https://github.com/wultra/powerauth-crypto/blob/develop/docs/Additional-Activation-OTP.md) is required to complete the activation, then use the following code to configure the `PowerAuthActivation` object:

```javascript   
const deviceName = "Petr's iPhone 7"; // users phone name
const activationCode = "VVVVV-VVVVV-VVVVV-VTFVA"; // let user type or QR-scan this value
const activationOtp = "12345";

// Create activation object with given activation code.
const activation = PowerAuthActivation.createWithActivationCode(activationCode, deviceName);
activation.additionalActivationOtp = activationOtp;
// The rest of the activation routine is the same.
```

<!-- begin box warning -->
Be aware that OTP can be used only if the activation is configured for ON\_KEY\_EXCHANGE validation on the PowerAuth server. See our [crypto documentation for details](https://github.com/wultra/powerauth-crypto/blob/develop/docs/Additional-Activation-OTP.md#regular-activation-with-otp).
<!-- end -->

## Activation via Custom Credentials

You may also create an activation using any custom login data - it can be anything that the server can use to obtain the user ID to associate with a new activation. Since the credentials are custom, the server's implementation must be able to process such a request. The custom activation no longer requires a custom activation endpoint.

Use the following code to create an activation using custom credentials:

```javascript
// Create a new activation with a given device name and custom login credentials
const deviceName = "Petr's iPhone 7"; // users phone name
const credentials = {
    "username": "john.doe@example.com",
    "password": "YBzBEM"
};

// Create activation object with given credentials.
const activation = PowerAuthActivation.createWithIdentityAttributes(credentials, deviceName);

// Create a new activation with just created activation object
try {
    const result = await powerAuth.createActivation(activation);
    // No error occurred, proceed to credentials entry (PIN prompt, Enable Biometry, ...) and persist the activation
    // The 'result' contains 'activationFingerprint', representing the combination of device and server public keys.
    // It may be used as visual confirmation.
} catch (e) {
    // Error occurred, report it to the user
}
```

Note that by using weak identity attributes to create an activation, the resulting activation is confirming a "blurry identity". This may greatly limit the legal weight and usability of a signature. We recommend using a strong identity verification before activation can actually be created.

## Activation via OpenID Connect

You may also create an activation using OIDC protocol:

```javascript
const name = "Petr's iPhone"; // user's phone name

// Get the following information from your OpenID Connect provider
const oidcParameters = {
    providerId: "my-provider-id",
    code: "1234567890abcdef",
    nonce: "K1mP3rT9bQ8lV6zN7sW2xY4dJ5oU0fA1gH29o",
    codeVerifier: "G3hsI1KZX1o~K0p-5lT3F7yZ4...6yP8rE2wO9n" // optional (PKCE)
};

// Create activation object with OIDC parameters.
const activation = PowerAuthActivation.createWithOIDCParameters(oidcParameters, name);

// Create a new activation with the just-created activation object
try {
    const result = await powerAuth.createActivation(activation);
    // No error occurred, proceed to credentials entry (PIN prompt, Enable Biometry, ...) and persist the activation
} catch (e) {
    // Error occurred, report it to the user
}
```

## Customize Activation

You can set an additional properties to `PowerAuthActivation` object, before any type of activation is created. For example:

```javascript
// Custom attributes that can be processed before the activation is created on PowerAuth Server.
// The dictionary may contain only values that can be serialized to JSON.
const customAttributes = {
    "isNowPrimaryActivation" : true,
    "otherActivationIds" : [
        "e43f5f99-e2e9-49f2-bcae-5e32a5e96d22",
        "41dd704c-65e6-4d4b-b28f-0bc0e4eb9715"
    ]
};

// Create the activation object
const activation = PowerAuthActivation.createWithActivationCode("45AWJ-BVACS-SBWHS-ABANA", "deviceName");
// Extra flags that will be associated with the activation record on PowerAuth Server.
activation.extras = "EXTRA_FLAGS";
// set custom attributes
activation.customAttributes = customAttributes;

// Create a new activation as usual
try {
    const result = await powerAuth.createActivation(activation);
    // continue with the flow
} catch (e) {
    // process eror
}
```  

## Persisting Activation Data

After you create an activation using one of the methods mentioned above, you need to persist the activation - to use provided user credentials to store the activation data on the device. 

```javascript
const auth = PowerAuthAuthentication.persistWithPasswordAndBiometry("1234", {
    // The `PowerAuthBiometricPrompt` object is required on Android platform in case that
    // `biometryConfiguration.authenticateOnBiometricKeySetup` is true.
    // You can provide undefined prompt object in case that flag is false.
    promptTitle: 'Please authenticate with biometry',
    promptMessage: 'Please authenticate to create an activation supporting biometry'
});
try {
  await powerAuth.persistActivation(auth);
} catch (e) {
    // Handle biometric cancellation, invalid activation state, or another persistence failure.
}
```

On Android, omitting the prompt while `authenticateOnBiometricKeySetup` is `true` fails with `PowerAuthErrorCode.WRONG_PARAMETER`. When the option is `false`, the SDK configures the biometric key without displaying a prompt.


## Validating User Inputs

The mobile SDK is providing a couple of functions in `PowerAuthActivationCodeUtil` interface, helping with user input validation. You can:

- Parse activation code when it's scanned from QR code
- Validate a whole code at once
- Auto-correct characters typed on the fly

### Validating Scanned QR Code

To parse an activation code scanned from a QR code, use `PowerAuthActivationCodeUtil.parseActivationCode(code)`. You can provide the code with or without a legacy signature suffix. The function validates the activation-code format and returns the activation code without the suffix:

```javascript
const scannedCode = "VVVVV-VVVVV-VVVVV-VTFVA#aGVsbG8......gd29ybGQ=";
try {
  const parsed = await PowerAuthActivationCodeUtil.parseActivationCode(scannedCode);
  const activationCode = parsed.activationCode;
  // Use activationCode to create the activation.
} catch(e) {
  // The activation code is not valid.
}
```

PowerAuth Mobile SDK versions older than 2.0 allowed applications to verify the signature suffix. This is no longer possible because post-quantum signatures are too large to embed in a QR code. If an activation code contains a signature suffix, the activation process ignores it. Use `PowerAuthActivationCodeUtil.parseActivationCode()` only to validate the scanned code and strip the suffix; do not treat the suffix as proof that the code is trusted.

### Validating Entered Activation Code

To validate an activation code at once, you can call `PowerAuthActivationCodeUtil.validateActivationCode()` function. You have to provide the code without the signature part. For example:

```javascript
const isValid = await PowerAuthActivationCodeUtil.validateActivationCode("VVVVV-VVVVV-VVVVV-VTFVA");
const isInvalid = await PowerAuthActivationCodeUtil.validateActivationCode("VVVVV-VVVVV-VVVVV-VTFVA#aGVsbG8gd29ybGQ=");
```

If your application is using your own validation, then you should switch to functions provided by SDK. All activation codes contain a checksum, so it's possible to detect mistyped characters before you start the activation. Check our [Activation Code](https://github.com/wultra/powerauth-crypto/blob/develop/docs/Activation-Code.md) documentation for more details.

### Auto-Correcting Typed Characters

You can implement auto-correcting of typed characters with using `PowerAuthActivationCodeUtil.correctTypedCharacter()` function in screens, where user is supposed to enter an activation code. This technique is possible due to the fact that Base32 is constructed so that it doesn't contain visually confusing characters. For example, `1` (number one) and `I` (capital I) are confusing, so only `I` is allowed. The benefit is that the provided function can correct typed `1` and translate it to `I`.

Here's an example how to iterate over the string and validate it character by character:


```javascript
/// Returns corrected code
validateAndCorrectCharacters(code) {
    let result = "";
    for (let i = 0; i < code.length; i++) {
      try {
        const corrected = await PowerAuthActivationCodeUtil.correctTypedCharacter(code.charCodeAt(i));
        result += String.fromCharCode(corrected);
      } catch (e) {
        console.log(`invalid character: ${code.charCodeAt(i)}`);
      }
    }
    console.log(`Corrected: ${result}`);
    return result;
}
```

## Read Next

- [Requesting Device Activation Status](Requesting-Device-Activation-Status.md)
