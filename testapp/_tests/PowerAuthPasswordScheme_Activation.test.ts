//
// Copyright 2026 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { expect } from "mobile-testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";
import { CustomConfig } from "../src/IntegrationUtils";
import { PowerAuthActivation, PowerAuthAuthentication, PowerAuthKeychainConfiguration, PowerAuthPassword } from "react-native-powerauth-mobile-sdk";

/**
 * Verifies that a multi-code-point character (e.g. a ZWJ emoji sequence) typed via `addCharacter` into a
 * password bound to a `PowerAuth` instance (`powerAuth.createPassword()`) survives a real
 * persistActivation -> changePassword round trip against the server, as long as every password involved
 * stays bound to the same instance - the documented safe pattern from `Secure-Password.md`.
 *
 * Requires a reachable integration server (see E2E-Tests.md); not runnable as a plain unit test.
 */
export class PowerAuthPasswordScheme_ActivationTests extends TestWithActivation {

    // We need full control over the registration password (a bound PowerAuthPassword with a
    // multi-code-point character), so the default string-based activation setup is skipped.
    shouldCreateActivationBeforeTest(): boolean {
        return false
    }

    // Man, ZWJ, woman, ZWJ, girl - 5 code points, no NFC composition rule.
    familyEmoji = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}"

    async testCorrectedSchemeSurvivesChangePassword() {
        const sdk = this.sdk
        expect(await sdk.hasValidActivation()).toBe(false)

        const originalPassword = sdk.createPassword()
        await originalPassword.addCharacter('9')
        await originalPassword.addCharacter(this.familyEmoji)
        expect(await originalPassword.length()).toBe(6) // '9' + 5 code points of the emoji

        const detail = await this.helper.createActivation()
        await sdk.createActivation(PowerAuthActivation.createWithActivationCode(detail.activationCode, 'RN'))
        // hasValidActivation() is still false at this point, so persistActivation must resolve to the
        // corrected scheme and store all 6 code points.
        await sdk.persistActivation(PowerAuthAuthentication.persistWithPassword(originalPassword))
        await this.helper.commitActivation()
        expect(await sdk.hasValidActivation()).toBe(true)

        // Re-derive the same logical password via another bound PowerAuthPassword tied to the same
        // instance for the old-password check. If the corrected scheme weren't applied consistently
        // here, this would be rejected as an invalid old password even though the same characters
        // were typed both times.
        const oldPasswordForChange = sdk.createPassword()
        await oldPasswordForChange.addCharacter('9')
        await oldPasswordForChange.addCharacter(this.familyEmoji)

        const newPassword = sdk.createPassword()
        await newPassword.addCharacter(this.familyEmoji)
        await newPassword.addCharacter('!')

        await sdk.changePassword(oldPasswordForChange, newPassword)

        // Validate the new password was stored with all of its code points intact.
        const newPasswordCheck = sdk.createPassword()
        await newPasswordCheck.addCharacter(this.familyEmoji)
        await newPasswordCheck.addCharacter('!')
        await sdk.validatePassword(newPasswordCheck)
    }

    // Registering with an unbound `new PowerAuthPassword()` must NOT tag the activation as corrected -
    // its content was actually stored using the legacy (1st. code point only) scheme, since an unbound
    // password never has an instanceId to resolve a scheme with in the first place. If the activation
    // were (incorrectly) marked as corrected anyway, any later bound password check for the same
    // multi-code-point input would rebuild the full sequence and mismatch what's actually stored.
    async testOwnerlessPasswordSchemeDoesNotMarkActivationAsCorrected() {
        const sdk = this.sdk
        expect(await sdk.hasValidActivation()).toBe(false)

        const originalPassword = new PowerAuthPassword()
        await originalPassword.addCharacter(this.familyEmoji)
        expect(await originalPassword.length()).toBe(1) // Legacy scheme keeps only U+1F468 (man).

        const detail = await this.helper.createActivation()
        await sdk.createActivation(PowerAuthActivation.createWithActivationCode(detail.activationCode, 'RN'))
        await sdk.persistActivation(PowerAuthAuthentication.persistWithPassword(originalPassword))
        await this.helper.commitActivation()
        expect(await sdk.hasValidActivation()).toBe(true)

        // A bound password re-deriving the exact same input must resolve to the SAME legacy scheme
        // that was actually used at persist time, not corrected - the activation must not have been
        // marked as corrected by the unbound registration above.
        const passwordCheck = sdk.createPassword()
        await passwordCheck.addCharacter(this.familyEmoji)
        expect(await passwordCheck.length()).toBe(1)

        await sdk.validatePassword(passwordCheck)
    }
}

/**
 * Smoke test for `PACPS_UserDefaultsForSdk` (iOS) - the marker read/write must still round-trip
 * correctly when a custom `userDefaultsSuiteName` is configured (as Activation Sharing would set up),
 * instead of crashing or silently losing the marker.
 *
 * This can't prove the marker actually lives in that suite rather than falling back to
 * `standardUserDefaults` - a same-process round trip can't tell the two apart, since both read and
 * write go through the same resolution. Proving real cross-process sharing would need a second app/
 * extension target with real App Group entitlements, which this test suite doesn't have.
 *
 * `userDefaultsSuiteName` is iOS-only and has no effect on Android; the test still runs there as a
 * harmless smoke test.
 */
export class PowerAuthPasswordSchemeSharedStorage_ActivationTests extends TestWithActivation {

    shouldCreateActivationBeforeTest(): boolean {
        return false
    }

    provideCustomConfig(): CustomConfig {
        const keychainConfiguration = new PowerAuthKeychainConfiguration()
        keychainConfiguration.userDefaultsSuiteName = "com.wultra.powerauth.tests.passwordSchemeSharedSuite"
        return { keychainConfiguration }
    }

    // Man, ZWJ, woman, ZWJ, girl - 5 code points, no NFC composition rule.
    familyEmoji = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}"

    async testCorrectedSchemeRoundTripsWithCustomUserDefaultsSuite() {
        const sdk = this.sdk
        expect(await sdk.hasValidActivation()).toBe(false)

        const originalPassword = sdk.createPassword()
        await originalPassword.addCharacter(this.familyEmoji)
        expect(await originalPassword.length()).toBe(5)

        const detail = await this.helper.createActivation()
        await sdk.createActivation(PowerAuthActivation.createWithActivationCode(detail.activationCode, 'RN'))
        await sdk.persistActivation(PowerAuthAuthentication.persistWithPassword(originalPassword))
        await this.helper.commitActivation()
        expect(await sdk.hasValidActivation()).toBe(true)

        const passwordCheck = sdk.createPassword()
        await passwordCheck.addCharacter(this.familyEmoji)
        expect(await passwordCheck.length()).toBe(5)

        await sdk.validatePassword(passwordCheck)
    }
}
