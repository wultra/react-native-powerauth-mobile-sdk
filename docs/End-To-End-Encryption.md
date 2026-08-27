# End-To-End Encryption

PowerAuth SDK supports two end-to-end encryption scopes:

- In the **application** scope, encryption is available without an activation.
- In the **activation** scope, encryption requires a valid activation. You can combine this scope with a [PowerAuth Symmetric Multi-Factor Signature](Data-Signing.md#symmetric-multi-factor-signature) in encrypt-then-sign mode.

Use one `PowerAuthEncryptor` for one request and response exchange. The same object encrypts the request and decrypts its response.

```typescript
// Use getEncryptorForApplicationScope() when the endpoint does not require an activation.
const encryptor = await powerAuth.getEncryptorForActivationScope()

try {
    // Clear request bytes cross the JavaScript bridge as Base64 strings.
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
        // The encrypted body is already serialized as a UTF-8 string.
        body: encryptedRequest.requestBody
    })

    // Pass the raw encrypted UTF-8 response body to the same encryptor.
    const clearResponseBase64 = await encryptor.decryptResponse(await response.text())
    const responseObject = JSON.parse(atob(clearResponseBase64))
} finally {
    await encryptor.release()
}
```

Acquire a new encryptor for each exchange. After `encryptRequest()`, the object cannot encrypt another request. After a `decryptResponse()` attempt, the object is consumed and cannot be used again.

The JavaScript bridge represents clear request and response bytes as Base64 strings. The encrypted HTTP request and response bodies are serialized UTF-8 strings and must be sent to and read from the network without additional JSON encoding.

If the server returns a non-success HTTP status, process the PowerAuth REST error response. Do not pass an unencrypted error response to `decryptResponse()`.

Implementing application-specific end-to-end encryption is a non-trivial task. Contact Wultra before deployment if you need guidance for your scenario.

## Sign an Encrypted Request

To use encrypt-then-sign mode, encrypt the request first and calculate the PowerAuth signature over `encryptedRequest.requestBody`.

For an activation-scoped encryptor, the authentication header contains the information that the server needs to decrypt the request. In this case, do not also add `encryptedRequest.requestHeaders`.

## Native Object Lifetime

The encryptor owns a native object:

- Call `release()` in a `finally` block.
- Repeated calls to `release()` are safe.
- Deconfiguration of the parent `PowerAuth` instance invalidates the encryptor.
- A released, expired, or consumed encryptor reports `PowerAuthErrorCode.INVALID_NATIVE_OBJECT` if used again.
