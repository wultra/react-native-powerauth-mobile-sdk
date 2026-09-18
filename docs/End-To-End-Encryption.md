# End-To-End Encryption

PowerAuth SDK supports two end-to-end encryption scopes:

- In the **application** scope, encryption is available without an activation.
- In the **activation** scope, encryption requires a valid activation. You can combine this scope with a [PowerAuth Symmetric Multi-Factor Signature](Data-Signing.md#symmetric-multi-factor-signature) in sign-then-encrypt mode.

Use one `PowerAuthEncryptor` for one request and response exchange. The same object encrypts the request and decrypts its response.

The example URL below is a placeholder. Replace it with an endpoint implemented by your backend that supports application-scope PowerAuth end-to-end encryption without an activation.

The examples use `Buffer` from the `buffer` npm package for UTF-8 and Base64 conversion. Add it to your application dependencies if it is not already installed. Convert text to UTF-8 bytes before Base64 encoding, and decode decrypted bytes as UTF-8 before parsing JSON.

```typescript
import { Buffer } from "buffer"

const endpoint = "https://api.example.com/encrypted-message"

// Use getEncryptorForApplicationScope() when the endpoint does not require an activation.
const encryptor = await powerAuth.getEncryptorForApplicationScope()

try {
    // Serialize the request payload to Base64-encoded bytes.
    const requestBodyBase64 = Buffer.from(JSON.stringify({
        message: "Hello",
        code: "HELLO"
    }), "utf8").toString("base64")
    const encryptedRequest = await encryptor.encryptRequest(requestBodyBase64)

    // Add every encryption header returned by the native SDK.
    const headers = new Headers()
    encryptedRequest.requestHeaders.forEach(header => {
        headers.set(header.name, header.value)
    })

    const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: Uint8Array.from(Buffer.from(encryptedRequest.requestBody, "base64"))
    })

    if (!response.ok) {
        // Handle the backend's unencrypted REST error response.
        throw new Error(`Encrypted request failed: HTTP ${response.status}`)
    }

    const responseBodyBase64 = Buffer.from(await response.arrayBuffer()).toString("base64")
    const clearResponseBase64 = await encryptor.decryptResponse(responseBodyBase64)
    const responseObject = JSON.parse(Buffer.from(clearResponseBase64, "base64").toString("utf8"))
} finally {
    await encryptor.release()
}
```

Acquire a new encryptor for each exchange. After `encryptRequest()`, the object cannot encrypt another request. After `decryptResponse()`, the object is no longer valid.

The JavaScript bridge represents request and response bytes as Base64 strings. Decode `encryptedRequest.requestBody` before sending it on the network, and pass the raw response bytes back as Base64. Do not JSON-encode the encrypted HTTP body.

If the server returns a non-success HTTP status, process the PowerAuth REST error response. Do not pass an unencrypted error response to `decryptResponse()`.

Implementing application-specific end-to-end encryption is a non-trivial task. Contact Wultra before deployment if you need guidance for your scenario.

## Sign an Encrypted Request

To use sign-then-encrypt mode, calculate the PowerAuth signature over the original plaintext request body, then encrypt that same body and send the encrypted request with the authentication header.

For example, use the following steps inside the `try` block of the exchange above, with an encryptor acquired using `getEncryptorForActivationScope()`. Supply `auth` using the factors required by your backend and set `uriId` to the signature URI identifier configured for your endpoint, as described in [Data Signing](Data-Signing.md#symmetric-multi-factor-signature).

```typescript
const requestBody = JSON.stringify({ message: "Hello", code: "HELLO" })

// Sign the original plaintext, before encrypting it.
const authenticationHeader = await powerAuth.authenticationHeaderForRequestWithBody(
    auth,
    "POST",
    uriId,
    requestBody
)
const encryptedRequest = await encryptor.encryptRequest(
    Buffer.from(requestBody, "utf8").toString("base64")
)

const headers = new Headers()
headers.set(authenticationHeader.name, authenticationHeader.value)
// Send encryptedRequest.requestBody and decrypt the response as shown above.
```

For an activation-scoped encryptor, the authentication header contains the information that the server needs to decrypt the request. In this case, do not also add `encryptedRequest.requestHeaders`.

## Native Object Lifetime

The encryptor owns a native object:

- Call `release()` in a `finally` block.
- Repeated calls to `release()` are safe.
- Deconfiguration of the parent `PowerAuth` instance invalidates the encryptor.
- A released, expired, or consumed encryptor reports `PowerAuthErrorCode.INVALID_NATIVE_OBJECT` if used again.
