# Device Activation

After you configure the SDK, you are ready to make your first activation.

## Activation via Activation Code

The original activation method uses a one-time activation code generated in PowerAuth Server. To create an activation using this method, some external application (Internet banking, ATM application, branch / kiosk application) must generate an activation code for you and display it (as a text or in a QR code).

Use the following code to create an activation once you have an activation code:

```javascript
import { PowerAuthActivation } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthActivation';

const deviceName = "Petr's iPhone 7"; // users phone name
const activationCode = "VVVVV-VVVVV-VVVVV-VTFVA"; // let user type or QR-scan this value

// Create activation object with given activation code.
const activation = PowerAuthActivation.createWithActivationCode(activationCode, deviceName);
try {
    let result = await powerAuth.createActivation(activation);
    // No error occurred, proceed to credentials entry (PIN prompt, Enable Biometry, ...) and commit
    // The 'result' contains 'activationFingerprint' property, representing the device public key - it may be used as visual confirmation
    // If server supports recovery codes for activations, then `activationRecovery` property contains object with information about activation recovery.
} catch (e) {
    // Error occurred, report it to the user
}
```

If the received activation result also contains recovery data, then you should display that values to the user. To do that, please read the [Recovery Code](Recovery-Codes.md) document, which describes how to treat that sensitive information. This is relevant for all types of activation you use.

### Additional Activation OTP

