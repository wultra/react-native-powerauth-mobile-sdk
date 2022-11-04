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

import { expect } from "../src/testbed";
import { PowerAuthDebug } from "react-native-powerauth-mobile-sdk";
import { TestWithActivation } from "./helpers/TestWithActivation";
import { Register } from "./helpers/NativeObjectRegister";

export class NativeObjectRegisterTests extends TestWithActivation {

    shouldCreateActivationBeforeTest(): boolean {
        return false // this test doesn't require activation
    }

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

    getRandomTag(): string {
        return 'tag_' + (Math.random() + 1).toString(36).substring(7)
    }

    async testDumpingRegisteredObjects() {

        const tag = this.getRandomTag()
        this.debugInfo(`Using tag '${tag}'`)

        const dataId1 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['expire 400'] })
        const dataId2 = await Register.createObject({ objectType: 'secure-data', objectTag: tag, releasePolicy: ['keepAlive 200'] })
        const dataId3 = await Register.createObject({ objectType: 'secure-data', objectTag: tag, releasePolicy: ['afterUse 2'] })
        
        this.debugInfo(`Using IDs '${dataId1}', '${dataId2}', '${dataId3}'`)

        expect(await Register.findObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId2, 'secure-data')).toBe(true)
        expect(await Register.findObject(dataId3, 'secure-data')).toBe(true)

        await Register.useObject(dataId3, 'secure-data')
        expect(await Register.findObject(dataId3, 'secure-data')).toBe(true)
        await Register.useObject(dataId3, 'secure-data')
        expect(await Register.findObject(dataId3, 'secure-data')).toBe(false)

        await PowerAuthDebug.dumpNativeObjects(tag)
    }

    async testObjectsExpiration() {
        const tag = this.getRandomTag()
        this.debugInfo(`Using tag '${tag}'`)

        const dataId1 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['expire 400', 'afterUse 1'] })
        const dataId2 = await Register.createObject({ objectType: 'secure-data', objectTag: tag, releasePolicy: ['expire 200', 'keepAlive 400'] })
        
        this.debugInfo(`Using IDs '${dataId1}', '${dataId2}'`)

        expect(await Register.findObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId2, 'secure-data')).toBe(true)
        expect((await Register.countObjects(tag)).valid).toBe(2)

        await this.sleep(200)

        expect(await Register.findObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId2, 'secure-data')).toBe(false)
        expect((await Register.countObjects(tag)).valid).toBe(1)

        await this.sleep(200)

        expect(await Register.findObject(dataId1, 'data')).toBe(false)
        expect(await Register.findObject(dataId2, 'secure-data')).toBe(false)
        expect((await Register.countObjects(tag)).valid).toBe(0)
    }

    async testUsageCount() {
        const tag = this.getRandomTag()
        this.debugInfo(`Using tag '${tag}'`)

        const dataId1 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['afterUse 1'] })
        const dataId2 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['expire 300', 'afterUse 2'] })
        const dataId3 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['keepAlive 100', 'afterUse 4'] })
        const dataId4 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['keepAlive 100', 'afterUse 4'] })
        
        this.debugInfo(`Using IDs '${dataId1}', '${dataId2}', '${dataId3}', '${dataId4}'`)

        // Initial expectation
        expect(await Register.findObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId2, 'data')).toBe(true)
        expect(await Register.findObject(dataId3, 'data')).toBe(true)
        expect(await Register.findObject(dataId4, 'data')).toBe(true)
        expect((await Register.countObjects(tag)).valid).toBe(4)

        await this.sleep(50)
        // After 50ms everything should be still valid
        expect((await Register.countObjects(tag)).valid).toBe(4)

        // use dataId4, this will extend its lifetime
        expect(await Register.useObject(dataId4, 'data')).toBe(true)

        await this.sleep(50)
        // After next 50ms, dataId3 will be removed
        expect(await Register.findObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId2, 'data')).toBe(true)
        expect(await Register.findObject(dataId3, 'data')).toBe(false)
        expect(await Register.findObject(dataId4, 'data')).toBe(true)

        // Now use dataId2 for 1st time
        expect(await Register.useObject(dataId2, 'data')).toBe(true)
        
        expect(await Register.findObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId2, 'data')).toBe(true)
        expect(await Register.findObject(dataId3, 'data')).toBe(false)
        expect(await Register.findObject(dataId4, 'data')).toBe(true)

        await this.sleep(50)
        // Now use dataId2 for 2nd time, it should be released now
        // Also dataId4 is now released
        expect(await Register.useObject(dataId2, 'data')).toBe(true)
        
        expect(await Register.findObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId2, 'data')).toBe(false)
        expect(await Register.findObject(dataId3, 'data')).toBe(false)
        expect(await Register.findObject(dataId4, 'data')).toBe(false)

        // And finally, use dataId4, to release it

        expect(await Register.useObject(dataId1, 'data')).toBe(true)

        expect(await Register.findObject(dataId1, 'data')).toBe(false)
        expect(await Register.findObject(dataId2, 'data')).toBe(false)
        expect(await Register.findObject(dataId3, 'data')).toBe(false)
        expect(await Register.findObject(dataId4, 'data')).toBe(false)
        expect((await Register.countObjects(tag)).valid).toBe(0)
    }

    async testTouchObject() {
        const tag = this.getRandomTag()
        this.debugInfo(`Using tag '${tag}'`)

        const dataId1 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['keepAlive 100', 'afterUse 4'] })
        const dataId2 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['keepAlive 100', 'afterUse 4'] })
        
        this.debugInfo(`Using IDs '${dataId1}', '${dataId2}'`)

        // Initial expectation
        expect(await Register.findObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId2, 'data')).toBe(true)
        expect((await Register.countObjects(tag)).valid).toBe(2)

        await this.sleep(50)
        // After 50ms everything should be still valid

        // use dataId4, this will extend its lifetime
        expect(await Register.touchObject(dataId2, 'data')).toBe(true)

        await this.sleep(50)
        // After next 50ms, dataId3 will be removed
        expect(await Register.findObject(dataId1, 'data')).toBe(false)
        expect(await Register.findObject(dataId2, 'data')).toBe(true)
        // Wait for another 50ms to release dataId2
        await this.sleep(50)
        expect(await Register.findObject(dataId1, 'data')).toBe(false)
        expect(await Register.findObject(dataId2, 'data')).toBe(false)
        expect((await Register.countObjects(tag)).valid).toBe(0)
    }

    async testManualRelease() {
        const tag = this.getRandomTag()
        this.debugInfo(`Using tag '${tag}'`)

        const dataId1 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['afterUse 1', 'manual'] })
        const dataId2 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['manual', 'expire 100', 'afterUse 2'] })
        const dataId3 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['keepAlive 100', 'afterUse 4', 'manual'] })
        const dataId4 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['manual'] })

        this.debugInfo(`Using IDs '${dataId1}', '${dataId2}', '${dataId3}', '${dataId4}'`)

        // All manual objects must be in the register for the whole time 
        expect(await Register.findObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId2, 'data')).toBe(true)
        expect(await Register.findObject(dataId3, 'data')).toBe(true)
        expect(await Register.findObject(dataId4, 'data')).toBe(true)
        expect((await Register.countObjects(tag)).valid).toBe(4)

        expect(await Register.useObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId1, 'data')).toBe(true)

        this.sleep(110)

        expect(await Register.findObject(dataId1, 'data')).toBe(true)
        expect(await Register.findObject(dataId2, 'data')).toBe(true)
        expect(await Register.findObject(dataId3, 'data')).toBe(true)
        expect(await Register.findObject(dataId4, 'data')).toBe(true)

        // Now remove objects manually
        expect(await Register.removeObject(dataId1, 'data')).toBe(true)
        expect(await Register.removeObject(dataId2, 'data')).toBe(true)
        expect(await Register.removeObject(dataId3, 'data')).toBe(true)
        expect(await Register.removeObject(dataId4, 'data')).toBe(true)

        expect((await Register.countObjects(tag)).valid).toBe(0)
    }

    async testAccessWrongObjectType() {
        const tag = this.getRandomTag()
        this.debugInfo(`Using tag '${tag}'`)

        const id1 = await Register.createObject({ objectType: 'data', objectTag: tag, releasePolicy: ['expire 200'] })
        const id2 = await Register.createObject({ objectType: 'number', objectTag: tag, releasePolicy: ['expire 200'] })

        this.debugInfo(`Using IDs '${id1}', '${id2}''`)

        // Correct
        expect(await Register.findObject(id1, 'data')).toBe(true)
        expect(await Register.findObject(id2, 'number')).toBe(true)
        // Incorrect type in find
        expect(await Register.findObject(id1, 'number')).toBe(false)
        expect(await Register.findObject(id2, 'data')).toBe(false)
        // Incorrect type in use
        expect(await Register.useObject(id1, 'number')).toBe(false)
        expect(await Register.useObject(id2, 'data')).toBe(false)
        // Incorrect type in remove
        expect(await Register.removeObject(id1, 'number')).toBe(false)
        expect(await Register.removeObject(id2, 'data')).toBe(false)

        // Objects still should be in register
        expect((await Register.countObjects(tag)).valid).toBe(2)
        // Correct type in remove
        expect(await Register.removeObject(id1, 'data')).toBe(true)
        expect(await Register.removeObject(id2, 'number')).toBe(true)
        
        // After cleanup, count should be 0
        expect((await Register.countObjects(tag)).valid).toBe(0)
    }
}
