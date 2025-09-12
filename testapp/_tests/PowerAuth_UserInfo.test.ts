import { expect } from '../src/testbed';
import { TestWithActivation } from "./helpers/TestWithActivation";
import {
  PowerAuthActivation,
  PowerAuthAuthentication,
  PowerAuthError,
} from 'react-native-powerauth-mobile-sdk';
import {IntegrationHelper} from '../src/IntegrationUtils.ts';

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

    // activation creates an empty user info object, RN bridge wraps it in an allClaims empty directory
    const after = await this.sdk.getLastFetchedUserInfo();
    expect(after).toEqual({allClaims: {}});

    // fetching user info from sdk should return an empty allClaims object, no user info is persisted yet
    const userInfo = await this.sdk.fetchUserInfo();
    expect(userInfo).toEqual({allClaims: {}});

    // persist user info and fetch it again through SDK
    const userId = this.helper.userId ?? "1";
    const result = await this.helper.fillUserInfo(this.helper.userInfo(userId));
    expect(result.status).toBe("OK");

    const filledUser = await this.sdk.fetchUserInfo();
    expect(filledUser).toEqual(this.helper.userInfo(userId));
    const lastFilled = await this.sdk.getLastFetchedUserInfo();
    expect(filledUser).toEqual(lastFilled);
  }

  // Test case with a user data object passed from the createActivation SDK call.
  async testUserInfoCreateActivation() {
    // put user data into UDS using fillUserInfo (for a specific userId)
    const userId = IntegrationHelper.randomString(20);
    const expectedUserInfo = this.helper.userInfo(userId);

    const storeResult = await this.helper.fillUserInfo(expectedUserInfo as any);
    expect(storeResult.status).toBe("OK");

    // before activation, last fetched info should be undefined
    const before = await this.sdk.getLastFetchedUserInfo();
    expect(before).toBeUndefined();

    // can't use the helper to create activation here, because we need to get the user info object
    const createdActivation = await this.helper.createActivation(userId, true);
    const response = await this.sdk.createActivation(PowerAuthActivation.createWithActivationCode(createdActivation.activationCode, "tests"));
    await this.sdk.persistActivation(PowerAuthAuthentication.persistWithPassword(this.credentials.validPassword));

    expect(response).toBeDefined();
    const userInfoClaims = response.userInfoClaims;
    expect(userInfoClaims).toEqual(expectedUserInfo.allClaims);

    // after activation, implicit user info should be available immediately
    const after = await this.sdk.getLastFetchedUserInfo();
    expect(after).toEqual(expectedUserInfo);

    // fetching explicitly should return the same data
    const fetched = await this.sdk.fetchUserInfo();
    expect(fetched).toEqual(expectedUserInfo);
  }
}