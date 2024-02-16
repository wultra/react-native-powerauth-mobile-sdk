# Installation

React Native PowerAuth Mobile SDK is distributed as a public [npm package](https://www.npmjs.com/package/react-native-powerauth-mobile-sdk).

## Supported Platforms

The library is available for the following __React Native (0.64.1+)__ platforms:

- __Android 5.0 (API 21)__ and newer
- __iOS 13.4__ and newer

## How To Install

### 1. Install the package via npm
```sh
npm i react-native-powerauth-mobile-sdk --save
```

### 2. Install pods for iOS

To make integration working with iOS, don't forget to install Pods:

```sh
cd ios
pod install
```

### 3. Import PowerAuth in your js/ts files

```typescript
import { PowerAuth, PowerAuthAuthentication, PowerAuthError } from 'react-native-powerauth-mobile-sdk';
```

## Read Next

- [Configuration](./Configuration.md)
