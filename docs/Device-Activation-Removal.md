# Device Activation Removal

You can remove activation using several ways - the choice depends on the desired behavior.

## Simple Device-Only Removal

You can clear activation data anytime from the Keychain. The benefit of this method is that it does not require help from the server, and the user does not have to be logged in. The issue with this removal method is simple: The activation still remains active on the server-side. This, however, does not have to be an issue in your case.

To remove only data related to PowerAuth, use:

```javascript
powerAuth.removeActivationLocal();
```

## Removal via Authenticated Session

Suppose your server uses an authenticated session for keeping the users logged in. In that case, you can combine the previous method with calling your proprietary endpoint to remove activation for the currently logged-in user. The advantage of this method is that activation does not remain active on the server. The issue is that the user has to be logged in (the session must be active and must have activation ID stored) and that you have to publish your own method to handle this use case.

The code for this activation removal method is as follows:

```javascript
// Use custom call to proprietary server endpoint to remove activation.
// User must be logged in at this moment, so that session can find
// associated activation ID
httpClient.post(null, "/custom/activation/remove", function(error) {
    if (error == null) {
        powerAuth.removeActivationLocal();
    } else {
        // Report error
    }
});

```

## Removal via Signed Request

PowerAuth Standard RESTful API has a default endpoint `/pa/v3/activation/remove` for an activation removal. This endpoint uses a signature verification for looking up the activation to be removed. The benefit of this method is that it is already present in both PowerAuth React Native SDK and PowerAuth Standard RESTful API - nothing has to be programmed. Also, the user does not have to be logged in to use it. However, the user has to authenticate using 2FA with either password or biometry.

Use the following code for an activation removal using signed request:

```javascript
// 2FA signature, uses device related key and user PIN code
const auth = new PowerAuthAuthentication();
auth.usePossession = true;
auth.userPassword ="1234";
auth.useBiometry = false;

try {
    await powerAuth.removeActivationWithAuthentication(auth);
    // activation removed
} catch (e) {
    // failed to remove
}
```


## Read Next

- [Secure Vault](Secure-Vault.md)
<!-- - [End-To-End Encryption](End-To-End-Encryption.md) -->

