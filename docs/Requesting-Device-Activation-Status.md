# Requesting Device Activation Status

To quickly determine in which state is the activation, you need to fetch its status.


## Obtaining the Activation Status

To obtain a detailed activation status information, use the following code:

```javascript
// Check if there is some activation on the device
if (await powerAuth.hasValidActivation()) {

    try {
        // If there is an activation on the device, check the status with the server
        const status = await powerAuth.fetchActivationStatus();

        switch (status.state) {
            case PowerAuthActivationState.PENDING_COMMIT:
                // Activation is awaiting commit on the server.
                console.log("Waiting for commit");
            case PowerAuthActivationState.ACTIVE:
                // Activation is valid and active.
                console.log("Activation is active");
            case PowerAuthActivationState.BLOCKED:
                // Activation is blocked. You can display unblock
                // instructions to the user.
                console.log("Activation is blocked");
            case PowerAuthActivationState.REMOVED:
                // Activation is no longer valid on the server.
                // You can inform user about this situation and remove
                // activation locally via "await powerAuth.removeActivationLocal()"
                console.log("Activation is no longer valid");
            case PowerAuthActivationState.DEADLOCK:
                // Local activation is technically blocked and no longer
                // can be used for the signature calculations. You can inform
                // user about this situation and remove activation locally
                // via "await powerAuth.removeActivationLocal()"
                console.log("Activation is technically blocked");
            case PowerAuthActivationState.UNKNOWN:
                // The server returned a state unknown to this SDK version.
                console.log("Unknown activation state");
        }

        // Failed login attempts, remaining = max - current
        const currentFailCount = status.failCount;
        const maxAllowedFailCount = status.maxFailCount;
        const remainingFailCount = status.remainingAttempts;
        // Custom object contains any proprietary server specific data
        const customObject = status.customObject;
    } catch (e) {
        console.log("An error occurred, report it to the user");
    }
} else {
  console.log("No activation present on device");
}
```

Note that the status fetch may fail at an unrecoverable error `PowerAuthErrorCode.PROTOCOL_UPGRADE`, meaning that it's not possible to upgrade the PowerAuth protocol to a newer version. In this case, it's recommended to [remove the activation locally](Device-Activation-Removal.md).

## Authenticated Protocol Upgrade

The fetched activation status can show that a protocol upgrade is available. The upgrade requires the knowledge factor:

```javascript
await powerAuth.fetchActivationStatus();

if (await powerAuth.hasProtocolUpgradeAvailable()) {
    const password = await PowerAuthPassword.fromString("1234");
    const result = await powerAuth.startProtocolUpgrade(password);

    if (result.activationStatusFetchRequired) {
        await powerAuth.fetchActivationStatus();
    }

    const upgradedFingerprint = result.activationFingerprint ??
        await powerAuth.getActivationFingerprint();
    // If your activation flow presents or records the activation fingerprint,
    // process the new fingerprint after the upgrade is complete.

    if (result.biometryFactorRemoved) {
        // Add the biometry factor again after the upgrade.
    }
}
```

On iOS, the SDK preserves an existing biometry factor automatically. On Android, pass `true` as the second argument to `startProtocolUpgrade()` to migrate an existing biometry factor. This option works only when `authenticateOnBiometricKeySetup` is `false`. If `result.biometryFactorRemoved` is `true`, add the biometry factor again after the upgrade.

When `activationStatusFetchRequired` is `false`, `result.activationFingerprint` contains the new fingerprint. When a status fetch is required, that result property is `null`; finish the upgrade and obtain the current value with `getActivationFingerprint()` instead.

If `hasPendingProtocolUpgrade()` returns `true`, call `fetchActivationStatus()` to finish the upgrade. Some SDK operations are not available while an upgrade is pending.

To get more information about activation states, check the [Activation States](https://github.com/wultra/powerauth-crypto/blob/develop/docs/Activation.md#activation-states) chapter available in our [powerauth-crypto](https://github.com/wultra/powerauth-crypto) repository.

## Read Next

- [Data Signing](Data-Signing.md)
