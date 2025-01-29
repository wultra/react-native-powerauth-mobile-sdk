# Accessing the Native PowerAuthSDK

<!-- begin box warning -->
__This feature is not available for Cordova.__
<!-- end -->

If you need to access the native PowerAuthSDK object (created in the JS/TS code) from Java/Kotlin or Objective-C/Swift, you can use the following snippets.

<!-- begin box info -->
Consider consultation with our technical support when accessing the native object. This technique should be used rarely and only for limited purposes as it might lead to unexpected behavior.
<!-- end -->

## iOS

To access the native `PowerAuthSDK` object on iOS, use the `LiftPowerAuthSdk` helper method.

```objc
#import "LiftPowerAuthSdk.h"
#import <PowerAuth2/PowerAuthSDK.h>

// The `bridge` (of type `RCTBridge`) availability depends on the place, where you're trying to access the PowerAuthSDK object.
// For example, you can access it in the AppDelegate that implements `RCTAppDelegate` or as property of an `RCTBridgeModule`.
PowerAuthSDK * sdk = LiftPowerAuthSdk(@"myPowerauthInstance", bridge);
if (sdk) {
    // Do something with the native instance
}
```

## Android

To access the native `PowerAuthSDK` object on Android, use the `PowerAuthUtils.liftPowerAuthSdk` helper method.

```java
import com.wultra.android.powerauth.reactnative.PowerAuthUtils;
import io.getlime.security.powerauth.sdk.PowerAuthSDK;

// The `reactNativeContext` (of type ReactContext) availability depends on the place, where you're trying to access the PowerAuthSDK object.
// For example, you can pass it when creating our package when implementing `ReactPackage` interface.
PowerAuthSDK sdk = PowerAuthUtils.liftPowerAuthSdk("test", reactNativeContext);
if (sdk != null) {
    // Do something with the native instance
}
```
