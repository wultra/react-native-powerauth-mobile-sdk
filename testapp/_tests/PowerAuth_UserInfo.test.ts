import { expect } from '../src/testbed';
import { TestWithActivation } from "./helpers/TestWithActivation";
import { PowerAuthActivation, PowerAuthError } from 'react-native-powerauth-mobile-sdk';

export class PowerAuth_UserInfoTest extends TestWithActivation {
  shouldCreateActivationBeforeTest(): boolean {
    return false;
  }

  // Test of user info persistence and fetching
  async testUserInfoPersistence() {
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

  // Test with implicit user data in create activation flow
  async testUserInfoActivation() {
    // 1. put user data into UDS using fillUserInfo (for a specific userId)
    const userId = this.helper.constructor['randomString']
      ? (this.helper.constructor as any).randomString(20)
      : Math.random().toString(36).substring(2, 22);

    const expectedUserInfo = {
      allClaims: {
        subject: userId,
        name: `User ${userId}`,
        email: `${userId}@wultra.com`,
        address: {
          allClaims: {
            formatted: "Prague",
            country: "Czech Republic",
          },
        },
      },
    };

    const storeResult = await this.helper.fillUserInfo(expectedUserInfo as any);
    expect(storeResult.status).toBe("OK");

    // Before activation, last fetched info should be undefined
    const before = await this.sdk.getLastFetchedUserInfo();
    expect(before).toBeUndefined();

    // 2. create activation with user data (same userId as used for UDS)
    await this.helper.prepareActiveActivation(
      this.credentials.validPassword,
      userId,
      this.activateWithBiometrics()
    );

    // After activation, implicit user info should be available immediately
    const after = await this.sdk.getLastFetchedUserInfo();
    expect(after).toEqual(expectedUserInfo);

    // Fetching explicitly should return the same data
    const fetched = await this.sdk.fetchUserInfo();
    expect(fetched).toEqual(expectedUserInfo);
  }
}