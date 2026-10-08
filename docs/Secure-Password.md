# Working with passwords securely

The `PowerAuthPassword` class implements safe storage for users' passwords. The class is using an underlying native object to store the user's password securely in the memory. The goal is to keep the user's password in the memory for as short as possible time. To achieve this, the native object implements the following precautions: 

- The native password is created when you first use the object. Concurrent calls share the same native password.

- If it's constructed with `destroyOnUse` option set to `true` then the native password is automatically destroyed after it's used for the cryptographic operation. This is the default setting.
 
- If it's constructed with `powerAuthInstanceId` then the native object will be destroyed after the `PowerAuth` class with the same identifier is deconfigured.
 
- If you leave the instance of `PowerAuthPassword` class as it is, then the native password is removed from the memory after 5 minutes of inactivity.
 
- If you call any `PowerAuthPassword` method except `release()`, then the auto-cleanup timer is reset, so the native password will live for another 5 minutes.

- A call to `release()` destroys the native password immediately.

After the native password is destroyed or released, any other use of the object reports `PowerAuthErrorCode.INVALID_NATIVE_OBJECT`. The object is not restored, so create a new `PowerAuthPassword` object when you need the password again.
 
Be aware that this class is effective only if you're using a numeric PIN for the passphrase although its API accepts full Unicode code point at the input. This is because it's quite simple to re-implement the PIN keyboard with your custom UI components. On opposite to that, for the full alphanumeric input, you need to use the system keyboard, which already leaves traces of the user's password in memory.

If you're interested in more detail about why the passwords should be protected in the memory, then you can follow the [Working with passwords securely](https://github.com/wultra/powerauth-mobile-sdk/blob/develop/docs/PowerAuth-SDK-for-iOS.md#working-with-passwords-securely) chapter from the PowerAuth mobile SDK.

## Instantiating password

You have two options how to instantiate the password object:

1. Create your own instance:
   ```javascript
   const password = new PowerAuthPassword();
   ```
   Such password is not bound to any PowerAuth instance, so it will not be destroyed together with the `PowerAuth` instance.

2. Create with using `PowerAuth` object:
   ```javascript
   const password = powerAuth.createPassword();
   ```
   Such password will be destroyed after the `PowerAuth` instance is deconfigured.

In both ways you can alter the `destroyOnUse` option. It's by default `true` and the native password is destroyed automatically after it's used for the cryptographic operation. If you set `false`, then it's recommended to use `release()` method once the password is no longer needed.

```javascript
const password1 = new PowerAuthPassword({ destroyOnUse: false });
const password2 = new PowerAuthPassword({ destroyOnUse: false, powerAuthInstanceId: powerAuth.instanceId });
const password3 = powerAuth.createPassword(false);
```

## Using password

PowerAuth Mobile JS SDK allows you to use both strings and special password objects at input, so it’s up to you which way fits best for your purposes. For simplicity, this documentation is using strings for the passwords, but all code examples can be changed to utilize `PowerAuthPassword` object as well. For example, this is the modified code for the [two-step password change](Password-Management.md#two-step-password-change):

```javascript
// Change password from "0123" to "3210".
let changeData;
try {
    const oldPassword = new PowerAuthPassword();
    await oldPassword.addCharacter('0');
    await oldPassword.addCharacter('1');
    await oldPassword.addCharacter('2');
    await oldPassword.addCharacter('3');

    changeData = await powerAuth.beginPasswordChange(oldPassword);

    const newPassword = new PowerAuthPassword();
    await newPassword.addCharacter(51);
    await newPassword.addCharacter(50);
    await newPassword.addCharacter(49);
    await newPassword.addCharacter(48);

    await powerAuth.finishPasswordChange(newPassword, changeData);
} catch (e) {
    console.log(`Change failed: ${e.code}`);
} finally {
    // Safe after finishPasswordChange(), which already consumes the data.
    await changeData?.release();
}
```

You can also create `PowerAuthPassword` from an already obtained string.

<!-- begin box warning -->
Note that this is not recommended. Do this only when you retrieve the whole string from a text input.
<!-- end -->

```javascript
const password = await PowerAuthPassword.fromString("1234")
// You can also pass the same options as to the constructor
const reusablePassword = await PowerAuthPassword.fromString("1234", { destroyOnUse: false })
```

## Adding or removing characters

```javascript
const password = new PowerAuthPassword();
let length = await password.length();
console.log(`length = ${length}`);          // length = 0

length = await password.addCharacter('A');
length = await password.addCharacter('B');
console.log(`length = ${length}`);          // length = 2

length = await password.insertCharacter(48, 2);
length = await password.insertCharacter(49, 2);
console.log(`length = ${length}`);          // length = 4

length = await password.removeLastCharacter();
length = await password.removeCharacterAt(0);
console.log(`length = ${length}`);          // length = 2

await password.clear();
let empty = await password.isEmpty();
console.log(`empty = ${empty}`);            // empty = true
```

## Compare two passwords

```javascript
const p1 = new PowerAuthPassword();
const p2 = new PowerAuthPassword();
const p3 = new PowerAuthPassword();

await p1.addCharacter('0');
await p1.addCharacter('A');

await p2.addCharacter(48);
await p2.addCharacter(65);

const p1p2equal = await p1.isEqualTo(p2);
const p2p3equal = await p2.isEqualTo(p3);
console.log(`p1 == p2 is ${p1p2equal}`);    // p1 == p2 is true
console.log(`p2 == p3 is ${p2p3equal}`);    // p2 == p3 is false
```

## Releasing password

The following code explains how the native password lifetime works:

```javascript
const password = new PowerAuthPassword({ destroyOnUse: false });

let length = await password.addCharacter(48);
console.log(`Length is ${length}`);         // prints 'Length is 1'

// Release the native password.
await password.release();

try {
    // Released password is not restored.
    await password.isEmpty();
} catch (e) {
    console.log(e.code);                    // prints 'INVALID_NATIVE_OBJECT'
}
```

The same `INVALID_NATIVE_OBJECT` error is reported when the native password was destroyed after its use for the cryptographic operation, after 5 minutes of inactivity, or after the owning `PowerAuth` instance was deconfigured.

## Testing PIN strength

If password object contains digits only, then you can test the strength of stored PIN:

```javascript
try {
    const result = password.testPinStrength();
    if (result.shouldWarnUserAboutWeakPin) {
        // You should warn user about weak PIN.
        // You can also adjust warning message according to issues found in PIN.
        console.warn(`PIN is weak. Issues = ${JSON.stringify(result.issues)}`);
    }
} catch (e) {
    if (e.code === PowerAuthErrorCode.WRONG_PARAMETER) {
        // PIN is too short, or passowrd object contains other than digit characters.
    }
}
```

The PIN testing algorigthm is based on [Passphrase Meter](https://github.com/wultra/passphrase-meter) library.

## Read Next

- [Biometry Setup](Biometry-Setup.md)
