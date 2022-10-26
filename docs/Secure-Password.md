# Working with passwords securely

The `PowerAuthPassword` class implements safe storage for users' passwords. The class is using an underlying native object to store the user's password securely in the memory. The goal is to keep the user's password in the memory for as short as possible time. To achieve this, the native object implements the following precautions: 
 
- If it's constructed with `destroyOnUse` parameter set to `true` then the native password is automatically destroyed after it's used for the cryptographic operation.
 
- If it's constructed with `powerAuthInstanceId` then the native object will be destroyed after the `PowerAuth` class with the same identifier is deconfigured.
 
- If you leave the instance of `PowerAuthPassword` class as it is, then the native password is removed from the memory after 5 minutes of inactivity. The JavaScript object is still functional, so if you use any API function, then the native password is re-initialized, but the previous passphrase is lost. You can provide an optional `onAutomaticCleanup` function to the object's constructor to detect this situation.
 
- If you call any `PowerAuthPassword` method except `release()`, then the auto-cleanup timer is reset, so the native password will live for another 5 minutes.
 
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

In both ways you can alter the following parameters:

- `destroyOnUse` is by default `true` and the native password is destroyed automatically after it's used for the cryptographic operation. If you set `false`, then it's recommended to use `release()` method once the password is no longer needed.

- `onAutomaticCleanup` function is called when the password object detects that the native password was destroyed due to object's inactivity. See [Automatic cleanup](#automatic-cleanup) chapter for more details.

## Using password

React Native PowerAuth Mobile SDK allows you to use both strings and special password objects at input, so it’s up to you which way fits best for your purposes. For simplicity, this documentation is using strings for the passwords, but all code examples can be changed to utilize `PowerAuthPassword` object as well. For example, this is the modified code for [Password Change](Password-Change.md#change-with-an-automatic-validation):

```javascript
// Change password from "0123" to "3210".
try {
    const oldPassword = new PowerAuthPassword();
    await oldPassword.addCharacter('0');
    await oldPassword.addCharacter('1');
    await oldPassword.addCharacter('2');
    await oldPassword.addCharacter('3');
    
    const newPassword = new PowerAuthPassword();
    await newPassword.addCharacter(51);
    await newPassword.addCharacter(50);
    await newPassword.addCharacter(49);
    await newPassword.addCharacter(48);
    
    await powerAuth.changePassword(oldPassword, newPassword);
} catch (e) {
    console.log(`Change failed: ${e.code}`);
}
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

## Automatic cleanup

The following code explains how the automatic cleanup works:

```javascript
// Construct password and setup callback to print the cleanup event to the log.
const password = new PowerAuthPassword(false, () => {
    console.log('Automatic cleanup');
});

let length = await password.addCharacter(48);
console.log(`Length is ${length}`);         // prints 'Length is 1'

// Now release internal native object. Note that the callback is not called.
await password.release();                       

// By calling another API function the native password is restored, but the callback
// is not called, because we released the password manually.
password.addCharacter('💣');
let empty = await password.isEmpty();              
console.log(`empty is ${empty}`);           // prints 'empty is false'

// ... now sleep for 5+ minutes :)

empty = await password.isEmpty();           // prints 'Automatic cleanup'  
console.log(`empty is ${empty}`);           // prints 'empty is true'
```

## Read Next

- [Biometry Setup](Biometry-Setup.md)