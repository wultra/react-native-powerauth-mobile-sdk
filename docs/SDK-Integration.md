# SDK Integration

React Native PowerAuth Mobile SDK is distrubuted as a public [npm package](https://www.npmjs.com/package/react-native-powerauth-mobile-sdk). React Native is supported for version `0.64.0` or higher.

### 1. Install package via `npm`
```sh
npm i react-native-powerauth-mobile-sdk --save
```

### 2. Install pods for iOS

To make integration working with iOS, don't forget to install Pods:

```sh
cd ios
pod install
```

### 3. Import `PowerAuth` in your js/ts files.

```typescript
import PowerAuth from 'react-native-powerauth-mobile-sdk';
```

<!-- begin box info -->
React Native PowerAuth SDK currently doesn't support multiple instance scenario `PowerAuth` acts as a singleton.
<!-- end -->

## Read Next

- [Configuration](./Configuration.md)
