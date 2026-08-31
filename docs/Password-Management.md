# Password Management

## Password Change

Since the device does not know the password and cannot verify it without the server, password changes use a two-step flow.

### Two-Step Password Change

First validate the current password:

```javascript
let changeData;
try {
    changeData = await powerAuth.beginPasswordChange("oldPassword");
} catch (e) {
    // Password validation or the network request failed.
    return;
}
```

After the user chooses and confirms the new password, finish the operation:

```javascript
try {
    await powerAuth.finishPasswordChange("newPassword", changeData);
} catch (e) {
    // The change failed. The change data has already been released.
}
```

`finishPasswordChange()` always consumes and releases the opaque
`PowerAuthPasswordChangeData`. If the flow is abandoned after the first step, release it explicitly:

```javascript
await changeData.release();
```

<!-- begin box warning -->
Do not use password validation before calculating an authentication code. Handle an incorrect
password in the authenticated operation and then use `fetchActivationStatus()` to check the
remaining attempts or whether the activation is blocked.
<!-- end -->

## Deprecated Compatibility APIs

The one-step `changePassword()`, `validatePassword()`, `changePasswordUnsafe()`, and
`unsafeChangePassword()` methods remain available for source compatibility but are deprecated.
Use `beginPasswordChange()` and `finishPasswordChange()` for new code.

<!-- begin box warning -->
The unsafe password-change methods do not verify the old password. Using an incorrect old
password corrupts the local activation data and makes it irreversibly unusable.
<!-- end -->

## Read Next

- [Working with passwords securely](Secure-Password.md)
