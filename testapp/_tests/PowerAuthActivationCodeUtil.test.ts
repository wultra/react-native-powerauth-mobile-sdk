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

import { PowerAuthActivationCode, PowerAuthActivationCodeUtil } from "react-native-powerauth-mobile-sdk";
import { TestSuite, expect } from "../src/testbed";

export class PowerAuthActivationCodeUtilTests extends TestSuite {
    
    // Activation code

    async testActivationCodeValidation() {
        const validCodes = [
            // nice codes
            "AAAAA-AAAAA-AAAAA-AAAAA",
            "MMMMM-MMMMM-MMMMM-MUTOA",
            "VVVVV-VVVVV-VVVVV-VTFVA",
            "55555-55555-55555-55YMA",
            // random codes
            "W65WE-3T7VI-7FBS2-A4OYA",
            "DD7P5-SY4RW-XHSNB-GO52A",
            "X3TS3-TI35Z-JZDNT-TRPFA",
            "HCPJX-U4QC4-7UISL-NJYMA",
            "XHGSM-KYQDT-URE34-UZGWQ",
            "45AWJ-BVACS-SBWHS-ABANA",
            "BUSES-ETYN2-5HTFE-NOV2Q",
            "ATQAZ-WJ7ZG-FWA7J-QFAJQ",
            "MXSYF-LLQJ7-PS6LF-E2FMQ",
            "ZKMVN-4IMFK-FLSYX-ARRGA",
            "NQHGX-LNM2S-EQ4NT-G3NAA"
        ]
        for (const i in validCodes) {
            const code = validCodes[i]
            const result = await PowerAuthActivationCodeUtil.validateActivationCode(code)
            if (!result) {
                this.reportFailure(`Code ${code} should be valid`)
            }
        }
        const invalidCodes = [
            "",
            " ",
            "KLMNO-PQRST",
            "KLMNO-PQRST-UVWXY-Z234",
            "KLMNO-PQRST-UVWXY-Z2345 ",
            "KLMNO-PQRST-UVWXY-Z2345#",
            "67AAA-B0BCC-DDEEF-GGHHI",
            "67AAA-BB1CC-DDEEF-GGHHI",
            "67AAA-BBBC8-DDEEF-GGHHI",
            "67AAA-BBBCC-DDEEF-GGHH9",
            "67aAA-BBBCC-DDEEF-GGHHI",
            "6-AAA-BB1CC-DDEEF-GGHHI",
            "67AA#-BB1CC-DDEEF-GGHHI",
            "67AABCBB1CC-DDEEF-GGHHI",
            "67AAB-BB1CCEDDEEF-GGHHI",
            "67AAA-BBBCC-DDEEFZGGHHI",
            "CCCCC-CCCCC-CCCCC-CNUUQ#ABCD",
            "EEEEE-EEEEE-EEEEE-E2OXA#AB=="
        ]
        for (const i in invalidCodes) {
            const code = invalidCodes[i]
            const result = await PowerAuthActivationCodeUtil.validateActivationCode(code)
            if (result) {
                this.reportFailure(`Code ${code} should be invalid`)
            }
        }
    }

