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

import { PowerAuthServerError, TokenDigest, TokenDigestVerifyResult } from "powerauth-js-test-client";
import { Platform } from "react-native";
import { PowerAuthErrorCode } from "react-native-powerauth-mobile-sdk";
import { expect } from "../src/testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_TokenTests extends TestWithActivation {

    async testTokenManagement() {
        const T1 = 'possessionToken'
        const T1_cred = this.credentials.possession
        const T1_invCred = this.credentials.knowledge
        const T2 = 'knowledgeToken'
        const T2_cred = this.credentials.knowledge
        const T2_invCred = this.credentials.possession

        const sdk = this.sdk
        const tokenStore = sdk.tokenStore

        expect(await tokenStore.hasLocalToken(T1)).toBe(false)
        expect(await tokenStore.hasLocalToken(T2)).toBe(false)

        await expect(async () => await tokenStore.generateHeaderForToken(T1)).toThrow({errorCode: PowerAuthErrorCode.LOCAL_TOKEN_NOT_AVAILABLE})
        await expect(async () => await tokenStore.generateHeaderForToken(T2)).toThrow({errorCode: PowerAuthErrorCode.LOCAL_TOKEN_NOT_AVAILABLE})
        await expect(async () => await tokenStore.getLocalToken(T1)).toThrow({errorCode: PowerAuthErrorCode.LOCAL_TOKEN_NOT_AVAILABLE})
        await expect(async () => await tokenStore.getLocalToken(T2)).toThrow({errorCode: PowerAuthErrorCode.LOCAL_TOKEN_NOT_AVAILABLE})

        const token1 = await tokenStore.requestAccessToken(T1, T1_cred)
        expect(token1.tokenIdentifier).toBeDefined()
        expect(token1.tokenName).toBe(T1)

        const token2 = await tokenStore.requestAccessToken(T2, T2_cred)
        expect(token2.tokenIdentifier).toBeDefined()
        expect(token2.tokenName).toBe(T2)

        expect(await tokenStore.hasLocalToken(T1)).toBe(true)
        expect(await tokenStore.hasLocalToken(T2)).toBe(true)
        expect(await tokenStore.getLocalToken(T1)).toBeDefined()
        expect(await tokenStore.getLocalToken(T2)).toBeDefined()

        const token1a = await tokenStore.requestAccessToken(T1, T1_cred)
        expect(token1a.tokenIdentifier).toBe(token1.tokenIdentifier)
        expect(token1a.tokenName).toBe(T1)
        const token2a = await tokenStore.requestAccessToken(T2, T2_cred)
        expect(token2a.tokenIdentifier).toBe(token2.tokenIdentifier)
        expect(token2a.tokenName).toBe(T2)

        const token1b = await tokenStore.getLocalToken(T1)
        expect(token1b.tokenIdentifier).toBe(token1.tokenIdentifier)
        expect(token1b.tokenName).toBe(T1)
        const token2b = await tokenStore.getLocalToken(T2)
        expect(token2b.tokenIdentifier).toBe(token2.tokenIdentifier)
        expect(token2b.tokenName).toBe(T2)

        // Requesting with different auth
        await expect(async () => await tokenStore.requestAccessToken(T1, T1_invCred)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})
        await expect(async () => await tokenStore.requestAccessToken(T2, T2_invCred)).toThrow({errorCode: PowerAuthErrorCode.WRONG_PARAMETER})

        // Try calculate tokens
        await expect(async () => await tokenStore.generateHeaderForToken(T1)).toSucceed()
        await expect(async () => await tokenStore.generateHeaderForToken(T2)).toSucceed()

        // remove locally
        await expect(async () => await tokenStore.removeLocalToken(T1)).toSucceed()
        expect(await tokenStore.hasLocalToken(T1)).toBe(false)
        await expect(async () => await tokenStore.generateHeaderForToken(T1)).toThrow({errorCode: PowerAuthErrorCode.LOCAL_TOKEN_NOT_AVAILABLE})
        
        // remove on the server
        await expect(async () => await tokenStore.removeAccessToken(T2)).toSucceed()
        expect(await tokenStore.hasLocalToken(T2)).toBe(false)
        await expect(async () => await tokenStore.generateHeaderForToken(T2)).toThrow({errorCode: PowerAuthErrorCode.LOCAL_TOKEN_NOT_AVAILABLE})
    }

    async testTokenCalculation() {
        const activationId = await this.sdk.getActivationIdentifier()
        
        const T1 = 'possessionToken'
        const T1_cred = this.credentials.possession
        const T2 = 'knowledgeToken'
        const T2_cred = this.credentials.knowledge

        const sdk = this.sdk
        const tokenStore = sdk.tokenStore

        const token1 = await tokenStore.requestAccessToken(T1, T1_cred)
        expect(token1.tokenIdentifier).toBeDefined()
        expect(token1.tokenName).toBe(T1)

        const token2 = await tokenStore.requestAccessToken(T2, T2_cred)
        expect(token2.tokenIdentifier).toBeDefined()
        expect(token2.tokenName).toBe(T2)

        const header1 = await tokenStore.generateHeaderForToken(T1)
        expect(header1.value).toBeDefined()
        const result1 = await this.verifyTokenDigest(header1.value)
        expect(result1.tokenValid).toBe(true)
        expect(result1.activationId).toBe(activationId)
        expect(result1.signatureType).toBe('POSSESSION')

        const header2 = await tokenStore.generateHeaderForToken(T2)
        expect(header2.value).toBeDefined()
        const result2 = await this.verifyTokenDigest(header2.value)
        expect(result2.tokenValid).toBe(true)
        expect(result2.activationId).toBe(activationId)
        expect(result2.signatureType).toBe('POSSESSION_KNOWLEDGE')
    }

    async verifyTokenDigest(digest: TokenDigest | string, timeIsWrong: boolean = false): Promise<TokenDigestVerifyResult> {
        try {
            return await this.helper.tokenHelper.verifyTokenDigest(digest)
        } catch (error) {
            if (error instanceof PowerAuthServerError) {
                if (Platform.OS === 'android' && error.httpStatusCode === 400 && error.serverErrorCode === 'ERR0030' && !timeIsWrong) {
                    this.reportWarning(`It appears that time on Android Device is out of sync`)
                }
            }
            throw error
        }
    }
}