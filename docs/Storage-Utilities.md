# Storage Utilities

The PowerAuth Mobile JS SDK provides a simple cache API via `PowerAuthStorageUtils` for string key–value storage.

## Storage Types

- `PowerAuthStorageType.SECURE`  
  - iOS: PowerAuth Keychain (Keychain service `com.wultra.powerauth.jssdk.storageutils.secure`)
  - Android: PowerAuth Keychain (encrypted, backed by Android Keystore)

- `PowerAuthStorageType.STANDARD`  
  - iOS: UserDefaults suite `com.wultra.powerauth.jssdk.storageutils.standard`
  - Android: SharedPreferences file `com.wultra.powerauth.jssdk.storageutils.standard`

## Available Methods

### setString(key: string, value: string, storageType: PowerAuthStorageType)
Store a string value under a key.

### getString(key: string, storageType: PowerAuthStorageType)
Retrieve a string value. Returns `undefined` when the key is missing.

### exists(key: string, storageType: PowerAuthStorageType)
Check whether a key is present.

### remove(key: string, storageType: PowerAuthStorageType)
Remove a key. Returns `true` if the key existed.

## Usage

```typescript
import { PowerAuthStorageUtils, PowerAuthStorageType } from 'react-native-powerauth-mobile-sdk';

// Secure storage (Keychain / Android Keystore-backed)
await PowerAuthStorageUtils.setString('session', '{"token":"abc"}', PowerAuthStorageType.SECURE);
const secureValue = await PowerAuthStorageUtils.getString('session', PowerAuthStorageType.SECURE);

// Standard storage (UserDefaults / SharedPreferences)
await PowerAuthStorageUtils.setString('theme', 'dark', PowerAuthStorageType.STANDARD);
const exists = await PowerAuthStorageUtils.exists('theme', PowerAuthStorageType.STANDARD);
const removed = await PowerAuthStorageUtils.remove('theme', PowerAuthStorageType.STANDARD);
```

## Errors

- `WRONG_PARAMETER`: invalid input (e.g., empty key, invalid storage type)
- `ENCRYPTION_ERROR`: secure storage operation failed

## Read Next

- [Additional Utilities](Additional-Utilities.md)
- [Accessing the Native PowerAuthSDK](Accessing-Native-PowerAuthSDK.md)

