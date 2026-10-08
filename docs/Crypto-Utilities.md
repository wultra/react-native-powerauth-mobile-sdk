# Crypto Utilities

The PowerAuth Mobile JS SDK offers additional crypto functions. These utilities are available through the `PowerAuthCryptoUtils` class.

The examples below use the [`buffer`](https://www.npmjs.com/package/buffer) package to convert between UTF-8 text, bytes, and Base64. Add it to your application dependencies (for example, `yarn add buffer`).

## Available Methods

### hashSha256(data: string)

Calculates SHA256 hash of a parameter encoded as Base64 string.

**Usage:**

```typescript
import { PowerAuthCryptoUtils } from 'react-native-powerauth-mobile-sdk';
import { Buffer } from 'buffer';

async function hashSha256(data: string) {
    try {
        const base64 = Buffer.from(data, 'utf8').toString('base64');
        const hash = await PowerAuthCryptoUtils.hashSha256(base64);
        // use hash
    } catch (error) {
        console.error('Failed to calculate SHA256 hash:', error);
    }
}
```

**Response:**
The method returns a Base64 encoded string with SHA256 hash of input parameter.

### randomBytes(length: number)

Returns a random byte array of specified length encoded as Base64 string.

**Usage:**

```typescript
import { PowerAuthCryptoUtils } from 'react-native-powerauth-mobile-sdk';
import { Buffer } from 'buffer';

async function randomBytes(length: number) {
    try {
        const randomBase64 = await PowerAuthCryptoUtils.randomBytes(length);
        const randomBytes = Uint8Array.from(Buffer.from(randomBase64, 'base64'));
        // use random bytes
    } catch (error) {
        console.error('Failed to get random bytes:', error);
    }
}
```

**Response:**

The method returns random bytes array encoded as Base64 string. In order to use the bytes, you need to convert the Base64 string to Uint8Array. (see provided sample code)

## Read Next

- [Accessing the Native PowerAuthSDK](Accessing-Native-PowerAuthSDK.md)
