# Installation

- [Installation for React-Native](#react-native-installation)
- [Installation for Cordova](#cordova-installation)

## React-Native Installation

### Supported Platforms

The library is available for the following __React Native (0.64.1+)__ platforms:

- __Android 5.0 (API 21)__ and newer
- __iOS 13.4__ and newer

### How To Install

#### 1. Install the package via npm
```sh
npm i react-native-powerauth-mobile-sdk --save
```

#### 2. Install pods for iOS

To make integration working with iOS, don't forget to install Pods:

```sh
cd ios
pod install
```

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
