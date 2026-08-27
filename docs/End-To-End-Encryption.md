# End-To-End Encryption

PowerAuth SDK supports two end-to-end encryption scopes:

- In the **application** scope, encryption is available without an activation.
- In the **activation** scope, encryption requires a valid activation. You can combine this scope with a [PowerAuth Symmetric Multi-Factor Signature](Data-Signing.md#symmetric-multi-factor-signature) in encrypt-then-sign mode.

Use one `PowerAuthEncryptor` for one request and response exchange. The same object encrypts the request and decrypts its response.

```typescript
// Use getEncryptorForApplicationScope() when the endpoint does not require an activation.
const encryptor = await powerAuth.getEncryptorForApplicationScope()

try {
    // Serialize the request payload to Base64-encoded bytes.
    const requestBodyBase64 = btoa(JSON.stringify({
        message: "Hello World!",
        code: "HELLO"
    }))
    const encryptedRequest = await encryptor.encryptRequest(requestBodyBase64)

    // Add every encryption header returned by the native SDK.
    const headers = new Headers()
    encryptedRequest.requestHeaders.forEach(header => {
        headers.set(header.name, header.value)
    })

    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: Uint8Array.from(atob(encryptedRequest.requestBody), c => c.charCodeAt(0))
    })

    const responseBytes = new Uint8Array(await response.arrayBuffer())
    let responseBinary = ""
    for (let i = 0; i < responseBytes.length; i++) {
        responseBinary += String.fromCharCode(responseBytes[i])
    }
    const clearResponseBase64 = await encryptor.decryptResponse(btoa(responseBinary))
    const responseObject = JSON.parse(atob(clearResponseBase64))
} finally {
    await encryptor.release()
}
```

Acquire a new encryptor for each exchange. After `encryptRequest()`, the object cannot encrypt another request. After `decryptResponse()`, the object is no longer valid.

The JavaScript bridge represents request and response bytes as Base64 strings. Decode `encryptedRequest.requestBody` before sending it on the network, and pass the raw response bytes back as Base64. Do not JSON-encode the encrypted HTTP body.

If the server returns a non-success HTTP status, process the PowerAuth REST error response. Do not pass an unencrypted error response to `decryptResponse()`.

Implementing application-specific end-to-end encryption is a non-trivial task. Contact Wultra before deployment if you need guidance for your scenario.

## Sign an Encrypted Request

To use encrypt-then-sign mode, encrypt the request first and calculate the PowerAuth signature over the encrypted request body bytes.

For an activation-scoped encryptor, the authentication header contains the information that the server needs to decrypt the request. In this case, do not also add `encryptedRequest.requestHeaders`.

## Native Object Lifetime

The encryptor owns a native object:

- Call `release()` in a `finally` block.
- Repeated calls to `release()` are safe.
- Deconfiguration of the parent `PowerAuth` instance invalidates the encryptor.
- A released, expired, or consumed encryptor reports `PowerAuthErrorCode.INVALID_NATIVE_OBJECT` if used again.
