# Token-Based Authentication

<!-- begin box warning -->
**WARNING:** Before you start using access tokens, please visit our [documentation for powerauth-crypto](https://github.com/wultra/powerauth-crypto/blob/develop/docs/MAC-Token-Based-Authentication.md) for more information about this feature.
<!-- end -->

The tokens are simple, locally cached objects, producing timestamp-based authorization headers. Be aware that tokens are NOT a replacement for general PowerAuth signatures. They are helpful in situations when the signatures are too heavy or too complicated for implementation. Each token has the following properties:

- It needs PowerAuth signature for its creation (e.g., you need to provide `PowerAuthAuthentication` object)
- It has a unique identifier on the server. This identifier is not exposed to the public API, but DEBUG version of SDK can reveal that identifier in the debugger.
- It has a symbolic name (e.g. "MyToken") defined by the application programmer to identify already created tokens.
- It can generate timestamp-based authorization HTTP headers.
- It can be used concurrently. Token's private data doesn't change in time.
- The token is associated with the `PowerAuth` instance. So, you can use the same symbolic name in multiple SDK instances, and each created token will be unique.
- Tokens are persisted in the keychain and cached in the memory.
- Once the parent `PowerAuth` instance loses its activation, all its tokens are removed from the local database.

<!-- begin box info -->
React Native PowerAuth SDK currently doesn't support multiple instance scenario and both `PowerAuth` and `PowerAuthTokenStore` acts as a singleton.
<!-- end -->

## Getting Token

To get an access token, you can use the following code:

```javascript
// 1FA signature, uses device related key
const auth = new PowerAuthAuthentication();
auth.usePossession = true;

try {
    const token = await PowerAuthTokenStore.requestAccessToken("MyToken", auth);
    // now you can generate header
} catch (e) {
    // handle error
}
```

Token can be locally cached on the device. You can test this situation by calling `await PowerAuthTokenStore.hasLocalToken("MyToken")`.

## Generating Authorization Header

Once you have a `PowerAuthToken` object, use the following code to generate an authorization header:

```javascript
try {
    const header = await PowerAuthTokenStore.generateHeaderForToken(token.tokenName);
    // now you can attach that header to your HTTP request
} catch (e) {
    // token is no longer valid
}
```

## Removing Token From the Server

To remove the token from the server, you can use the following code:

```javascript
try {
    await PowerAuthTokenStore.removeAccessToken("MyToken");
    // token has been removed
} catch (e) {
    // handle error
}
```

## Removing Token Locally

To remove token locally, you can simply use the following code:

```javascript
try {
    // Remove just one token
    await PowerAuthTokenStore.removeLocalToken("MyToken");
    // Remove all local tokens
    await PowerAuthTokenStore.removeAllLocalTokens();
} catch (e) {
    // handle error
}
```

Note that by removing tokens locally, you will lose control of the tokens stored on the server.
