# Migration from 4.x.x to 5.0.0

This guide covers migration from PowerAuth Mobile JavaScript SDK `4.x.x` to `5.0.0` for React Native and Cordova. JavaScript SDK `5.0.0` uses native PowerAuth Mobile SDK `2.0.0` on Android and iOS, replacing native SDK `1.9.x`.

Both wrappers use the same public API. The sections below describe JavaScript API changes and the application changes required by the native SDK upgrade. JavaScript retains the deprecated compatibility APIs listed below, and binary values cross the bridge as Base64 strings. Some obsolete APIs have been removed and require updates to calling code.

## Server and Algorithm Rollout

The new JavaScript `algorithm` option selects the algorithm used by the native SDK. Coordinate this setting with the server version and mobile SDK configuration:

| Algorithm | Protocol | Required PowerAuth Server |
|---|---|---|
| `PowerAuthAlgorithm.LEGACY` | 3.3 | 1.9.0 or later |
| `PowerAuthAlgorithm.P384` | 4.0 | 2.0.0 or later |
| `PowerAuthAlgorithm.P384_L3` | 4.0 | 2.0.0 or later |
| `PowerAuthAlgorithm.P384_L5` | 4.0 | 2.0.0 or later |

When `algorithm` is omitted, including when using the basic `configure()` overload, the wrapper uses the native SDK's default. Native SDK 2.0 defaults to `P384_L3`. To keep an existing application on protocol 3.3 during rollout, select `LEGACY` explicitly:

```typescript
await powerAuth.configure(new PowerAuthConfiguration(
    "CONFIGURATION_STRING",
    "https://your-powerauth-server.com/enrollment-server",
    PowerAuthAlgorithm.LEGACY
));
```

Before selecting any protocol-4 algorithm, upgrade the server and obtain a new mobile SDK `configuration` string from it. A legacy configuration lacks the public keys required for protocol 4 and configuration will fail. Deploy the matching server configuration and client changes together.

