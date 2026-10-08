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

    async testAddCharacters() {
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

        expect(await p1.addCharacter('0')).toBe(1)
        expect(await p2.addCharacter(48)).toBe(1)
        expect(await p1.isEqualTo(pEmpty)).toBe(false)
        expect(await p2.isEqualTo(pEmpty)).toBe(false)
        expect(await p1.isEmpty()).toBe(false)
        expect(await p2.isEmpty()).toBe(false)

        expect(await p1.addCharacter('1')).toBe(2)
        expect(await p2.addCharacter(49)).toBe(2)
        expect(await p1.addCharacter('2')).toBe(3)
        expect(await p2.addCharacter(50)).toBe(3)
        expect(await p1.addCharacter('3')).toBe(4)
        expect(await p2.addCharacter(51)).toBe(4)

        await expect(async () => p1.addCharacter(0x110000)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})

        expect(await p1.isEqualTo(p3)).toBe(true)
        expect(await p2.isEqualTo(p3)).toBe(true)
        expect(await p1.isEqualTo(p2)).toBe(true)
        
        p1.clear()
        p2.clear()
        expect(await p1.isEqualTo(pEmpty)).toBe(true)
        expect(await p2.isEqualTo(pEmpty)).toBe(true)
    }

    async testRemoveCharacters() {
        const p1 = await importPassword('Sk💀Ll')
        const t1 = await importPassword('k💀Ll')
        const t2 = await importPassword('k💀L')
        const t3 = await importPassword('kL')
        const t4 = await importPassword('k')
        this.cleanup.push(p1, t1, t2, t3, t4)

        await expect(async () => p1.removeCharacterAt(-1)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => p1.removeCharacterAt(5)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})

        expect(await p1.removeCharacterAt(0)).toBe(4)
        expect(await p1.isEqualTo(t1)).toBe(true)
        expect(await p1.removeLastCharacter()).toBe(3)
        expect(await p1.isEqualTo(t2)).toBe(true)
        expect(await p1.removeCharacterAt(1)).toBe(2)
        expect(await p1.isEqualTo(t3)).toBe(true)
        expect(await p1.removeCharacterAt(1)).toBe(1)
        expect(await p1.isEqualTo(t4)).toBe(true)
        expect(await p1.removeCharacterAt(0)).toBe(0)
        expect(await p1.length()).toBe(0)
        // Pop last should not fail
        expect(await p1.removeLastCharacter()).toBe(0)

        await expect(async () => p1.removeCharacterAt(0)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
    }

    async testInsertCharacters() {
        const p1 = new PowerAuthPassword()
        const p2 = await importPassword('Sk💀ll')
        this.cleanup.push(p1, p2)

        expect(await p1.insertCharacter('l', 0)).toBe(1)
        expect(await p1.insertCharacter('l', 1)).toBe(2)
        expect(await p1.insertCharacter('S', 0)).toBe(3)
        expect(await p1.insertCharacter('k', 1)).toBe(4)
        expect(await p1.insertCharacter(0x1F480, 2)).toBe(5)

        await expect(async () => p1.insertCharacter('X', -1)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => p1.insertCharacter('X', 6)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => p1.insertCharacter(0x110000, 0)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})

        expect(await p1.isEqualTo(p2)).toBe(true)
    }

    async testUnicode() {
        const p1 = await importPassword('★🤣🤫🪘')
        const p2 = await importPassword('Sk💀ll')
        const p3 = new PowerAuthPassword()
        const p4 = new PowerAuthPassword()
        this.cleanup.push(p1, p2, p3, p4)
        
        expect(await p1.length()).toBe(4)
        expect(await p2.length()).toBe(5)

        await p3.addCharacter('★')
        await p3.addCharacter('🤣🤫')
        await p3.addCharacter('🤫')
        await p3.addCharacter('🪘x')

        expect(await p3.length()).toBe(4)

        await p4.addCharacter(0x2605)
        await p4.addCharacter(0x1F923)
        await p4.addCharacter(0x1F92B)
        await p4.addCharacter(0x1FA98)

        expect(await p4.length()).toBe(4)

        expect(await p3.isEqualTo(p4)).toBe(true)
        expect(await p3.isEqualTo(p1)).toBe(true)
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
        await p1.addCharacter(48)
        // Wait for another 50ms, p2 should be released now
        await this.sleep(50)

        expect(await Register.findObject(id1, 'password')).toBe(true)
        expect(await Register.findObject(id2, 'password')).toBe(false)
        // Expired password is not recreated
        await expect(async () => p2.isEmpty()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p2.addCharacter(48)).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
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

        await p1.addCharacter(48)
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

        await p1.addCharacter(48)
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
        await expect(async () => p1.addCharacter(48)).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p2.isEmpty()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p1.toRawPassword()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })
        await expect(async () => p2.testPinStrength()).toThrow({ errorCode: PowerAuthErrorCode.INVALID_NATIVE_OBJECT })

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
        const lengths = await Promise.all(characters.map(c => p.addCharacter(c)))

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
        const add = p.addCharacter('1')
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
        await expect(async () => p1.addCharacter(48)).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED })
        await expect(async () => p2.removeLastCharacter()).toThrow({errorCode: PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED })

        // Configure PA instance
        await powerAuth.configure(config)

        // Failed creation is retried, so everything should work as expected now
        await p1.addCharacter(48)
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
        const passwordString = "Sk💀ll" // to contain other than unicode char
        const codepoints = [83, 107, 128128/*, 56448*/, 108, 108] // S k 💀 l l (current implementation ommits `56448` codepoint)

        const p1 = await PowerAuthPassword.fromString(passwordString)
        const p2 = new PowerAuthPassword()
        const p3 = new PowerAuthPassword()
        this.cleanup.push(p1, p2, p3)

        for (const c of passwordString) {
            await p2.addCharacter(c)
        }

        for (const cp of codepoints) {
            await p3.addCharacter(cp)
        }

        expect(await p1.isEqualTo(p2)).toBe(true)
        expect(await p1.isEqualTo(p3)).toBe(true)
        expect(await p2.isEqualTo(p3)).toBe(true)
    }
}