    async testActivationCodeParser() {
        let code = await PowerAuthActivationCodeUtil.parseActivationCode('BBBBB-BBBBB-BBBBB-BTA6Q')
        expect(code.activationCode).toBe('BBBBB-BBBBB-BBBBB-BTA6Q')
        expect(code.activationSignature).toBeNull()

        code = await PowerAuthActivationCodeUtil.parseActivationCode('CCCCC-CCCCC-CCCCC-CNUUQ#ABCD')
        expect(code.activationCode).toBe('CCCCC-CCCCC-CCCCC-CNUUQ')
        expect(code.activationSignature).toBe('ABCD')

        code = await PowerAuthActivationCodeUtil.parseActivationCode('DDDDD-DDDDD-DDDDD-D6UKA#ABC=')
        expect(code.activationCode).toBe('DDDDD-DDDDD-DDDDD-D6UKA')
        expect(code.activationSignature).toBe('ABC=')

        code = await PowerAuthActivationCodeUtil.parseActivationCode('EEEEE-EEEEE-EEEEE-E2OXA#AB==')
        expect(code.activationCode).toBe('EEEEE-EEEEE-EEEEE-E2OXA')
        expect(code.activationSignature).toBe('AB==')

        const invalidCodes = [
            "",
            "#",
            "#AB==",
            "KLMNO-PQRST",
            "EEEEE-EEEEE-EEEEE-E2OXA#",
            "OOOOO-OOOOO-OOOOO-OZH2Q#",
            "SSSSS-SSSSS-SSSSS-SX7IA#AB",
            "UUUUU-UUUUU-UUUUU-UAFLQ#AB#",
            "WWWWW-WWWWW-WWWWW-WNR7A#ABA=#",
            "XXXXX-XXXXX-XXXXX-X6RBQ#ABA-="
        ]
        for (const i in invalidCodes) {
            await expect(async () => {
                code = await PowerAuthActivationCodeUtil.parseActivationCode(invalidCodes[i])
            }).toThrow({errorCode: 'INVALID_ACTIVATION_CODE'})
        }
    }

    // Recovery code

    async testRecoveryCodeValidation() {
        const validCodes = [
            // nice codes
            "AAAAA-AAAAA-AAAAA-AAAAA",
            "MMMMM-MMMMM-MMMMM-MUTOA",
            "VVVVV-VVVVV-VVVVV-VTFVA",
            "55555-55555-55555-55YMA",
            // random codes
            "W65WE-3T7VI-7FBS2-A4OYA",
            "DD7P5-SY4RW-XHSNB-GO52A",
            "X3TS3-TI35Z-JZDNT-TRPFA",
            "HCPJX-U4QC4-7UISL-NJYMA",
            "XHGSM-KYQDT-URE34-UZGWQ",
            "45AWJ-BVACS-SBWHS-ABANA",

            // With R: prefix
            "R:AAAAA-AAAAA-AAAAA-AAAAA",
            "R:MMMMM-MMMMM-MMMMM-MUTOA",
            "R:VVVVV-VVVVV-VVVVV-VTFVA",
            "R:55555-55555-55555-55YMA",
            "R:BUSES-ETYN2-5HTFE-NOV2Q",
            "R:ATQAZ-WJ7ZG-FWA7J-QFAJQ",
            "R:MXSYF-LLQJ7-PS6LF-E2FMQ",
            "R:ZKMVN-4IMFK-FLSYX-ARRGA",
            "R:NQHGX-LNM2S-EQ4NT-G3NAA",
        ]
        for (const i in validCodes) {
            const code = validCodes[i]
            const result = await PowerAuthActivationCodeUtil.validateRecoveryCode(code)
            if (!result) {
                this.reportFailure(`Code ${code} should be valid`)
            }
        }
        const invalidCodes = [
            "",
            " ",
            "R",
            "R:",
            "X:AAAAA-AAAAA-AAAAA-AAAAA",
            "KLMNO-PQRST",
            "R:KLMNO-PQRST",
            "KLMNO-PQRST-UVWXY-Z234",
            "KLMNO-PQRST-UVWXY-Z2345 ",
            "R:KLMNO-PQRST-UVWXY-Z2345 ",
            "KLMNO-PQRST-UVWXY-Z2345#",
            "NQHGX-LNM2S-EQ4NT-G3NAA#aGVsbG8td29ybGQ=",
            "R:NQHGX-LNM2S-EQ4NT-G3NAA#aGVsbG8td29ybGQ=",
            "67AAA-B0BCC-DDEEF-GGHHI",
            "67AAA-BB1CC-DDEEF-GGHHI",
            "67AAA-BBBC8-DDEEF-GGHHI",
            "67AAA-BBBCC-DDEEF-GGHH9",
            "67aAA-BBBCC-DDEEF-GGHHI",
            "6-AAA-BB1CC-DDEEF-GGHHI",
            "67AA#-BB1CC-DDEEF-GGHHI",
            "67AABCBB1CC-DDEEF-GGHHI",
            "67AAB-BB1CCEDDEEF-GGHHI",
            "67AAA-BBBCC-DDEEFZGGHHI",
        ]
        for (const i in invalidCodes) {
            const code = invalidCodes[i]
            const result = await PowerAuthActivationCodeUtil.validateRecoveryCode(code)
            if (result) {
                this.reportFailure(`Code ${code} should be invalid`)
            }
        }
    }

