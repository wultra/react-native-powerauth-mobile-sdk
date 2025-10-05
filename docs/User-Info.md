# Obtaining Users' Claims

If supported by the server, the PowerAuth Mobile JS SDK can provide additional information asserted about a person associated with an activation. This information can be obtained either during the activation process or at a later time.

Here is an example of how to process user information during activation:

```typescript
try {
    const activationResult = await powerAuth.createActivation(activation);
    if (activationResult.userInfo != null) {
        // User information received.
        // At this moment, the object is also available at
        // powerAuth.lastFetchedUserInfo
    }
} catch (e) {
    // Error handling
}
```

To fetch the user information at a later time, use the following code:

```typescript
const userInfo = await powerAuth.getLastFetchedUserInfo();
if (userInfo != null) {
    // User information is already available
} else {
    try {
        const userInfo = await powerAuth.fetchUserInfo();
        // process the userInfo
    } catch (e) {
        // failed to fetch user info
    }
}
```

The obtained `PowerAuthUserInfo` object contains `allClaims` object with the following optional properties:

| Property                | Type     | Description                                                                  |
|-------------------------|----------|------------------------------------------------------------------------------|
| `subject`               | `String` | The user's identifier                                                        |
| `name`                  | `String` | The full name of the user                                                    |
| `givenName`             | `String` | The given or first name of the user                                          |
| `familyName`            | `String` | The surname(s) or last name(s) of the user                                   |
| `middleName`            | `String` | The middle name of the user                                                  |
| `nickname`              | `String` | The casual name of the user                                                  |
| `preferredUsername`     | `String` | The username by which the user wants to be referred to at the application    |
| `profileUrl`            | `String` | The URL of the profile page for the user                                     |
| `pictureUrl`            | `String` | The URL of the profile picture for the user                                  |
| `websiteUrl`            | `String` | The URL of the user's web page or blog                                       |
| `email`                 | `String` | The user's preferred email address                                           |
| `isEmailVerified`       | `bool`| True if the user's email address has been verified, else false<sup>1</sup>   |
| `phoneNumber`           | `String` | The user's preferred telephone number<sup>2</sup>                            |
| `isPhoneNumberVerified` | `bool`| True if the user's telephone number has been verified, else false<sup>1</sup> |
| `gender`                | `String` | The user's gender                                                            |
| `birthdate`             | `DateTime`   | The user's birthday                                                          |
| `zoneInfo`              | `String` | The user's time zone, e.g., `Europe/Paris` or `America/Los_Angeles`          |
| `locale`                | `String` | The end-users locale, represented as a BCP47 language tag<sup>3</sup>        |
| `userAddress`           | `PowerAuthUserAddress` | The user's preferred postal address                                          |
| `updatedAt`             | `DateTime`   | The time the user's information was last updated                             |
| `allClaims`             | `Map` | The full collection of claims received from the server                       |

If the `address` is provided, then `PowerAuthUserAddress` object contains `allClaims` object with the following properties:

| Property                | Type     | Description |
|-------------------------|----------|-------------|
| `formatted`             | `String` | The full mailing address, with multiple lines if necessary |
| `street`                | `String` | The street address component, which may include house number, street name, post office box, and other multi-line information |
| `locality`              | `String` | City or locality component |
| `region`                | `String` | State, province, prefecture or region component |
| `postalCode`            | `String` | Zip code or postal code component |
| `country`               | `String` | Country name component |
| `allClaims`             | `Map` | Full collection of claims received from the server |

> Notes:
> 1. Value is false also when a claim is not present in the `allClaims` dictionary
> 2. Phone number is typically in E.164 format, for example `+1 (425) 555-1212` or `+56 (2) 687 2400`
> 3. This typically consists of an ISO 639-1 Alpha-2 language code in lowercase and an ISO 3166-1 Alpha-2 country code in uppercase, separated by a hyphen. For example, `en-US` or `fr-CA`

<!-- begin box info -->
Be aware that all properties in the `PowerAuthUserInfo` and `PowerAuthUserAddress` objects are optional, and the availability of information depends on the actual implementation on the server.
<!-- end -->

## Read Next

- [Time Synchronization](Time-Synchronization.md)