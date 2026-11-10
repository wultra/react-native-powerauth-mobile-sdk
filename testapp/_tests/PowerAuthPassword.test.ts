//
// Copyright 2022 Wultra s.r.o.
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

import { PowerAuth, PowerAuthAlgorithm, PowerAuthErrorCode, PowerAuthPassword } from "react-native-powerauth-mobile-sdk";
import { TestSuite, expect } from "mobile-testbed";
import { createE2ePowerAuthConfiguration } from "../src/IntegrationUtils";
import { Register } from "./helpers/NativeObjectRegister";
import { importPassword } from "./helpers/PasswordHelper";

async function objectIdOf(password: PowerAuthPassword): Promise<string> {
    return (await password.toRawPassword()).objectId!
}

export class PowerAuthPasswordTests extends TestSuite {

    cleanup = new Array<any>()

    async beforeAll() {
        await super.beforeAll()
        // Set very short cleanup period
        await Register.setCleanupPeriod(100)
    }

    async afterAll() {
        await super.afterAll()
        // Set back the default period
        await Register.setCleanupPeriod(0)
    }
    
    async beforeEach(): Promise<void> {
        await super.beforeEach()
        this.cleanup = new Array<any>()
    }

    async afterEach(): Promise<void> {
        await super.afterEach()
        // Just to be sure, release all allocated objects from the memory
        for (const i in this.cleanup) {
            const p = this.cleanup[i]
            if (p instanceof PowerAuthPassword) {
                await p.release()
            } else if (p instanceof PowerAuth) {
                await p.deconfigure()
            }
        }
    }

    async testAddCodePoints() {
        const p1 = new PowerAuthPassword()
        const p2 = new PowerAuthPassword()
        const p3 = await importPassword('0123')
        const pEmpty = new PowerAuthPassword()
        this.cleanup.push(p1, p2, p3, pEmpty)

        expect(await p1.isEmpty()).toBe(true)
        expect(await p2.isEmpty()).toBe(true)
        expect(await p1.isEqualTo(pEmpty)).toBe(true)
        expect(await p2.isEqualTo(pEmpty)).toBe(true)
        expect(await p3.isEqualTo(pEmpty)).toBe(false)

        expect(await p1.addCodePoint(48)).toBe(1)
        expect(await p2.addCodePoint(48)).toBe(1)
        expect(await p1.isEqualTo(pEmpty)).toBe(false)
        expect(await p2.isEqualTo(pEmpty)).toBe(false)
        expect(await p1.isEmpty()).toBe(false)
        expect(await p2.isEmpty()).toBe(false)

        expect(await p1.addCodePoint(49)).toBe(2)
        expect(await p2.addCodePoint(49)).toBe(2)
        expect(await p1.addCodePoint(50)).toBe(3)
        expect(await p2.addCodePoint(50)).toBe(3)
        expect(await p1.addCodePoint(51)).toBe(4)
        expect(await p2.addCodePoint(51)).toBe(4)

        await expect(async () => p1.addCodePoint(0x110000)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})

        expect(await p1.isEqualTo(p3)).toBe(true)
        expect(await p2.isEqualTo(p3)).toBe(true)
        expect(await p1.isEqualTo(p2)).toBe(true)
        
