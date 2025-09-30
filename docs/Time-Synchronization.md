# Time Synchronization

The SDK internally uses time synchronized with the PowerAuth Server for its cryptographic functions, such as [End-To-End Encryption](End-To-End-Encryption.md) or [Token-Based Authentication](Token-Based-Authentication.md). The synchronized time can also be beneficial for your application. For example, if you want to display a time-sensitive message or countdown to your users, you can take advantage of this service.

Use the following code to get the service responsible for the time synchronization: 

```typescript
const timeService = powerAuthSDK.timeSynchronizationService
```

### Automatic Time Synchronization

The time is synchronized automatically in the following situations:

- After an [activation is created](Device-Activation.md)
- After getting an [activation status](Requesting-Device-Activation-Status.md)
- After receiving any response encrypted with our [End-To-End Encryption scheme](End-To-End-Encryption.md)
- After generating an authorization header for a token (see [Token-Based Authentication](Token-Based-Authentication.md) for more details)

<!-- begin box warning -->
The time synchronization is reset automatically once your application transitions from the background to the foreground.
<!-- end -->

### Manually Synchronize Time

Use the following code to synchronize the time manually:

```typescript
await timeService.synchronizeTime()
```

### Get Synchronized Time

To get the synchronized time, use the following code:

```typescript
if (await timeService.isTimeSynchronized()) {
  // Get synchronized timestamp (in milliseconds)
  const timestamp = await timeService.currentTime()
  // If a date object is required, then use the following snippet
  const date = new Date(timestamp)
} else {
  // Time is not synchronized yet. If you call currentTime() then
  // the returned timestamp is similar to `new Date().getTime()` in JS
  const timestamp = await timeService.currentTime()
}
```

The time service provides additional information about time, such as how precisely the time is synchronized with the server:

```typescript
if (await timeService.isTimeSynchronized()) {
  const precision = await timeService.localTimeAdjustmentPrecision()
  console.log(`Time is synchronized with ${precision} ms precision`)
}
```

The precision value represents a maximum absolute deviation of synchronized time against the actual time on the server. For example, a value `500` means that the time provided by the `currentTime()` method maybe 0.5 seconds ahead or behind the actual time on the server. If the precision is not sufficient for your purpose, for example, if you need to display a real-time countdown in your application, then try to synchronize the time manually. The precision basically depends on how quickly is the synchronization response received and processed from the server. A faster response results in higher precision.

## Read Next

- [Crypto Utilities](Crypto-Utilities.md)
