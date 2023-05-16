# End-To-End Encryption

Currently, PowerAuth SDK supports two basic modes of end-to-end encryption, based on the ECIES scheme:

- In an "application" scope, the encryptor can be acquired and used during the whole lifetime of the application.
- In an "activation" scope, the encryptor can be acquired only if `PowerAuth` instance has a valid activation. The encryptor created for this mode is cryptographically bound to the parameters agreed during the activation process. You can combine this encryption with [PowerAuth Symmetric Multi-Factor Signature](Data-Signing.md#symmetric-multi-factor-signature) in "encrypt-then-sign" mode.

For both scenarios, you need to acquire `PowerAuthEncryptor` object, which will then provide interface for the request encryption and the response decryption.

The following steps are typically required for a full E2EE request and response processing:

1. Acquire the right encryptor from the `PowerAuth` instance. For example:
   ```typescript
   // Encryptor for "application" scope.
   const encryptor = powerAuth.getEncryptorForApplicationScope()
   // ...or similar, for an "activation" scope.
   const encryptor = powerAuth.getEncryptorForActivationScope()
   ```

1. Encode the plaintext body into format that best fit your purpose. You can use plain string or Base64 encoded data:
   ```typescript
   let requestData: string;
   let requestDataFormat: PowerAuthDataFormat;
   if (binaryData) {
       // If you need encrypt the binary data, such as image, then you can encode it as BASE64
       requestFormat = 'BASE64';
       requestData = 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
   } else {
       // Reqular JSON request can be encrypted as a plain string
       requestDataFormat = 'UTF8'
       requestData = JSON.stringify({
          message: "Hello World!",
          code: "HELLO"
       });
   }
   ```

1. Encrypt the plaintext request data:
   ```typescript
   // 2nd parameter is optional, if not provided, then 'UTF8' is applied.
   const encryptedData = await encryptor.encryptRequest(requestData, requestDataFormat);
   // Keep decryptor object for later to properly decrpyt response from the server.
   // The decryptor is always unique for each request.
   const decryptor = encryptedData.decryptor;
   // Cryptogram contains actual encrypted data
   const cryptogram = encryptedData.cryptogram;
   // Append header to the HTTP request
   const header = encryptedData.header;
   ```

1. Construct and execute the HTTP request:
   ```typescript
   // Headers
   const headers = new Headers();
   headers.set(header.key, header.value);
   // Request body
   // This may depend on the endpoint, but the cryptogram is typically serialized as-is, or it's embedded
   // in another structure, such as:
   // {
   //     requestObject: cryptogram
   // }
   const body = JSON.stringify(cryptogram);
   // Fetch data
   const response = await fetch(serviceBaseUrl + '/hello/service', body, headers);
   if (!response.ok) {
      throw new Error(`HTTP status code ${response.status}`)
   }
   // The response object is typically also PowerAuthCryptogram
   const responseObject = await response.json();
   ```

1. Now decrypt the response. Depending on what type of data you expect, you can specify `'UTF8'` or `'BASE64'` output data format:
   ```typescript
   const responseDataFormat = 'UTF8';
   // 2nd parameter is optional, if not provided, then 'UTF8' is applied.
   const decryptedData = await decryptor.decryptResponse(responseObject, responseDataFormat);
   const responseObject = JSON.parse(decryptedData);
   ```

## Sign encrypted request

If the endpoint require also PowerAuth Signature, then you have to encrypt your request data first, and then sign data of request cryptogram. In this case it's not necessary to set header from `encryptedData.header`, but you have to add header from the signature calculation instead.

## Native object lifetime

Both, `PowerAuthEncryptor` and `PowerAuthDecryptor` implementations use underlying native objects with the limited lifetime behind the scene. The following rules are applied:

- `PowerAuthEncryptor` 
  - Release its internal native object after 5 minutes of inactivity. If used again, then native object is re-created automatically.
  - Object is released when its parent `PowerAuth` instance is deconfigured. After this, encryption is no loner available.
  - If encryptor is activation scoped and parent `PowerAuth` instance has no activation, then encryption is not available.
  - You can use `canEncryptRequest()` function to test whether encryption is available.
  - You can call `release()` to manually release the native object.

- `PowerAuthDecryptor`
  - Decryption is always one-time operation, so by callling `decryptResponse()` is underlying native object released.
  - Object is released when its parent `PowerAuth` instance is deconfigured.
  - If decryptor is activation scoped and parent `PowerAuth` instance has no activation, then decryption is not available.
  - Release its internal native object after 5 minutes of inactivity.
  - You can use `canDecryptResponse()` function to test whether decryption is available.
  - You can call `release()` to manually release the native object.

As you can see, you can use encryptor as for many times as you want, but the decryptor is always bound to the one particular response from the server.

## Read Next

- [Secure Vault](Secure-Vault.md)
