/*
 * Copyright 2025 Wultra s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * The `PowerAuthUserAddress` object contains address of end-user.
 * Definition of the object is based on the OpenID Connect specification.
 * link: https://openid.net/specs/openid-connect-core-1_0.html#AddressClaim
 */
export interface PowerAuthUserAddress {

    /** The full mailing address, with multiple lines if necessary */
    formatted?:	string
    /** The street address component, which may include house number, street name, post office box, and other multi-line information */
    street?: string
    /** City or locality component */
    locality?: string
    /** State, province, prefecture or region component */
    region?: string
    /** Zip code or postal code component */
    postalCode?: string
    /** Country name component */
    country?: string
    /** Contains a full collection of address-related claims received from the server. */
    allClaims?: Record<string, any>
}

/**
 * The `PowerAuthUserInfo` object contains additional information about the end-user.
 * Definition of the object is based on the OpenID Connect specification.
 * link: https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
 */
export interface PowerAuthUserInfo {

    /** The user’s identifier */
    subject?: string;
    /** The full name of the user */
    name?: string;
    /** The given or first name of the user */
    givenName?:	string;
    /** The surname(s) or last name(s) of the user */
    familyName?: string;
    /** The middle name of the user */
    middleName?: string;
    /** The casual name of the user */
    nickname?: string
    /** The username by which the user wants to be referred to at the application */
    preferredUsername?: string
    /** The URL of the profile page for the user */
    profileUrl?: string
    /** The URL of the profile picture for the user */
    pictureUrl?: string
    /** The URL of the user’s web page or blog */
    websiteUrl?: string
    /** The user’s preferred email address */
    email?: string
    /** True if the user’s email address has been verified, else false */
    isEmailVerified?: boolean
    /** The user’s preferred telephone number */
    phoneNumber?: string
    /** True if the user’s telephone number has been verified, else false */
    isPhoneNumberVerified?: boolean
    /** The user’s gender */
    gender?: string
    /** The user’s birthday */
    birthdate?: string
    /** The user’s time zone, e.g., Europe/Paris or America/Los_Angeles */
    zoneInfo?: string
    /** The end-users locale, represented as a BCP47 language tag */
    locale?: string
    /** The user’s preferred postal address */
    userAddress?: PowerAuthUserAddress
    /** The time the user’s information was last updated */
    updatedAt?: number

    /** Contains a full collection of claims received from the server. */
    allClaims?: Record<string, any>
}