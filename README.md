# PowerAuth SDK for React Native Mobile Apps

In order to connect to the [PowerAuth](https://www.wultra.com/mobile-security-suite) service, mobile applications need to perform the required network and cryptographic processes, as described in the PowerAuth documentation. To simplify the implementation of these processes, developers can use React Native library (for Android and iOS) from this repository.

> ### Note that this library is under development.
> More detailed documentation will be added later. If you need any information regarding the status of this library, don't hesitate to [contact us](#contact).

## Support and Compatibility

|React Native SDK| Mobile SDK | Protocol | PowerAuth Server    | Support Status                    |
|----------------|------------|----------|---------------------|-----------------------------------|
|`1.4.x`         | `1.4.x`    | `V3.1`   | `0.24+`             | Fully supported                   |

## How to install

### 1. Install package via `npm`
```
npm i react-native-powerauth-mobile-sdk
```

### 2. Configure the instance

Before you call any PowerAuth method, you need to configure it first. The `configure` method will need the following parameters:

- **instanceId** Identifier of the PowerAuthSDK instance. The aplication package name/identifier is recommended.  
- **appKey** APPLICATION_KEY as defined in PowerAuth specification - a key identifying an application version.
- **appSecret** APPLICATION_SECRET as defined in PowerAuth specification - a secret associated with an application version.  
- **masterServerPublicKey** KEY\_SERVER\_MASTER_PUBLIC as defined in PowerAuth specification - a master server public key.  
- **baseEndpointUrl** Base URL to the PowerAuth Standard RESTful API (the URL part before "/pa/...").  
- **enableUnsecureTraffic** If HTTP and invalid HTTPS communication should be enabled (do not set true in production).  

#### Configuration from JavaScript

You can configure the PowerAuth singleton directly in the Javascript. Simply import the module and use the following snippet.

```js
import PowerAuth from 'react-native-powerauth-mobile-sdk';

PowerAuth.configure("your-app-activation", "APPLICATION_KEY", "APPLICATION_SECRET", "KEY_SERVER_MASTER_PUBLIC", "https://your-powerauth-endpoint.com/", false)
  .catch(function(e) {
    console.log("Configuration failed");
  }).then(function(r) {
    console.log("PowerAuth configured");
});
```

#### Configuration from Java/Objective-C

In some cases (for example when you don't want to leave the configuration info in your `.js` files) you might want to configure the PowerAuth directly from the platform native code.

__JAVA__

```java
import com.wultra.android.powerauth.reactnative.PowerAuthRNPackage;

public class MainApplication extends Application implements ReactApplication {
		
	@Override
	public void onCreate() {
   		super.onCreate();
		initializePowerAuth();
  	}
  	
  	private void initializePowerAuth() {
   		for (ReactPackage pkg : this.getReactNativeHost().getReactInstanceManager().getPackages()) {
   			if (pkg instanceof PowerAuthRNPackage) {
				try {
		          ((PowerAuthRNPackage) pkg).configure("your-app-activation", "APPLICATION_KEY", "APPLICATION_SECRET", "KEY_SERVER_MASTER_PUBLIC", "https://your-powerauth-endpoint.com/", false);
    			} catch (Exception e) {
		          e.printStackTrace();
    			}
			}
		}
	}
}
```

## API reference

For API reference, visit [PowerAuth.d.ts definition file](https://github.com/wultra/react-native-powerauth-mobile-sdk/blob/master/PowerAuth.d.ts) where you can browse all documented available methods.

*More detailed documentation will be added later. For now, you can visit the [native PowerAuth SDK for Mobile Apps](https://github.com/wultra/powerauth-mobile-sdk) as this library acts as a bridge between the Javascript environment and the native module.*

## Demo application

Demo application with the integration of the PowerAuth React Native SDK can be found inside the `demoapp` folder.

## License

All sources are licensed using Apache 2.0 license, you can use them with no restriction. If you are using PowerAuth 2.0, please let us know. We will be happy to share and promote your project.

## Contact

If you need any assistance, do not hesitate to drop us a line at [hello@wultra.com](mailto:hello@wultra.com).

### Security Disclosure

If you believe you have identified a security vulnerability with PowerAuth, you should report it as soon as possible via email to [support@wultra.com](mailto:support@wultra.com). Please do not post it to a public issue tracker.
