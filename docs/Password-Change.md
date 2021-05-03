# Password Change

Since the device does not know the password and is unable to verify the password without the help of the server-side, you need to first call an endpoint that verifies a signature computed with the password. SDK offers two ways to do that.

## Change With an Automatic Validation

The safe but typically slower way is to use the following code:

```javascript
// Change password from "oldPassword" to "newPassword".
try {
    await PowerAuth.changePassword("oldPassword", "newPassword");
} catch (e) {
    console.log(`Change failed: ${e.code}`);
}
```

This method calls `/pa/v3/signature/validate` under the hood with a 2FA signature with provided original password to verify the password correctness.

## Change With a Manual Validation

However, using this method does not usually fit the typical UI workflow of a password change. The method may be used in cases where an old password and a new password are on a single screen, and therefore are both available at the same time. In most mobile apps, however, the user first visits a screen to enter an old password, and then (if the password is OK), the user proceeds to the two-screen flow of a new password setup (select password, confirm password). In other words, the workflow works like this:

1. Show a screen to enter an old password.
2. Check the old password on the server.
3. If the old password is OK, then let the user chose and confirm a new one.
4. Change the password by re-encrypting the activation data.

For this purpose, you can use the following code:

```javascript
// Ask for an old password
const oldPassword = "1234";

// Validate password on the server
try {
    const isValid = await PowerAuth.validatePassword(pass);
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
    await PowerAuth.unsafeChangePassword(oldPassword, newPassword);
    // password is changed
} catch (e) {
    // error
}
```

<!-- begin box warning -->
**Now, beware!** Since the device does not know the actual old password, you need to make sure that the old password is validated before you use it in `unsafeChangePassword`. In case you provide the wrong old password, it will be used to decrypt the original data, and these data will be encrypted using a new password. As a result, the activation data will be broken and irreversibly lost.
<!-- end -->

## Read Next

- [Biometry Setup](./Biometry-Setup.md)
