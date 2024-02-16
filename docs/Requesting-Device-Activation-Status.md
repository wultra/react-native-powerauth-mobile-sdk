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
            case PowerAuthActivationState.CREATED:
                // Activation is just created. This is the internal
                // state on the server and therefore can be ignored
                // on the mobile application.
                console.log("Activation was created");
            default:
                console.log("Unknown state");
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

To get more information about activation states, check the [Activation States](https://github.com/wultra/powerauth-crypto/blob/develop/docs/Activation.md#activation-states) chapter available in our [powerauth-crypto](https://github.com/wultra/powerauth-crypto) repository.

## Read Next

- [Data Signing](Data-Signing.md)
