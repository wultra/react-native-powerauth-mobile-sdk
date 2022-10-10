# Troubleshooting

## Enable debug log

In case you encounter a problem with this library, then try to turn-on a detailed debug log to provide a more information for the library developers:

```javascript
// Enable debug log with failed call to native function.
PowerAuthDebug.traceNativeCodeCalls(true)
// Trace all calls to native library
PowerAuthDebug.traceNativeCodeCalls(true, true)
```

<!-- begin box warning -->
The `PowerAuthDebug` class is effective only if global `__DEV__` constant is `true`. We don't want to log the sensitive information to the console in the production application.
<!-- end -->

## Read Next

- [Sample Integration](Sample-Integration.md)