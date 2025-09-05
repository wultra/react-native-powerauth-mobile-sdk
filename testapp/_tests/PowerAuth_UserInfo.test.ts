import { expect } from '../src/testbed';
import { TestWithActivation } from "./helpers/TestWithActivation";
import { PowerAuthError } from 'react-native-powerauth-mobile-sdk';

export class PowerAuth_UserInfoTest extends TestWithActivation {
  shouldCreateActivationBeforeTest(): boolean {
    return false;
  }

  // Test for create activation flow
  async testUserInfoActivation() {
    // calling fetchUserInfo before activation throws error
    try {
      await this.sdk.fetchUserInfo();
    } catch (error) {
      const err = error as PowerAuthError;
      expect(err.code).toBe("MISSING_ACTIVATION");
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

    // activation creates empty user info object, RN bridge wraps it in a allClaims empty directory
    const after = await this.sdk.getLastFetchedUserInfo();
    expect(after).toEqual({allClaims: {}});

    // fetch user info from sdk, it should return empty allClaims object, because no user info is persisted yet
    const userInfo = await this.sdk.fetchUserInfo();
    expect(userInfo).toEqual({allClaims: {}});

    // persist user info and fetch it again through SDK
    const result = await this.helper.fillUserInfo(this.helper.userInfo);
    expect(result.status).toBe("OK");

    const filledUser = await this.sdk.fetchUserInfo();
    expect(filledUser).toEqual(this.helper.userInfo);
    const lastFilled = await this.sdk.getLastFetchedUserInfo();
    expect(filledUser).toEqual(lastFilled);
  }
}