# Password Management

## Password Change

Since the device does not know the password and is unable to verify the password without the help of the server-side, you need to first call an endpoint that verifies a signature computed with the password. SDK offers two ways to do that.

### Password Change With an Automatic Validation

The safe but typically slower way is to use the following code:

```javascript
// Change password from "oldPassword" to "newPassword".
try {
    await powerAuth.changePassword("oldPassword", "newPassword");
} catch (e) {
    console.log(`Change failed: ${e.code}`);
}
```

This method calls `/pa/v3/signature/validate` under the hood with a 2FA signature with the provided original password to verify the password correctness.

### Password Change With a Manual Validation

However, using this method does not usually fit the typical UI workflow of a password change. The method may be used in cases where an old password and a new password are on a single screen, and therefore are both available at the same time. In most mobile apps, however, the user first visits a screen to enter an old password, and then (if the password is OK), the user proceeds to the two-screen flow of a new password setup (select password, confirm password). In other words, the workflow works like this:

1. Show a screen to enter an old password.
2. Check the old password on the server.
3. If the old password is OK, then let the user choose and confirm a new one.
4. Change the password by re-encrypting the activation data.

For this purpose, you can use the following code:

```javascript
// Ask for an old password
const oldPassword = "1234";

// Validate password on the server
try {
    await powerAuth.validatePassword(oldPassword);
    // Proceed to the new password setup
} catch (e) {
    // Retry entering an old password
    return;
}

// ...

// Ask for new password
const newPassword = "2468";

// Change the password locally
try {
    await powerAuth.unsafeChangePassword(oldPassword, newPassword);
    // password is changed
} catch (e) {
    // error
}
```

<!-- begin box warning -->
**Now, beware!** Since the device does not know the actual old password, you need to make sure that the old password is validated before you use it in `unsafeChangePassword`. In case you provide the wrong old password, it will be used to decrypt the original data, and this data will be encrypted using a new password. As a result, the activation data will be broken and irreversibly lost.
<!-- end -->

## Password Validation

You can validate a password by calling the `validatePassword` method.

```javascript
// Ask for a password
const password = "1234";

// Validate password on the server
try {
    await powerAuth.validatePassword(password);
    // password valid
} catch (e) {
    // password invalid or other error (networking fail, for example)
    return;
}
```

<!-- begin box warning -->
Note that validating user password **should not be done** in situation that precedes the signature calculation, as it's not needed.
If a user enters a wrong PIN should be handled in the calculation call itself and then verified via the `fetchActivationStatus` call.

Example where validation is **not needed**:

1. Call `requestSignature` with a wrong password
2. The call will fail with the `AUTHENTICATION_ERROR` error
3. This means most likely the user entered the wrong password
4. Call `fetchActivationStatus` to verify how many attempts are left or if the activation is blocked.
<!-- end -->

## Read Next

- [Working with passwords securely](Secure-Password.md)