If the application encrypts local data with the legacy Secure Vault key, complete the [local-data migration preparation](#secure-vault) before upgrading the activation.

Changing the configured algorithm does not immediately upgrade an existing activation. Fetch its status, check `hasProtocolUpgradeAvailable()`, then call `startProtocolUpgrade(password)`. Complete a required status fetch before using the upgraded activation. If `hasPendingProtocolUpgrade()` is true, fetch the activation status to finish the pending operation. See the [authenticated protocol upgrade flow](Requesting-Device-Activation-Status.md#authenticated-protocol-upgrade).

The native SDK preserves an existing biometric factor automatically on iOS. On Android, the wrapper's `startProtocolUpgrade(password, true)` option requests biometric-factor migration and works only when `authenticateOnBiometricKeySetup` is `false`. Re-enroll biometry when the returned `biometryFactorRemoved` is true, and process the changed activation fingerprint after the upgrade.

### Activation Data Sharing

Native SDK 2.0 introduces a new activation-data format. For independently distributed iOS applications sharing one activation:

1. Update every participating application to the SDK backed by native 2.0 and explicitly select `LEGACY`.
2. Allow users to update all participating applications before enabling protocol 4.
3. Deploy the selected protocol-4 algorithm and complete the authenticated upgrade.

An older application may be unable to read data written by a newer SDK. Handle `UPGRADE_SDK` by requiring an application update; **do not delete shared activation data**. An application and its bundled extensions update together and do not need this separate staged rollout.

Use `PowerAuthSharingConfiguration` for sharing. Keep matching instance and storage identifiers across participants, including `sharedMemoryIdentifier` when explicitly supplied. Moving an existing installation to shared storage also requires migrating its keychain and UserDefaults data before configuration. See [configuration](Configuration.md#advanced-configuration).

## Platform Requirements

- React Native 0.87 or later, Android 7.0 (API 24) or later, and iOS 15.1 or later.
- Cordova 12 or later, cordova-android 12 or later, and cordova-ios 7 or later. iOS 13.0 or later is required.
- Android builds require Java 17 compatibility.
- CocoaPods supplies the native `PowerAuth2` dependency. React Native's opt-in SwiftPM integration is experimental; Cordova continues to use CocoaPods.

Follow [installation instructions](Installation.md) for dependency setup. Applications with custom native integration must update old `PowerAuthCore` imports to the native 2.0 surface; consult the [native migration guide](https://github.com/wultra/powerauth-mobile-sdk/blob/2.0.0/docs/Migration-from-1.9-to-2.0.md).

## Configuration Changes

Configuration getters now return promises backed by the configured native instance. Add `await` when reading `configuration`, `clientConfiguration`, `biometryConfiguration`, `keychainConfiguration`, and `sharingConfiguration`. Use `await powerAuth.currentAlgorithm` to read the current algorithm.

The effective client configuration omits input-only `customHttpHeaders` and `basicHttpAuthentication`. Retain the original values if needed for reconfiguration. The keychain getter returns Android settings and is `undefined` on Apple platforms. The sharing getter returns Apple settings and is `undefined` on Android.

The deprecated `PowerAuthKeychainConfiguration.accessGroupName` and `userDefaultsSuiteName` remain input-only compatibility properties. Migrate sharing setup to `PowerAuthSharingConfiguration`; retain the original legacy values while still using them.

Use the new `offlineAuthenticationCodeComponentLength` option to configure the length of each offline authentication-code component. It accepts integers from 4 through 8 and defaults to 8.

The new `PowerAuth.cleanupInstanceData()` method removes unusable local instance data. Call it with the same configuration and storage settings when handling `INVALID_ACTIVATION_DATA`. Do not use it to handle `UPGRADE_SDK` or as a routine upgrade step.

## Request and Token Authentication

| Deprecated API | Replacement |
|---|---|
| `requestGetSignature(auth, uriId, params)` | `authenticationHeaderForRequestWithParams(auth, "GET", uriId, params)` |
| `requestSignature(auth, method, uriId, body)` | `authenticationHeaderForRequestWithBody(auth, method, uriId, body)` |
| `offlineSignature(auth, uriId, nonce, body)` | `offlineAuthenticationCode(auth, uriId, nonce, body)` |
| `PowerAuthAuthorizationHttpHeader` | `PowerAuthHttpHeader`: read `name` instead of `key` |
| `tokenStore.generateHeaderForToken(name)` | `tokenStore.generateAuthenticationHeader(name)` |

The deprecated header methods preserve their `{ key, value }` shape. Update the method call and header-property access together. Request bodies remain UTF-8 strings; offline nonces remain Base64 strings. The query-parameter method now takes an explicit HTTP method. Await offline authentication and token-header generation, which can require asynchronous native work.

Token-header failures propagate native errors such as `INVALID_TOKEN`; stop relying on deprecated `CANNOT_GENERATE_TOKEN`. See [request authentication](Data-Signing.md) and [tokens](Token-Based-Authentication.md).

## Activation and Authentication Purpose

`persistActivation()` now resolves without a return value; remove checks that expect a boolean result. Continue to await the operation. Native SDK 2.0 validates authentication purpose: use `PowerAuthAuthentication.persistWithPassword()` or `persistWithPasswordAndBiometry()` for persistence, and `possession()`, `password()`, or `biometry()` for ordinary authentication. Mixing purposes rejects with `WRONG_PARAMETER`.

The previously deprecated `PowerAuthAuthentication` constructor and mutable properties (`usePossession`, `useBiometry`, `userPassword`, `biometryMessage`, and `biometryTitle`) remain for compatibility. If your application still uses them, switch to the static factories instead of mutating authentication factors directly.

Native SDK 2.0 no longer supports recovery activation, and the corresponding JavaScript APIs are removed. Remove calls to `PowerAuthActivation.createWithRecoveryCode()`, `hasActivationRecoveryData()`, `activationRecoveryData()`, `confirmRecoveryCode()`, and the recovery code/PUK parsing and validation helpers. The recovery fields, `PowerAuthRecoveryActivationData`, and `PowerAuthConfirmRecoveryCodeDataResult` are also removed. Use a supported [activation flow](Device-Activation.md); there is no equivalent recovery-code API.

The native SDK no longer verifies legacy activation QR signature suffixes. `PowerAuthActivationCodeUtil.parseActivationCode()` validates the code and strips the suffix; do not use its result as proof of the scanned code's authenticity.

## Password Change

The deprecated `changePassword()`, `changePasswordUnsafe()`, and `unsafeChangePassword()` are replaced by the [two-step password change](Password-Management.md):

```typescript
const changeData = await powerAuth.beginPasswordChange(oldPassword);
try {
    // Obtain and confirm newPassword here before finishing the change.
    await powerAuth.finishPasswordChange(newPassword, changeData);
} finally {
    await changeData.release(); // Safe even though finishPasswordChange() releases it.
}
```

Obtain and confirm the new password between the two steps. Release `changeData` if the user abandons the flow. `finishPasswordChange()` consumes it on success or failure; it cannot be reused.

`validatePassword()` remains deprecated and has no direct replacement. Do not validate a password before another authenticated operation. Handle that operation's authentication failure and fetch the activation status to check remaining attempts. The unsafe password-change methods do not validate the old password; an incorrect old password corrupts local activation data irreversibly.

## Biometry

| Deprecated API or option | Replacement |
|---|---|
| `getBiometryInfo()`, `PowerAuthBiometryInfo` | Instance-aware `getBiometricStatus()`, `PowerAuthBiometricStatus` |
| `linkItemsToCurrentSet` | `invalidateBiometricFactorAfterChange` |
| Prompt `cancelButton` | `cancelButtonTitle` |
| Prompt `fallbackButton` | `fallbackButtonTitle` |

Use `isAuthenticationWithBiometricsAvailable()` for the combined system and activation availability check. Android prompts also support `promptSubtitle`. Always await biometric factor setup and removal; `removeBiometryFactor()` now resolves without a return value.

The native Android SDK now protects new biometric factors with HMAC-KDF; existing factors continue to work. Use the new JavaScript `useLegacySymmetricKey` option only when new factors require legacy AES-KDF compatibility. Check your setup flow: `authenticateOnBiometricKeySetup` now defaults to `true`, so adding a factor requires a biometric prompt. These settings apply to newly created factors, not existing ones.

Use [grouped biometric authentication](Biometry-Setup.md#fetch-biometry-credentials-in-advance) for multiple operations after one prompt. Keep reusable credentials within the callback lifetime and execute requests sequentially.

Exceptions thrown inside the `groupedBiometricAuthentication()` callback now reach the outer caller as `PowerAuthErrorCode.UNKNOWN_ERROR`, including `PowerAuthError` exceptions whose codes were previously preserved. Handle operation-specific errors inside the callback if you need their original codes. Errors raised before the callback starts retain their original codes.

## Digital Signatures, JWS, and Certificates

| Deprecated API | Replacement |
|---|---|
| `signDataWithDevicePrivateKey(auth, data, format)` | `calculateDigitalSignature(auth, dataBase64, PowerAuthSignatureKeyId.DEVICE_EC)` |
| `verifyServerSignedData(data, signature, masterKey)` | `verifyDigitalSignature(signatureBase64, dataBase64, keyId)`: use `PowerAuthSignatureKeyId.MASTER_EC` when `masterKey === true`, otherwise `PowerAuthSignatureKeyId.SERVER_EC` |

Encode binary inputs as Base64. `calculateDigitalSignature()` returns a Base64 signature. Unlike the legacy boolean verification result, `verifyDigitalSignature()` resolves without a value on success and rejects with `WRONG_SIGNATURE` for an invalid signature.

The wrapper also adds `calculateJwsSignature()`, `verifyJwsSignature()`, `createCertificateSigningRequest()`, and `exportDevicePublicKeys()`. Choose key identifiers supported by the native SDK: use concrete keys for digital signatures, certificates, and compact JWT, and generic hybrid identifiers for non-compact JWS. ML-DSA keys require `P384_L3` or `P384_L5`. See [data signing](Data-Signing.md).

## End-to-End Encryption

Acquire an encryptor asynchronously with `getEncryptorForApplicationScope()` or `getEncryptorForActivationScope()`. Use the same object for one request encryption and its response decryption, then release it in `finally`. Acquire a new object for the next exchange.

Replace `PowerAuthCryptogram`, `PowerAuthEncryptedRequestData`, `PowerAuthDecryptor`, and `PowerAuthEncryptionHttpHeader` with `PowerAuthEncryptor` and `PowerAuthEncryptedRequest`. Encryption no longer accepts data-format arguments; `PowerAuthDataFormat` remains exported only for APIs such as the deprecated device-signature helper.

All clear and encrypted request/response bodies at the encryption bridge are Base64 strings. Decode `requestBody` to bytes before sending, include the returned `requestHeaders` as described in the [encryption guide](End-To-End-Encryption.md), and encode the raw encrypted response bytes as Base64 for `decryptResponse()`. Decode its Base64 result before interpreting the clear payload. Do not send a Base64 string or JSON cryptogram as the HTTP body, or pass an unencrypted server error to decryption.

## Secure Vault

`fetchEncryptionKey(auth, index)` is now deprecated. Its result remains a Base64 key, and the underlying native operation works only with protocol 3.3. For protocol 4, replace it with `fetchSecureVaultKey()` and call `deriveKey(index, size)` on the returned `PowerAuthSecureVaultKey` to obtain a purpose-specific Base64 key. Release the base key in `finally`; do not use the base key itself as an encryption or MAC key. See [Secure Vault](Secure-Vault.md) for the complete flow.

Plan local-data migration before upgrading an activation: the legacy key must be obtained and old data decrypted while protocol 3.3 is still available. After upgrading, re-encrypt with a newly derived protocol-4 key. Do not assume the new derivation produces the old key, persist derived keys, or reuse a key for multiple purposes. Design recovery from interruption before deploying the data migration.

## Activation State, Errors, and Object Lifetime

- `PowerAuthActivationState.CREATED` is removed because the native SDK no longer exposes it. Handle `UNKNOWN` for unrecognized server states.
- `AUTHENTICATION_ERROR` and `RESPONSE_ERROR` are removed. Transport and server-response failures use `NETWORK_ERROR`; inspect `PowerAuthError.errorData` for `httpStatusCode`, `serverResponseCode`, `serverResponseMessage`, and `responseBody` when available. Recovery PUK details are no longer returned.
- `INVALID_ENCRYPTOR` is removed. Invalid, expired, consumed, or released native handles report `INVALID_NATIVE_OBJECT`.
- Handle new `WRONG_SIGNATURE`, `UPGRADE_SDK`, `INVALID_LOG_LEVEL`, `OTHER`, and `REACT_NATIVE_ERROR` categories where applicable.
- Release native-backed passwords, abandoned password-change data, encryptors, and Secure Vault base keys when finished. Do not retain handles across instance deconfiguration. Follow each object's documented ownership and lifetime rules.

## References

See the [native SDK 2.0 migration guide](https://github.com/wultra/powerauth-mobile-sdk/blob/2.0.0/docs/Migration-from-1.9-to-2.0.md) for details about the underlying native SDK changes.
