# Installation

- [Installation for React-Native](#react-native-installation)
- [Installation for Cordova](#cordova-installation)

## React-Native Installation

### Supported Platforms

The library is available for the following __React Native (0.87+)__ platforms:

- __Android 7.0 (API 24)__ and newer
- __iOS 15.1__ and newer

### How To Install

#### 1. Install the package via npm
```sh
npm i react-native-powerauth-mobile-sdk --save
```

#### 2. Configure iOS dependencies

CocoaPods remains the default and supported React Native integration. Install the pods:

```sh
cd ios
pod install
```

React Native 0.87 also provides experimental, opt-in Swift Package Manager support. To try it instead of CocoaPods, run this once from the application root:

```sh
npx react-native spm --deintegrate
```

After a fresh clone and in CI, restore the generated SwiftPM integration before building:

```sh
npx react-native spm
```

SwiftPM commands and generated layouts may change in future React Native releases, so do not use this integration in production yet. The SDK supplies its native `PowerAuth2` dependency automatically; do not add the package manually.

#### 3. Import PowerAuth in your js/ts files

```typescript
import { PowerAuth, PowerAuthAuthentication, PowerAuthError } from 'react-native-powerauth-mobile-sdk';
```

## Cordova Installation

### Supported Platforms

The library is available for the following __Apache Cordova (>=12.0.0)__ platforms:

- __Android 7.0 (API 24)__ and newer (cordova-android version >=12.0.0)
- __iOS 11.0__ and newer (cordova-ios version >=7.0.0)

### How To Install

#### 1. Install the plugin via the cordova plugin installer
```sh
cordova plugin add cordova-powerauth-mobile-sdk
```

#### 2. Install pods for iOS (if needed)

To make integration working with iOS, you might need to install Pods:

```sh
cd platforms/ios
pod install
```

#### 3. Start using PowerAuth classes

```typescript
const powerAuth = new PowerAuth("my-test-instance");
```

## Read Next

- [Configuration](./Configuration.md)
