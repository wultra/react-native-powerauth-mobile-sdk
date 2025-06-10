# Additional Utilities

The PowerAuth Mobile JS SDK offers additional utility functions that can help with various tasks in your application. These utilities are available through the `PowerAuthUtils` class.

## Available Methods

### getEnvironmentInfo()

Returns information about the current environment, including system details, device information, and SDK version.

**Usage:**

```typescript
import { PowerAuthUtils } from 'react-native-powerauth-mobile-sdk';

async function getDeviceInfo() {
    try {
        const environmentInfo = await PowerAuthUtils.getEnvironmentInfo();
        console.log('Environment Info:', environmentInfo);
        
        // Access specific properties
        console.log('System:', environmentInfo.systemName);
        console.log('Version:', environmentInfo.systemVersion);
        console.log('App Version:', environmentInfo.applicationVersion);
        console.log('App ID:', environmentInfo.applicationIdentifier);
        console.log('Device ID:', environmentInfo.deviceId);
        console.log('Device Maker:', environmentInfo.deviceManufacturer);
        console.log('SDK Version:', environmentInfo.sdkVersion);
    } catch (error) {
        console.error('Failed to get environment info:', error);
    }
}
```

**Response:**

The method returns a `PowerAuthEnvironmentInfo` object with the following properties:

- `systemName` (string): System name, for example "iOS", "Android", "iPadOS"
- `systemVersion` (string): Version of the system
- `applicationVersion` (string, optional): Application version, e.g. "1.0.0"
- `applicationIdentifier` (string, optional): Host application identifier, for example "com.wultra.demoapp"
- `deviceManufacturer` (string): Device manufacturer, for example "apple" or "Samsung"
- `deviceId` (string): Device ID, for example "iPhone9,2"
- `sdkVersion` (string): PowerAuth JS SDK version, for example "4.0.0"