        p1.clear()
        p2.clear()
        expect(await p1.isEqualTo(pEmpty)).toBe(true)
        expect(await p2.isEqualTo(pEmpty)).toBe(true)
    }

    async testRemoveCodePoints() {
        const p1 = await importPassword('Sk💀Ll')
        const t1 = await importPassword('k💀Ll')
        const t2 = await importPassword('k💀L')
        const t3 = await importPassword('kL')
        const t4 = await importPassword('k')
        this.cleanup.push(p1, t1, t2, t3, t4)

        await expect(async () => p1.removeCodePointAt(-1)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => p1.removeCodePointAt(5)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})

        expect(await p1.removeCodePointAt(0)).toBe(4)
        expect(await p1.isEqualTo(t1)).toBe(true)
        expect(await p1.removeLastCodePoint()).toBe(3)
        expect(await p1.isEqualTo(t2)).toBe(true)
        expect(await p1.removeCodePointAt(1)).toBe(2)
        expect(await p1.isEqualTo(t3)).toBe(true)
        expect(await p1.removeCodePointAt(1)).toBe(1)
        expect(await p1.isEqualTo(t4)).toBe(true)
        expect(await p1.removeCodePointAt(0)).toBe(0)
        expect(await p1.length()).toBe(0)
        // Pop last should not fail
        expect(await p1.removeLastCodePoint()).toBe(0)

        await expect(async () => p1.removeCodePointAt(0)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
    }

    async testInsertCodePoints() {
        const p1 = new PowerAuthPassword()
        const p2 = await importPassword('Sk💀ll')
        this.cleanup.push(p1, p2)

        expect(await p1.insertCodePoint(108, 0)).toBe(1)
        expect(await p1.insertCodePoint(108, 1)).toBe(2)
        expect(await p1.insertCodePoint(83, 0)).toBe(3)
        expect(await p1.insertCodePoint(107, 1)).toBe(4)
        expect(await p1.insertCodePoint(0x1F480, 2)).toBe(5)

        await expect(async () => p1.insertCodePoint(88, -1)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => p1.insertCodePoint(88, 6)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => p1.insertCodePoint(0x110000, 0)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})

        expect(await p1.isEqualTo(p2)).toBe(true)
    }

    async testInvalidPositions() {
        const p1 = await importPassword('abc')
        const expected = await importPassword('abc')
        this.cleanup.push(p1, expected)

        // Includes values that native code would truncate, convert to 0 or wrap into a valid position.
        const invalidPositions = [1.5, 0.5, NaN, Infinity, -Infinity, 0x100000000, 0x100000001, 1e20, -1e20]
        for (const position of invalidPositions) {
            await expect(async () => p1.insertCodePoint(88, position)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
            await expect(async () => p1.removeCodePointAt(position)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        }
        await expect(async () => p1.removeCodePointAt('0' as unknown as number)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        expect(await p1.isEqualTo(expected)).toBe(true)
    }

    async testMultiCodePointPositions() {
        // 👍🏽 is one visible character made of two code points, so it occupies two positions.
        const p1 = await importPassword('ab')
        const expected = await importPassword('a👍🏽b')
        const withoutModifier = await importPassword('a👍b')
        this.cleanup.push(p1, expected, withoutModifier)

        expect(await p1.insertCodePoint(0x1F44D, 1)).toBe(3)
        expect(await p1.insertCodePoint(0x1F3FD, 2)).toBe(4)
        expect(await p1.isEqualTo(expected)).toBe(true)

        expect(await p1.removeCodePointAt(2)).toBe(3)
        expect(await p1.isEqualTo(withoutModifier)).toBe(true)
    }

    async testUnicode() {
        const p1 = await importPassword('★🤣🤫🪘')
        const p2 = await importPassword('Sk💀ll')
        // The same visible 'é' as one precomposed code point and as 'e' with a combining accent
        const p3 = await importPassword('\u00E9')
        const p4 = new PowerAuthPassword()
        const p5 = await importPassword('e\u0301')
        this.cleanup.push(p1, p2, p3, p4, p5)
        
        expect(await p1.length()).toBe(4)
        expect(await p2.length()).toBe(5)

        // Passwords are compared by code points, so the app is responsible for a consistent input
        expect(await p3.length()).toBe(1)
        expect(await p5.length()).toBe(2)
        expect(await p3.isEqualTo(p5)).toBe(false)

        await p4.addCodePoint(0x2605)
        await p4.addCodePoint(0x1F923)
        await p4.addCodePoint(0x1F92B)
        await p4.addCodePoint(0x1FA98)

        expect(await p4.length()).toBe(4)
        expect(await p4.isEqualTo(p1)).toBe(true)
    }

    async testAutomaticCleanupInvalidatesPassword() {
        const p1 = new PowerAuthPassword({ destroyOnUse: false, autoReleaseTimeMillis: 100 })
        const p2 = new PowerAuthPassword({ destroyOnUse: false, autoReleaseTimeMillis: 100 })
        this.cleanup.push(p1, p2)

        // We have to call at least some function to create underlying native object
        expect(await p1.isEmpty()).toBe(true)
        expect(await p2.length()).toBe(0)
        const id1 = await objectIdOf(p1)
        const id2 = await objectIdOf(p2)

        // Wait for 50ms
        await this.sleep(50)
        // Both passwords should exist now
        expect(await Register.findObject(id1, 'password')).toBe(true)
        expect(await Register.findObject(id2, 'password')).toBe(true)
        // Access 1st password, to extend it's lifetime
        await p1.addCodePoint(48)
        // Wait for another 50ms, p2 should be released now
        await this.sleep(50)

        expect(await Register.findObject(id1, 'password')).toBe(true)
        expect(await Register.findObject(id2, 'password')).toBe(false)
        // Expired password is not recreated
        await expect(async () => p2.isEmpty()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p2.addCodePoint(48)).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        expect(await objectIdOf(p2)).toBe(id2)
        await expect(async () => p1.isEqualTo(p2)).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        // p1 is still valid
        expect(await p1.length()).toBe(1)

        // Now sleep for another 150ms, so p1 will be released too
        await this.sleep(150)
        expect(await Register.findObject(id1, 'password')).toBe(false)
        await expect(async () => p1.isEmpty()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
    }

    async testReleaseAfterUse() {
        const p1 = new PowerAuthPassword({ destroyOnUse: true, autoReleaseTimeMillis: 100 })
        const p2 = new PowerAuthPassword({ autoReleaseTimeMillis: 100 })
        this.cleanup.push(p1, p2)

        await p1.addCodePoint(48)
        expect(await p1.isEmpty()).toBe(false)
        expect(await p2.isEmpty()).toBe(true)

        const id1 = await objectIdOf(p1)
        const id2 = await objectIdOf(p2)

        expect(await Register.useObject(id1, 'password')).toBe(true)
        expect(await Register.useObject(id2, 'password')).toBe(true)

        // Used passwords are not recreated
        await expect(async () => p1.isEmpty()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p2.isEmpty()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })

        expect(await Register.findObject(id1, 'password')).toBe(false)
        expect(await Register.findObject(id2, 'password')).toBe(false)
    }
    
    async testManualRelease() {
        const p1 = new PowerAuthPassword({ destroyOnUse: false, autoReleaseTimeMillis: 100 })
        const p2 = new PowerAuthPassword({ destroyOnUse: true, autoReleaseTimeMillis: 100 })
        this.cleanup.push(p1, p2)

        // Native objects are not created yet, so release does nothing and objects remain usable
        await p1.release()
        await p2.release()

        await p1.addCodePoint(48)
        expect(await p1.isEmpty()).toBe(false)
        expect(await p2.isEmpty()).toBe(true)

        const id1 = await objectIdOf(p1)
        const id2 = await objectIdOf(p2)

        // Now manually release passwords
        await p1.release()
        await p2.release()

        expect(await Register.findObject(id1, 'password')).toBe(false)
        expect(await Register.findObject(id2, 'password')).toBe(false)

        // Released passwords are not recreated
        await expect(async () => p1.addCodePoint(48)).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p2.isEmpty()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p1.toRawPassword()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p2.testPinStrength()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })

        // Released password is reported even if an argument is also invalid
        await expect(async () => p1.addCodePoint(-1)).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p1.addCodePoints(48 as unknown as string)).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p1.insertCodePoint(-1, -1)).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p1.removeCodePointAt(-1)).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })

        // Now release for multiple times, to make sure that function doesn't fail
        await p1.release()
        await p2.release()
        await p1.release()
        await p2.release()
    }

    async testConcurrentFirstUseCreatesOnePassword() {
        const powerAuth = await this.createConfiguredPowerAuth()
        const baseline = await Register.countObjects(powerAuth.instanceId)

        const p = powerAuth.createPassword(false)
        this.cleanup.push(p)
        const characters = [...'0123456789']
        const lengths = await Promise.all(characters.map(c => p.addCodePoint(c.codePointAt(0)!)))

        expect(lengths.join(',')).toBe('1,2,3,4,5,6,7,8,9,10')
        expect(await p.length()).toBe(characters.length)
        expect((await Register.countObjects(powerAuth.instanceId)).valid).toBe(baseline.valid + 1)

        const expected = await importPassword('0123456789', false)
        this.cleanup.push(expected)
        expect(await p.isEqualTo(expected)).toBe(true)

        await p.release()
        expect((await Register.countObjects(powerAuth.instanceId)).valid).toBe(baseline.valid)
    }

    async testReleaseDuringFirstUseReleasesPassword() {
        const powerAuth = await this.createConfiguredPowerAuth()
        const baseline = await Register.countObjects(powerAuth.instanceId)

        const p = powerAuth.createPassword(false)
        this.cleanup.push(p)
        // The first use starts native password creation and release is requested before it completes
        const add = p.addCodePoint(49)
        const release = p.release()

        await expect(async () => add).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await release
        expect((await Register.countObjects(powerAuth.instanceId)).valid).toBe(baseline.valid)
        await expect(async () => p.length()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        expect((await Register.countObjects(powerAuth.instanceId)).valid).toBe(baseline.valid)
    }

    async testLegacyConstructorArgumentsAreRejected() {
        const LegacyPassword = PowerAuthPassword as any
        await expect(async () => new LegacyPassword(false)).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => new LegacyPassword(null)).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => PowerAuthPassword.fromString('1234', false as any)).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        // Legacy calls with an undefined first argument must not silently drop the trailing owner
        const LegacyFromString = PowerAuthPassword.fromString as any
        await expect(async () => new LegacyPassword(undefined, undefined, 'owner')).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => new LegacyPassword({}, 'owner')).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        await expect(async () => LegacyFromString.call(PowerAuthPassword, '1234', undefined, undefined, 'owner')).toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        // Explicitly passing undefined options is still allowed
        const p1 = new PowerAuthPassword(undefined)
        const p2 = await PowerAuthPassword.fromString('1', undefined)
        this.cleanup.push(p1, p2)
        expect(await p1.isEmpty()).toBe(true)
        expect(await p2.length()).toBe(1)
    }

    getRandomId(): string {
        return 'instanceId_' + (Math.random() + 1).toString(36).substring(7)
    }

    getDummyConfiguration() {
        // Dummy values for PA configuration
        return createE2ePowerAuthConfiguration(
            'ARAVst+fkgOOT/U1gBr1qLMDEOTfEduuLUvbpOmTq7cI+skBAUEEVjKe+8yFg62GvhwU8eE3iEZZCOeNqtEyz2AXXs/yZewnmdETC8J2sNcw5NnIApYDUmBh2n+XRHize4EiVdetjQ==',
            'http://localhost/wrong',
            8,
            PowerAuthAlgorithm.LEGACY
        )
    }

    async createConfiguredPowerAuth(): Promise<PowerAuth> {
        const powerAuth = new PowerAuth(this.getRandomId())
        this.cleanup.push(powerAuth)
        await powerAuth.configure(this.getDummyConfiguration())
        return powerAuth
    }

    async testGlobalRelease() {
        const config = this.getDummyConfiguration()

        // Owner object represents an instance of PowerAuth class that typically owns various object types
        const powerAuthInstanceId = this.getRandomId()
        const powerAuth = new PowerAuth(powerAuthInstanceId)
        this.cleanup.push(powerAuth)

        // We can create passwords even in PA instance is not configured, but every call to password API will fail
        const p1 = powerAuth.createPassword(false)
        const p2 = powerAuth.createPassword(true)
        this.cleanup.push(p1, p2)
        expect(p1.powerAuthInstanceId).toBe(powerAuthInstanceId)
        expect(p2.powerAuthInstanceId).toBe(powerAuthInstanceId)
        expect(p1.destroyOnUse).toBe(false)
        expect(p2.destroyOnUse).toBe(true)

        // PA instance is not configured yet, so the underlying password cannot be created.
        await expect(async () => p1.addCodePoint(48)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED })
        await expect(async () => p2.removeLastCodePoint()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED })
        // Unconfigured instance is reported even if an argument is also invalid
        await expect(async () => p1.addCodePoint(-1)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED })
        await expect(async () => p1.addCodePoints(48 as unknown as string)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED })
        await expect(async () => p1.insertCodePoint(-1, -1)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED })
        await expect(async () => p2.removeCodePointAt(-1)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED })

        // Configure PA instance
        await powerAuth.configure(config)

        // Failed creation is retried, so everything should work as expected now
        await p1.addCodePoint(48)
        expect(await p1.isEmpty()).toBe(false)
        expect(await p2.isEmpty()).toBe(true)

        const id1 = await objectIdOf(p1)
        const id2 = await objectIdOf(p2)
        
        expect(await Register.findObject(id1, 'password')).toBe(true)
        expect(await Register.findObject(id2, 'password')).toBe(true)

        // Now deconfigure PA instance
        await powerAuth.deconfigure()
        // Both passwords should be released
        expect(await Register.findObject(id1, 'password')).toBe(false)
        expect(await Register.findObject(id2, 'password')).toBe(false)

        // Now any access to password leads to the error, because the native password no longer exists
        await expect(async () => p1.isEmpty()).toThrow({errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p2.length()).toThrow({errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })

        // Configure PA instance again
        await powerAuth.configure(config)

        // Old passwords are not recreated, but new password can be created
        await expect(async () => p1.isEmpty()).toThrow({errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        const p3 = powerAuth.createPassword()
        this.cleanup.push(p3)
        expect(await p3.isEmpty()).toBe(true)
    }

    async testFromString() {
        const passwordString = "Sk💀ll👍🏿" // 👍🏿 is a single visible character made of two code points
        const codepoints = [83, 107, 0x1F480, 108, 108, 0x1F44D, 0x1F3FF] // S k 💀 l l 👍 🏿

        const p1 = await PowerAuthPassword.fromString(passwordString)
        const p2 = new PowerAuthPassword()
        const p3 = new PowerAuthPassword()
        this.cleanup.push(p1, p2, p3)

        expect(await p2.addCodePoints(passwordString)).toBe(7)

        for (const cp of codepoints) {
            await p3.addCodePoint(cp)
        }

        expect(await p1.length()).toBe(7)
        expect(await p2.length()).toBe(7)
        expect(await p3.length()).toBe(7)
        expect(await p1.isEqualTo(p2)).toBe(true)
        expect(await p1.isEqualTo(p3)).toBe(true)
        expect(await p2.isEqualTo(p3)).toBe(true)

        // Removing the last code point removes only the skin tone modifier
        expect(await p1.removeLastCodePoint()).toBe(6)
        const p4 = await PowerAuthPassword.fromString("Sk💀ll👍")
        this.cleanup.push(p4)
        expect(await p1.isEqualTo(p4)).toBe(true)
    }

    async testInvalidCodePoints() {
        const p1 = new PowerAuthPassword()
        this.cleanup.push(p1)

        // Includes values that native code would wrap into a valid code point after its 32-bit conversion.
        const invalidCodePoints = [-1, 1.5, 0x110000, NaN, Infinity, -Infinity, 0x100000041, -0xFFFFFFBF, 1e20, -1e20]
        for (const cp of invalidCodePoints) {
            await expect(async () => p1.addCodePoint(cp)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
            await expect(async () => p1.insertCodePoint(cp, 0)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        }
        // A character string accepted by 4.x is now rejected
        await expect(async () => p1.addCodePoint('A' as unknown as number)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        expect(await p1.length()).toBe(0)

        // Boundaries are valid
        expect(await p1.addCodePoint(0)).toBe(1)
        expect(await p1.addCodePoint(0x10FFFF)).toBe(2)
    }

    async testEmptyFromStringDoesNotCreatePassword() {
        // PowerAuth instance is not configured, so creating the native password would fail
        const powerAuth = new PowerAuth(this.getRandomId())
        this.cleanup.push(powerAuth)

        const p1 = await PowerAuthPassword.fromString('', { powerAuthInstanceId: powerAuth.instanceId })
        this.cleanup.push(p1)
        await expect(async () => p1.isEmpty()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED })
        await expect(async () => PowerAuthPassword.fromString(48 as unknown as string)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})

        // Adding an empty string doesn't create the native password either
        const p2 = new PowerAuthPassword({ powerAuthInstanceId: powerAuth.instanceId })
        this.cleanup.push(p2)
        expect(await p2.addCodePoints('')).toBe(0)
        await expect(async () => p2.isEmpty()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED })

        // Once the native password is created, an empty string is validated against it
        const p3 = new PowerAuthPassword()
        this.cleanup.push(p3)
        expect(await p3.addCodePoints('a')).toBe(1)
        await p3.release()
        await expect(async () => p3.addCodePoints('')).toThrow({errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
    }

    async testFailedFromStringReleasesPassword() {
        const powerAuth = await this.createConfiguredPowerAuth()
        const baseline = await Register.countObjects(powerAuth.instanceId)

        // Simulate a failure after the native password is created and already contains some code points.
        // The sentinel code point is mapped to an invalid value, so adding it fails in the middle of `fromString()`.
        const sentinel = '\uE000'
        const originalCodePointAt = String.prototype.codePointAt
        let sentinelSeen = false
        // eslint-disable-next-line no-extend-native
        String.prototype.codePointAt = function (this: string, pos: number) {
            // `this` may be a boxed string, so compare its primitive value
            if (String(this) === sentinel) {
                sentinelSeen = true
                return -1
            }
            return originalCodePointAt.call(this, pos)
        }
        try {
            await expect(async () => PowerAuthPassword.fromString(`12${sentinel}34`, { powerAuthInstanceId: powerAuth.instanceId }))
                .toThrow({ errorCode: PowerAuthErrorCode.WRONG_PARAMETER })
        } finally {
            // eslint-disable-next-line no-extend-native
            String.prototype.codePointAt = originalCodePointAt
        }

        expect(sentinelSeen).toBe(true)
        // The partially filled native password must not stay in the memory
        expect((await Register.countObjects(powerAuth.instanceId)).valid).toBe(baseline.valid)
    }

    async testAddCodePointsOfString() {
        const p1 = new PowerAuthPassword()
        const expected = await importPassword('ab👍🏽')
        this.cleanup.push(p1, expected)

        expect(await p1.addCodePoints('')).toBe(0)
        expect(await p1.addCodePoints('a')).toBe(1)
        // Appends to existing content and returns the total length in code points
        expect(await p1.addCodePoints('b👍🏽')).toBe(4)
        expect(await p1.addCodePoints('')).toBe(4)
        expect(await p1.isEqualTo(expected)).toBe(true)

        await expect(async () => p1.addCodePoints(48 as unknown as string)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => p1.addCodePoints(undefined as unknown as string)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        expect(await p1.length()).toBe(4)
    }

    async testDeprecatedCharacterMethods() {
        const p1 = new PowerAuthPassword()
        const expected = await importPassword('Sk👍l')
        const withoutModifier = await importPassword('S👍l')
        this.cleanup.push(p1, expected, withoutModifier)

        // A string adds only its first code point, so '👍🏽' is stored as '👍' as in 4.x
        expect(await p1.addCharacter('S')).toBe(1)
        expect(await p1.addCharacter('👍🏽')).toBe(2)
        expect(await p1.addCharacter(0x6C)).toBe(3)
        expect(await p1.insertCharacter('kx', 1)).toBe(4)
        expect(await p1.isEqualTo(expected)).toBe(true)

        expect(await p1.removeCharacterAt(1)).toBe(3)
        expect(await p1.isEqualTo(withoutModifier)).toBe(true)
        expect(await p1.removeLastCharacter()).toBe(2)

        await expect(async () => p1.addCharacter('')).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => p1.insertCharacter('x', 3)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        expect(await p1.length()).toBe(2)
    }
}
