# Secure Vault

Secure Vault provides a base key derivation key after successful two-factor authentication. The base key is not an encryption or MAC key and must be used only to derive purpose-specific keys. This API requires an activation that uses PowerAuth protocol 4.

PowerAuth SDK provides two base keys:

- `PowerAuthSecureVaultKeyId.KNOWLEDGE` is available after possession and knowledge authentication.
- `PowerAuthSecureVaultKeyId.KNOWLEDGE_OR_BIOMETRY` is available after possession and knowledge authentication or possession and biometry authentication.

<!-- begin box warning -->
PowerAuth Server must permit the selected authentication factors for the Secure Vault unlock operation.
<!-- end -->

## Obtain and Derive a Key

Use `fetchSecureVaultKey()` to obtain a native-backed base key. The sensitive base key never crosses the JavaScript bridge. Derive all required keys and release the base key as soon as possible.

```javascript
const authentication = PowerAuthAuthentication.password("1234");

const vaultKey = await powerAuth.fetchSecureVaultKey(
    authentication,
    PowerAuthSecureVaultKeyId.KNOWLEDGE
);

try {
    // Derive a 32-byte key for application-specific index 1000.
    // The returned binary key is encoded as a Base64 string.
    const keyBase64 = await vaultKey.deriveKey(1000, 32);
    // Use the derived key without storing it on the device.
} finally {
    await vaultKey.release();
}
```

The derivation index must be a non-negative safe integer. The derived key size must be an integer between 16 and 2147483647 bytes. Derived keys are returned as Base64-encoded strings. The base key remains stable for the lifetime of the activation. Calling `release()` repeatedly is safe; using a released, expired, or deconfigured-instance key rejects with `PowerAuthErrorCode.INVALID_NATIVE_OBJECT`.

## Security Recommendations

- Do not store derived keys on the device. Acquire the base key when needed and derive a key for each specific purpose.
- Release the base key as soon as all required keys have been derived.
- Never reuse one derived key for multiple purposes, such as both encryption and authentication.
- Derive different keys with different indices for separate data sets and purposes.
- Maintain a registry of derivation indices if the application uses multiple keys, to prevent accidental key reuse.

## Legacy Protocol 3.3 API

`fetchEncryptionKey()` remains available for compatibility but is deprecated and works only with PowerAuth protocol 3.3. It returns the derived key as a Base64-encoded string.

```javascript
const keyBase64 = await powerAuth.fetchEncryptionKey(authentication, 1000);
```

Use this method only when accessing local data created by a legacy activation. Migrate the activation to protocol 4, decrypt the old data with the legacy key, and re-encrypt it with a key derived from `fetchSecureVaultKey()`.

## Read Next

- [Token Based Authentication](Token-Based-Authentication.md)
