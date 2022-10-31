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

import { PinTestIssue, PowerAuthDebug, PowerAuthErrorCode, PowerAuthPassphraseMeter, PowerAuthPassword } from "react-native-powerauth-mobile-sdk";
import { TestSuite, expect } from "../src/testbed";
import { importPassword } from "./helpers/PasswordHelper";

export class PowerAuthPassphraseMeterTests extends TestSuite {

    cleanup = new Array<PowerAuthPassword>()

    async beforeAll(): Promise<void> {
        await super.beforeAll()
        this.cleanup = new Array<PowerAuthPassword>()
    }

    async afterAll(): Promise<void> {
        await super.afterAll()
        for (let i = 0; i < this.cleanup.length; i++) {
            const p = this.cleanup[i]
            await p.release()
        }
        this.cleanup = new Array<PowerAuthPassword>()
    }

    async importPassword(p: string): Promise<PowerAuthPassword> {
        const pass = await importPassword(p)
        this.cleanup.push(pass)
        return pass
    }

    async testPinIssues() {
        let pin: PowerAuthPassword
        let result = await PowerAuthPassphraseMeter.testPin('1111')
        expect(result.shouldWarnUserAboutWeakPin).toBe(true)
        expect(result.issues).toContain(PinTestIssue.FREQUENTLY_USED)
        pin = await this.importPassword('1111')
        result = await PowerAuthPassphraseMeter.testPin(pin)
        expect(result.shouldWarnUserAboutWeakPin).toBe(true)
        expect(result.issues).toContain(PinTestIssue.FREQUENTLY_USED)

        result = await PowerAuthPassphraseMeter.testPin('1357')
        expect(result.shouldWarnUserAboutWeakPin).toBe(true)
        expect(result.issues).toContain(PinTestIssue.PATTERN_FOUND)
        pin = await this.importPassword('1357')
        result = await PowerAuthPassphraseMeter.testPin(pin)
        expect(result.shouldWarnUserAboutWeakPin).toBe(true)
        expect(result.issues).toContain(PinTestIssue.PATTERN_FOUND)

        result = await PowerAuthPassphraseMeter.testPin('1990')
        expect(result.shouldWarnUserAboutWeakPin).toBe(false)
        expect(result.issues).toContain(PinTestIssue.POSSIBLY_DATE)
        pin = await this.importPassword('1990')
        result = await PowerAuthPassphraseMeter.testPin(pin)
        expect(result.shouldWarnUserAboutWeakPin).toBe(false)
        expect(result.issues).toContain(PinTestIssue.POSSIBLY_DATE)

        result = await PowerAuthPassphraseMeter.testPin('1112')
        expect(result.shouldWarnUserAboutWeakPin).toBe(true)
        expect(result.issues).toContain(PinTestIssue.NOT_UNIQUE)
        pin = await this.importPassword('1112')
        result = await PowerAuthPassphraseMeter.testPin(pin)
        expect(result.shouldWarnUserAboutWeakPin).toBe(true)
        expect(result.issues).toContain(PinTestIssue.NOT_UNIQUE)

        result = await PowerAuthPassphraseMeter.testPin('1111')
        expect(result.shouldWarnUserAboutWeakPin).toBe(true)
        expect(result.issues).toContain(PinTestIssue.REPEATING_CHARS)
        pin = await this.importPassword('1111')
        result = await PowerAuthPassphraseMeter.testPin(pin)
        expect(result.shouldWarnUserAboutWeakPin).toBe(true)
        expect(result.issues).toContain(PinTestIssue.REPEATING_CHARS)
        
        result = await PowerAuthPassphraseMeter.testPin('1111')
        expect(result.shouldWarnUserAboutWeakPin).toBe(true)
        expect(result.issues).toContain(PinTestIssue.REPEATING_CHARS, PinTestIssue.FREQUENTLY_USED, 
                                        PinTestIssue.NOT_UNIQUE, PinTestIssue.PATTERN_FOUND, 
                                        PinTestIssue.POSSIBLY_DATE)
        pin = await this.importPassword('1111')
        result = await PowerAuthPassphraseMeter.testPin(pin)
        expect(result.shouldWarnUserAboutWeakPin).toBe(true)
        expect(result.issues).toContain(PinTestIssue.REPEATING_CHARS, PinTestIssue.FREQUENTLY_USED, 
                                        PinTestIssue.NOT_UNIQUE, PinTestIssue.PATTERN_FOUND, 
                                        PinTestIssue.POSSIBLY_DATE)
    }

    async testPinDates() {
        const dates = [
            "0304", "1012", "3101", "1998", "2005", "150990", "241065", "16021998", "03122001",
            "2902", "2802"
        ]
        const noDates = ["1313", "0028", "1287", "9752", "151590", "001297", "41121987"]

        for (let i = 0; i < dates.length; i++) {
            const result = await PowerAuthPassphraseMeter.testPin(dates[i])
            expect(result.issues).toContain(PinTestIssue.POSSIBLY_DATE)
        }
        for (let i = 0; i < noDates.length; i++) {
            const result = await PowerAuthPassphraseMeter.testPin(noDates[i])
            expect(result.issues).toNotContain(PinTestIssue.POSSIBLY_DATE)
        }

        for (let i = 0; i < dates.length; i++) {
            const pass = await this.importPassword(dates[i])
            const result = await PowerAuthPassphraseMeter.testPin(pass)
            expect(result.issues).toContain(PinTestIssue.POSSIBLY_DATE)
        }
        for (let i = 0; i < noDates.length; i++) {
            const pass = await this.importPassword(noDates[i])
            const result = await PowerAuthPassphraseMeter.testPin(pass)
            expect(result.issues).toNotContain(PinTestIssue.POSSIBLY_DATE)
        }
    }

    async testPinOK() {
        let result = await PowerAuthPassphraseMeter.testPin('9562')
        expect(result.issues).toBeEmpty()
        expect(result.shouldWarnUserAboutWeakPin).toBe(false)
        
        let pin = await this.importPassword('9562')
        result = await pin.testPinStrength()
        expect(result.issues).toBeEmpty()
        expect(result.shouldWarnUserAboutWeakPin).toBe(false)
    }

    async testWrongPin() {
        await expect(async () => await PowerAuthPassphraseMeter.testPin('')).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => await PowerAuthPassphraseMeter.testPin('123')).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => await PowerAuthPassphraseMeter.testPin('1234abc')).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
    }
}