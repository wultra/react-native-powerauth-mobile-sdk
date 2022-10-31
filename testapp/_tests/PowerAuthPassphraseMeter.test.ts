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

import { PinTestIssue, PowerAuthErrorCode, PowerAuthPassphraseMeter, PowerAuthPassword } from "react-native-powerauth-mobile-sdk";
import { TestSuite, expect } from "../src/testbed";
import { importPassword } from "./helpers/PasswordHelper";

interface IssuesData {
    pin: string
    shouldWarn: boolean
    issues: string[]
}

export class PowerAuthPassphraseMeterTests extends TestSuite {

    cleanup = new Array<PowerAuthPassword>()

    async beforeEach(): Promise<void> {
        await super.beforeEach()
        this.cleanup = new Array<PowerAuthPassword>()
    }

    async afterEach(): Promise<void> {
        await super.afterEach()
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
        const testData: IssuesData[] = [
            { pin: "1111", shouldWarn: true, issues: [PinTestIssue.FREQUENTLY_USED] },
            { pin: "1357", shouldWarn: true, issues: [PinTestIssue.PATTERN_FOUND] },
            { pin: "2468", shouldWarn: true, issues: [PinTestIssue.PATTERN_FOUND] },
            { pin: "4321", shouldWarn: true, issues: [PinTestIssue.PATTERN_FOUND] },
            { pin: "9753", shouldWarn: false, issues: [PinTestIssue.PATTERN_FOUND] },
            { pin: "97531", shouldWarn: false, issues: [PinTestIssue.PATTERN_FOUND] },
            { pin: "1990", shouldWarn: false, issues: [PinTestIssue.POSSIBLY_DATE] },
            { pin: "1112", shouldWarn: true, issues: [PinTestIssue.NOT_UNIQUE] },
            { pin: "11122", shouldWarn: true, issues: [PinTestIssue.NOT_UNIQUE] },
            { pin: "111113", shouldWarn: true, issues: [PinTestIssue.NOT_UNIQUE] },
            { pin: "1111", shouldWarn: true, issues: [PinTestIssue.REPEATING_CHARS, PinTestIssue.FREQUENTLY_USED, PinTestIssue.NOT_UNIQUE, PinTestIssue.PATTERN_FOUND, PinTestIssue.POSSIBLY_DATE] },
        ]
        for (let i = 0; i < testData.length; i++) {
            const td = testData[i]
            let result = await PowerAuthPassphraseMeter.testPin(td.pin)
            expect(result.issues).toContain(td.issues)
            expect(result.shouldWarnUserAboutWeakPin).toBe(td.shouldWarn)
            let pin = await this.importPassword(td.pin)
            result = await PowerAuthPassphraseMeter.testPin(pin)
            expect(result.issues).toContain(td.issues)
            expect(result.shouldWarnUserAboutWeakPin).toBe(td.shouldWarn)
            result = await pin.testPinStrength()
            expect(result.issues).toContain(td.issues)
            expect(result.shouldWarnUserAboutWeakPin).toBe(td.shouldWarn)
        }
    }

    async testPinDates() {
        const dates = [
            "0304", "1012", "3101", "1998", "2005", "150990", "241065", "16021998", "03122001",
            "2902", "2802"
        ]
        const noDates = ["1313", "0028", "1287", "9752", "151590", "001297", "41121987"]

        for (let i = 0; i < dates.length; i++) {
            let result = await PowerAuthPassphraseMeter.testPin(dates[i])
            expect(result.issues).toContain(PinTestIssue.POSSIBLY_DATE)
            const pin = await this.importPassword(dates[i])
            result = await PowerAuthPassphraseMeter.testPin(pin)
            expect(result.issues).toContain(PinTestIssue.POSSIBLY_DATE)
            result = await pin.testPinStrength()
            expect(result.issues).toContain(PinTestIssue.POSSIBLY_DATE)
        }
        for (let i = 0; i < noDates.length; i++) {
            let result = await PowerAuthPassphraseMeter.testPin(noDates[i])
            expect(result.issues).toNotContain(PinTestIssue.POSSIBLY_DATE)
            const pin = await this.importPassword(noDates[i])
            result = await PowerAuthPassphraseMeter.testPin(pin)
            expect(result.issues).toNotContain(PinTestIssue.POSSIBLY_DATE)
            result = await pin.testPinStrength()
            expect(result.issues).toNotContain(PinTestIssue.POSSIBLY_DATE)
        }
    }

    async testPinOK() {
        const pinOK = [ '9562', '79123781', '1092', '7710', '0680' ]
        for (let i = 0; i < pinOK.length; i++) {
            let result = await PowerAuthPassphraseMeter.testPin(pinOK[i])
            expect(result.issues).toBeEmpty()
            expect(result.shouldWarnUserAboutWeakPin).toBe(false)
            const pin = await this.importPassword(pinOK[i])
            result = await PowerAuthPassphraseMeter.testPin(pin)
            expect(result.issues).toBeEmpty()
            expect(result.shouldWarnUserAboutWeakPin).toBe(false)
            result = await pin.testPinStrength()
            expect(result.issues).toBeEmpty()
            expect(result.shouldWarnUserAboutWeakPin).toBe(false)
        }
    }

    async testWrongPin() {
        const wrongPIN = [ '', '123', '1234abc', 'x123', '0x23', '01x3', '012x' ]
        for (let i = 0; i < wrongPIN.length; i++) {
            await expect(async () => await PowerAuthPassphraseMeter.testPin(wrongPIN[i])).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
            const pin = await this.importPassword(wrongPIN[i])
            await expect(async () => await PowerAuthPassphraseMeter.testPin(pin)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
            await expect(async () => await pin.testPinStrength()).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        }
    }
}