    async testRecoveryCodeParser() {
        let code = await PowerAuthActivationCodeUtil.parseRecoveryCode('BBBBB-BBBBB-BBBBB-BTA6Q')
        expect(code).toBeDefined()
        expect(code.activationCode).toBe('BBBBB-BBBBB-BBBBB-BTA6Q')
        expect(code.activationSignature).toBeNull()

        code = await PowerAuthActivationCodeUtil.parseRecoveryCode('R:BBBBB-BBBBB-BBBBB-BTA6Q')
        expect(code).toBeDefined()
        expect(code.activationCode).toBe('BBBBB-BBBBB-BBBBB-BTA6Q')
        expect(code.activationSignature).toBeNull()

        const invalidCodes = [
            "",
            "#",
            "#AB==",
            "KLMNO-PQRST",
            "EEEEE-EEEEE-EEEEE-E2OXA#",
            "OOOOO-OOOOO-OOOOO-OZH2Q#",
            "SSSSS-SSSSS-SSSSS-SX7IA#AB",
            "UUUUU-UUUUU-UUUUU-UAFLQ#AB#",
            "WWWWW-WWWWW-WWWWW-WNR7A#ABA=#",
            "XXXXX-XXXXX-XXXXX-X6RBQ#ABA-=",
            "DDDDD-DDDDD-DDDDD-D6UKA#ABC=",
            "EEEEE-EEEEE-EEEEE-E2OXA#AB==",
            "R:DDDDD-DDDDD-DDDDD-D6UKA#ABC=",
            "R:EEEEE-EEEEE-EEEEE-E2OXA#AB=="
        ]
        for (const i in invalidCodes) {
            await expect(async () => {
                code = await PowerAuthActivationCodeUtil.parseRecoveryCode(invalidCodes[i])
            }).toThrow({ errorCode: 'INVALID_RECOVERY_CODE' })
        }
    }

    // PUK

    async testRecoveryPukValidation() {
        const validPuks = [
            "0000000000",
            "9999999999",
            "0123456789",
            "9876543210",
            "1111111111",
            "3487628763",
        ]
        for (const i in validPuks) {
            const puk = validPuks[i]
            const result = await PowerAuthActivationCodeUtil.validateRecoveryPuk(puk)
            if (!result) {
                this.reportFailure(`PUK ${puk} should be valid`)
            }
        }
        const invalidPuks = [
            "",
            " ",
            "11111111111",
            "111111111",
            "0",
            "999999999A",
            "99999999b9",
            "9999999c99",
            "999999d999",
            "99999e9999",
            "9999f99999",
            "999g999999",
            "99h9999999",
            "9i99999999",
            "A999999999",
            "999999999 ",
            "99999999 9",
            "9999999 99",
            "999999 999",
            "99999 9999",
            "9999 99999",
            "999 999999",
            "99 9999999",
            "9 99999999",
            " 999999999",
        ]
        for (const i in invalidPuks) {
            const puk = invalidPuks[i]
            const result = await PowerAuthActivationCodeUtil.validateRecoveryPuk(puk)
            if (result) {
                this.reportFailure(`PUK ${puk} should be invalid`)
            }
        }
    }

    // Auto correction

    // TODO: add tests for autocorrection
}