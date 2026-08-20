# Migration from 3.x.x to 4.0.0

This guide contains instructions for migration from PowerAuth Mobile JS SDK version `3.x.x` to version `4.0.0`.

PowerAuth Mobile JS SDK in version `4.0.0` provides the following improvements:

- Added support for simplified configuration. The SDK is now configured to use one Base64 encoded string instead of three separate values.
  - The simplified configuration can be obtained in the `powerauth-cloud/admin/applications/<APPLICATION_ID>` admin endpoint.
  - Or it can be created by the [migration script](#sdk-config-migration-script)
- Added support for PowerAuth protocol version 3.3, including the following improvements:
  - The PowerAuth protocol no longer uses EC key-pairs for encryption and signature calculation (dual use problem).
  - The End-To-End encryption is now using temporary keys to improve the forward secrecy of our ECIES scheme.
  - Time synchronized with the server.
- We have replaced the term 'commit activation' with 'persist activation' in our terminology. This change clearly distinguishes between the commit activation process on the server and the activation completion process on the mobile device.

### Compatibility with PowerAuth Server

- This release is fully compatible with PowerAuth Server version `1.9.0` and newer.

### API changes

- The basic `configure` method in the `PowerAuth` class now requires `configuration` parameter instead of `appKey`, `appSecret` and `masterServerPublicKey`.
- In the `PowerAuthConfigurationType`/`PowerAuthConfiguration` properties `appKey`, `appSecret`, and `masterServerPublicKey` were removed and replaced with the `configuration`.
- The `commitActivation` method in the `PowerAuth` class was renamed to `persistActivation`.
- The following methods are now renamed in the `PowerAuthAuthentication`:
  - The `commitWithPassword()` was renamed to `persistWithPassword()`
  - The `commitWithPasswordAndBiometry()` was renamed to `persistWithPasswordAndBiometry()`
- The `signDataWithDevicePrivateKey()` now requires `dataFormat` parameter to hint if the signed data is plain string (`UTF8`) or Base64 encoded data (`BASE64`).

### Other changes

#### New Error Code

There is a new error code `EC_TIME_SYNCHRONIZATION` that indicates a problem with the time synchronization.

#### End-To-End Encryption

- Encrypted request now contains a new property `temporaryKeyId` with type `string`, please update your model objects.
- Encrypted request now contains new property `timestamp` with type `number`, please update your model objects.

Example:

```json
{
  "temporaryKeyId" : "UUID",
  "ephemeralPublicKey" : "BASE64-DATA-BLOB",
  "encryptedData": "BASE64-DATA-BLOB",
  "mac" : "BASE64-DATA-BLOB",
  "nonce" : "BASE64-NONCE",
  "timestamp" : 1694172789256
}
```

### SDK Config Migration Script

To configure the `PowerAuth` object, the `configuration` parameter is now required instead of `appKey`, `appSecret`, and `masterPublicKey`. If you can't retrieve this configuration from the server, you can use the migration script to obtain it.

Example usage:
`node migration.js Gh4V3nxiat8A1st3vVhzbg== Pgd67vpBT6/Y+2fNBt7Sxg== BFNObd28hFHYfdAgYgb6oK+LFlO69WEwLXaU4dxMoQFC+/dZOusMvkmTNahC8Os3aDhzRZP8+J3gw6irSEOROY4=`

```js
const { Buffer } = require('buffer');

const SDK_CONFIGURATION_VERSION = 0x01;
const MASTER_PUBLIC_KEY_CRYPTO_V3 = 0x01;

// Get command-line arguments
const args = process.argv.slice(2);
if (args.length != 3) {
  console.error("Usage: node migration.js <appKeyBase64> <appSecretBase64> <masterPublicKeyBase64>");
  process.exit(1);
}

const [appKeyBase64, appSecretBase64, masterPublicKeyBase64] = args;

class SdkDataWriter {
  constructor() {
    this.bytes = [];
  }

  writeByte(value) {
    this.bytes.push(value & 0xFF);
  }

  writeData(dataBuffer) {
    if (!this.writeCount(dataBuffer.length)) {
        return;
    }
    this.bytes.push(...dataBuffer);
  }

  writeCount(count) {
    // The SDK expects unsigned values, convert int to unsigned long for the byte operations
    if (count <= 0x7F) {
        this.writeByte(count);
    } else if (count <= 0x3FFF) {
        this.writeByte(((count >> 8 ) & 0x3F) | 0x80);
        this.writeByte(count & 0xFF);
    } else if (count <= 0x3FFFFFFF) {
        this.writeByte(((count >> 24) & 0x3F) | 0xC0);
        this.writeByte((count >> 16) & 0xFF);
        this.writeByte((count >> 8 ) & 0xFF);
        this.writeByte(count & 0xFF);
    } else {
        return false;
    }
    return true;
  }

  toBuffer() {
    return Buffer.from(this.bytes);
  }
}

const writer = new SdkDataWriter();

writer.writeByte(SDK_CONFIGURATION_VERSION);
writer.writeData(Buffer.from(appKeyBase64, 'base64'));
writer.writeData(Buffer.from(appSecretBase64, 'base64'));
writer.writeCount(1);  // this might represent the number of keys?
writer.writeByte(MASTER_PUBLIC_KEY_CRYPTO_V3);
writer.writeData(Buffer.from(masterPublicKeyBase64, 'base64'));

const finalBuffer = writer.toBuffer();
console.log("mobileSdkConfig:");
console.log(finalBuffer.toString('base64'));
```