import { expect } from "../src/testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";
import {
    PowerAuthActivation,
    PowerAuthAuthentication,
    PowerAuthError,
} from "react-native-powerauth-mobile-sdk";
import { IntegrationHelper } from "../src/IntegrationUtils";

export class PowerAuth_UserInfoTest extends TestWithActivation {
    shouldCreateActivationBeforeTest(): boolean {
        return false;
    }

    // Test case with explicit user data fetching from SDK.
    async testFetchUserInfo() {
        // calling fetchUserInfo before activation throws an error
        try {
            await this.sdk.fetchUserInfo();
        } catch (error) {
            const err = error as PowerAuthError;
            // iOS SDK returns MISSING_ACTIVATION, Android returns INVALID_ACTIVATION_STATE
            expect(["INVALID_ACTIVATION_STATE", "MISSING_ACTIVATION"]).toContain(err.code);
        }

        // before activation sdk returns nil for last fetched user info
        const before = await this.sdk.getLastFetchedUserInfo();
        expect(before).toBeUndefined();

        // create activation
        await this.helper.prepareActiveActivation(
            this.credentials.validPassword,
            undefined,
            this.activateWithBiometrics()
        );

        // we should have some userID generated at this point
        expect(this.helper.userId).toBeDefined();

        // activation creates an empty user info object, RN bridge wraps it in an allClaims empty directory
        const after = await this.sdk.getLastFetchedUserInfo();
        expect(after).toEqual({allClaims: {}});

        // fetching user info from sdk should return an empty allClaims object, no user info is persisted yet
        const userInfo = await this.sdk.fetchUserInfo();
        expect(userInfo).toEqual({allClaims: {}});

        // persist user info and fetch it again through SDK
        const userId = this.helper.userId ?? "1";
        const expectedUser = this.helper.userInfo(userId);

        const result = await this.helper.fillUserInfo(expectedUser);
        expect(result.status).toBe("OK");

        const filledUser = await this.sdk.fetchUserInfo();
        expect(filledUser?.subject).toEqual(expectedUser.subject)
        expect(filledUser?.name).toEqual(expectedUser.name)

        expect(filledUser?.givenName).toEqual(expectedUser.givenName)
        expect(filledUser?.familyName).toEqual(expectedUser.familyName)
        expect(filledUser?.middleName).toEqual(expectedUser.middleName)
        expect(filledUser?.nickname).toEqual(expectedUser.nickname)
        expect(filledUser?.preferredUsername).toEqual(expectedUser.preferredUsername)
        expect(filledUser?.profileUrl).toEqual(expectedUser.profileUrl)
        expect(filledUser?.pictureUrl).toEqual(expectedUser.pictureUrl)
        expect(filledUser?.websiteUrl).toEqual(expectedUser.websiteUrl)
        expect(filledUser?.email).toEqual(expectedUser.email)
        expect(filledUser?.isEmailVerified).toEqual(expectedUser.isEmailVerified)
        expect(filledUser?.phoneNumber).toEqual(expectedUser.phoneNumber)
        expect(filledUser?.isPhoneNumberVerified).toEqual(expectedUser.isPhoneNumberVerified)
        expect(filledUser?.gender).toEqual(expectedUser.gender)
        expect(filledUser?.birthdate).toEqual(expectedUser.birthdate)
        expect(filledUser?.zoneInfo).toEqual(expectedUser.zoneInfo)
        expect(filledUser?.locale).toEqual(expectedUser.locale)
        expect(filledUser?.updatedAt?.toISOString()).toEqual(expectedUser.updatedAt?.toISOString())
        // compare address
        expect(filledUser?.userAddress?.formatted).toEqual(expectedUser.userAddress?.formatted)
        expect(filledUser?.userAddress?.street).toEqual(expectedUser.userAddress?.street)
        expect(filledUser?.userAddress?.locality).toEqual(expectedUser.userAddress?.locality)
        expect(filledUser?.userAddress?.region).toEqual(expectedUser.userAddress?.region)
        expect(filledUser?.userAddress?.region).toEqual(expectedUser.userAddress?.region)
        expect(filledUser?.userAddress?.postalCode).toEqual(expectedUser.userAddress?.postalCode)
        expect(filledUser?.userAddress?.country).toEqual(expectedUser.userAddress?.country)

        const lastFilled = await this.sdk.getLastFetchedUserInfo();
        expect(filledUser?.subject).toEqual(lastFilled?.subject);
    }

    // Test case with a user data object passed from the createActivation SDK call.
    async testUserInfoCreateActivation() {
        // put user data into UDS using fillUserInfo (for a specific userId)
        const userId = IntegrationHelper.randomString(20);
        const expectedUserInfo = this.helper.userInfo(userId);

        const storeResult = await this.helper.fillUserInfo(expectedUserInfo);
        expect(storeResult.status).toBe("OK");

        // before activation, last fetched info should be undefined
        const before = await this.sdk.getLastFetchedUserInfo();
        expect(before).toBeUndefined();

        // can't use the helper to create activation here, because we need to get the user info object
        const createdActivation = await this.helper.createActivation(userId, true);
        const response = await this.sdk.createActivation(PowerAuthActivation.createWithActivationCode(createdActivation.activationCode, "tests"));
        await this.sdk.persistActivation(PowerAuthAuthentication.persistWithPassword(this.credentials.validPassword));

        expect(response).toBeDefined();
        expect(response.userInfo?.subject).toEqual(expectedUserInfo.subject);
        expect(response.userInfo?.email).toEqual(expectedUserInfo.email);

        // after activation, implicit user info should be available immediately
        const after = await this.sdk.getLastFetchedUserInfo();
        expect(after?.subject).toEqual(expectedUserInfo.subject);
        expect(after?.email).toEqual(expectedUserInfo.email);
        expect(after?.userAddress?.formatted).toEqual(expectedUserInfo.userAddress?.formatted);
        expect(after?.userAddress?.street).toEqual(expectedUserInfo.userAddress?.street);

        // fetching explicitly should return the same data
        const fetched = await this.sdk.fetchUserInfo();
        expect(fetched?.subject).toEqual(expectedUserInfo.subject);
    }
}