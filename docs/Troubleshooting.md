# Troubleshooting

## Upgrading SDK

If you upgraded SDK to a newer major or minor version and encounter some problems, then please follow the [Migration Instructions](Migration-Instructions.md) first.

## Enable debug log

In case you encounter a problem with this library, then try to turn-on a detailed debug log to provide a more information for the library developers:

```javascript
// Enable debug log with failed call to native function.
PowerAuthDebug.traceNativeCodeCalls(true);
// Trace all calls to native library
PowerAuthDebug.traceNativeCodeCalls(true, true);
```

<!-- begin box warning -->
The `PowerAuthDebug` class is effective only if global `__DEV__` constant is `true`. We don't want to log the sensitive information to the console in the production application.
<!-- end -->

## Dumping native objects

If `__DEV__` mode is turned on, then you can dump information about all native objects allocated and used by PowerAuth Mobile JS SDK:

```javascript
// Dump all objects
await PowerAuthDebug.dumpNativeObjects();
// Dump objects related to PowerAuth instance
await PowerAuthDebug.dumpNativeObjects(powerAuth.instanceId);
```

## Read Next

- [Sample Integration](Sample-Integration.md)