If an [additional activation OTP](https://github.com/wultra/powerauth-crypto/blob/develop/docs/Additional-Activation-OTP.md) is required to complete the activation, then use the following code to configure the `PowerAuthActivation` object:

```javascript   
import { PowerAuthActivation } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthActivation';

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
import { PowerAuthActivation } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthActivation';

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
    let result = await powerAuth.createActivation(activation);
    // No error occurred, proceed to credentials entry (PIN prompt, Enable Biometry, ...) and commit
    // The 'result' contains 'activationFingerprint' property, representing the device public key - it may be used as visual confirmation
    // If server supports recovery codes for activations, then `activationRecovery` property contains object with information about activation recovery.
} catch (e) {
    // Error occurred, report it to the user
}
```

Note that by using weak identity attributes to create an activation, the resulting activation is confirming a "blurry identity". This may greatly limit the legal weight and usability of a signature. We recommend using a strong identity verification before activation can actually be created.


## Activation via Recovery Code

If PowerAuth Server is configured to support [Recovery Codes](https://github.com/wultra/powerauth-crypto/blob/develop/docs/Activation-Recovery.md), then also you can create an activation via the recovery code and PUK.

Use the following code to create an activation using recovery code:

```javascript
import { PowerAuthActivation } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthActivation';

const deviceName = "John Tramonta"; // users phone name
const recoveryCode = "55555-55555-55555-55YMA"; // User's input
const puk = "0123456789"; // User's input. You should validate RC & PUK with using PowerAuthOtpUtil

// Create activation object with recovery code and PUK
const activation = PowerAuthActivation.createWithRecoveryCode(recoveryCode, puk, deviceName);

// Create a new activation with just created activation object
try {
    let result = await powerAuth.createActivation(activation);
    // No error occurred, proceed to credentials entry (PIN prompt, Enable Biometry, ...) and commit
    // The 'result' contains 'activationFingerprint' property, representing the device public key - it may be used as visual confirmation
    // If server supports recovery codes for activations, then `activationRecovery` property contains object with information about activation recovery.
} catch (e) {
    // Error occurred, report it to the user
}
```

## Customize Activation

You can set an additional properties to `PowerAuthActivation` object, before any type of activation is created. For example:

```javascript
import { PowerAuthActivation } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthActivation';

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
    let result = await powerAuth.createActivation(activation);
    // continue with the flow
} catch (e) {
    // process eror
}
```  

## Committing Activation Data

After you create an activation using one of the methods mentioned above, you need to commit the activation - to use provided user credentials to store the activation data on the device. 

```javascript
import { PowerAuthAuthentication } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthAuthentication';

const auth = new PowerAuthAuthentication();
auth.usePossession = true;
auth.userPassword = "1234";
auth.useBiometry = true; // should biometry authentication should be available?
auth.biometryMessage = "Enable biometry"; // only displayed on Android
try {
  await powerAuth.commitActivation(auth);
} catch (e) {
    // happens only in case SDK was not configured or activation is not in state to be committed
}
```


## Validating User Inputs

The mobile SDK is providing a couple of functions in `PowerAuthOtpUtil` interface, helping with user input validation. You can:

- Parse activation code when it's scanned from QR code
- Validate a whole code at once
- Validate recovery code or PUK
- Auto-correct characters typed on the fly

### Validating Scanned QR Code

To validate an activation code scanned from QR code, you can use `PowerAuthOtpUtil.parseActivationCode(code)` function. You have to provide the code with or without the signature part. For example:

```javascript
import { PowerAuthOtpUtil } from 'react-native-powerauth-mobile-sdk/lib/PowerAuthOtpUtil';

const scannedCode = "VVVVV-VVVVV-VVVVV-VTFVA#aGVsbG8......gd29ybGQ=";
try {
  let otp = await PowerAuthOtpUtil.parseActivationCode(scannedCode);
  if (otp.activationSignature == null) {
     // QR code should contain a signature
     return
  }
} catch(e) {
  // not valid
}
```

Note that the signature is only formally validated in the function above. The actual signature verification is performed in the activation process, or you can do it on your own:

```javascript
import { PowerAuthOtpUtil } from 'react-native-powerauth-mobile-sdk/lib/PowerAuthOtpUtil';

const scannedCode = "VVVVV-VVVVV-VVVVV-VTFVA#aGVsbG8......gd29ybGQ=";
try {
  let otp = await PowerAuthOtpUtil.parseActivationCode(scannedCode);
  if (otp.activationSignature) {
     await powerAuth.verifyServerSignedData(otp.activationCode, otp.activationSignature, true);
     // valid
  }
} catch(e) {
  // not valid
}
```

### Validating Entered Activation Code

To validate an activation code at once, you can call `PowerAuthOtpUtil.validateActivationCode()` function. You have to provide the code without the signature part. For example:

```javascript
const isValid = await PowerAuthOtpUtil.validateActivationCode("VVVVV-VVVVV-VVVVV-VTFVA");
const isInvalid = await PowerAuthOtpUtil.validateActivationCode("VVVVV-VVVVV-VVVVV-VTFVA#aGVsbG8gd29ybGQ=");
```

If your application is using your own validation, then you should switch to functions provided by SDK. All activation codes contain a checksum, so it's possible to detect mistyped characters before you start the activation. Check our [Activation Code](https://github.com/wultra/powerauth-crypto/blob/develop/docs/Activation-Code.md) documentation for more details.

### Validating Recovery Code and PUK

To validate a recovery code at once, you can call `PowerAuthOtpUtil.validateRecoveryCode()` function. You can provide the whole code, which may or may not contain `"R:"` prefix. So, you can validate manually entered codes, but also codes scanned from QR. For example:

```javascript
const isValid1 = await PowerAuthOtpUtil.validateRecoveryCode("VVVVV-VVVVV-VVVVV-VTFVA");
const isValid2 = await PowerAuthOtpUtil.validateRecoveryCode("R:VVVVV-VVVVV-VVVVV-VTFVA");
```

To validate PUK at once, you can call `PowerAuthOtpUtil.validateRecoveryPuk()` function:

```javascript
const isValid = await PowerAuthOtpUtil.validateRecoveryPuk("0123456789");
```

### Auto-Correcting Typed Characters

You can implement auto-correcting of typed characters with using `PowerAuthOtpUtil.correctTypedCharacter()` function in screens, where user is supposed to enter an activation or recovery code. This technique is possible due to the fact that Base32 is constructed so that it doesn't contain visually confusing characters. For example, `1` (number one) and `I` (capital I) are confusing, so only `I` is allowed. The benefit is that the provided function can correct typed `1` and translate it to `I`.

Here's an example how to iterate over the string and validate it character by character:


```javascript
import { PowerAuthOtpUtil } from 'react-native-powerauth-mobile-sdk/lib/PowerAuthOtpUtil';

/// Returns corrected code
validateAndCorrectCharacters(code) {
    let result = "";
    for (let i = 0; i < code.length; i++) {
      try {
        const corrected = await PowerAuthOtpUtil.correctTypedCharacter(code.charCodeAt(i));
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
