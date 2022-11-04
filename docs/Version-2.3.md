# Migration from 2.2.x to 2.3.x

This guide contains instructions for migration from React Native PowerAuth mobile SDK version `2.2.x` to version `2.3.x`.

## Update your imports

The SDK now provides all public classes and types from the root of the package, so it's no longer needed to provide a full path to the imported object:

```javascript
// Previous imports
import { PowerAuth } from 'react-native-powerauth-mobile-sdk';
import { PowerAuthActivation } from 'react-native-powerauth-mobile-sdk/lib/model/PowerAuthActivation';
import { PowerAuthActivationCodeUtil } from 'react-native-powerauth-mobile-sdk/lib/PowerAuthActivationCodeUtil';

// Can be replaced with
import { PowerAuth, PowerAuthActivation, PowerAuthActivationCodeUtil } from 'react-native-powerauth-mobile-sdk';
```

The previous imports still works but we cannot guarantee that paths remain the same in the future SDK release.


## New `PowerAuthAuthentication` instantation

The `PowerAuthAuthentication` has now its constructor and all public properties marked as deprecated. The object now provide a new static functions to its proper instantiation. Here's the example for data signing: 

```javascript
// 1FA: Old way for possession only authentication
let auth = new PowerAuthAuthentication();
auth.usePossession = true;
// 1FA: New way
auth = PowerAuthAuthentication.possession();

// 2FA: Old way for possession and knowledge
auth = new PowerAuthAuthentication();
auth.usePossession = true;
auth.userPassword = "1234";
auth.useBiometry = false;
// 2FA: New way
auth = PowerAuthAuthentication.password("1234");

// 2FA: Old way for possession and biometry
auth = new PowerAuthAuthentication();
auth.usePossession = true;
auth.userPassword = null;
auth.useBiometry = true;
auth.biometryTitle = 'Authenticate';
auth.biometryMessage = 'Please confirm payment with biometry.';

// 2FA: New way
auth = PowerAuthAuthentication.biometry({
    promptTitle: 'Authenticate',
    promptMessage: 'Please confirm payment with biometry.'
});
```

There are two new methods providing authentication object for an activation commit purpose:

```javascript
// Commit activation with password only
let auth = PowerAuthAuthentication.commitWithPassword("1234");

// Commit activation with password and biometry
auth = PowerAuthAuthentication.commitWithPasswordAndBiometry("1234", {
    promptTitle: 'Authenticate',
    promptMessage: 'Please authenticate to create an activation supporting biometry'
});
```

## Changes in `PowerAuthToken`

The `PowerAuthToken` interface no longer contains `isValid` and `canGenerateHeader` properties. Such properties were always set to `true`.


## Changes in Grouped biometric authentication

The reusable authentication created with `PowerAuth.groupedBiometricAuthentication()` has now a limited lifetime. The expiration time is set to 10 seconds from the last reusable authentication use. The result is that once the previously acquired biometry key is expired, then the biometry dialog is displayed for one more time. For example, if you're calculating signature for two requests and first take more than 10 seconds to execute, then the biometric authentication is displayed again. 

## New `PowerAuthPassword` object

If your application's using PIN for users' knowledge factor then you can improve your application's runtime security by adopting new `PowerAuthPassword` object. You can read more details in [Working with passwords securely](Secure-Password.md) chapter.