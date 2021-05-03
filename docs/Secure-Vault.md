# Secure Vault

PowerAuth SDK has basic support for an encrypted secure vault. At this moment, the only supported method allows your application to establish an encryption / decryption key with a given index. The index represents a "key number" - your identifier for a given key. Different business logic purposes should have encryption keys with a different index value.

On a server-side, all secure vault-related work is concentrated in a `/pa/v3/vault/unlock` endpoint of PowerAuth Standard RESTful API. In order to receive data from this response, the call must be authenticated with at least 2FA (using password or PIN).

<!-- begin box warning -->
Secure vault mechanism does not support biometry by default. Use PIN code or password based authentication for unlocking the secure vault, or ask your server developers to enable biometry for vault unlock call by configuring PowerAuth Server instance.
<!-- end -->

## Obtaining Encryption Key

In order to obtain an encryption key with a given index, use the following code:

```javascript
// 2FA signature. It uses device-related key and user PIN code.
const auth = new PowerAuthAuthentication();
auth.usePossession = true;
auth.userPassword = "1234";

// Select custom key index
const index = 1000;

try {
    // Fetch encryption key with given index
    const r = await PowerAuth.fetchEncryptionKey(auth, index);
    // ... use encryption key to encrypt or decrypt data
} catch (e) {
    // Report error
}
```

## Read Next

- [Recovery Codes](Recovery-Codes.md)
