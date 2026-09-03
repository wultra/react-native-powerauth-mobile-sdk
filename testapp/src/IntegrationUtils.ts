//
// Copyright 2025 Wultra s.r.o.
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
// See the License for the specific language governing permissions
// and limitations under the License.
//

import { PowerAuth, PowerAuthActivation, PowerAuthAuthentication,
    PowerAuthAlgorithm, PowerAuthBiometryConfiguration, PowerAuthBiometryStatus, PowerAuthClientConfiguration, PowerAuthConfiguration,
    PowerAuthKeychainConfiguration, PowerAuthSharingConfiguration, PowerAuthUserInfo
} from "react-native-powerauth-mobile-sdk"
import { Config as EnvConfig } from "react-native-config"
import { Buffer } from "buffer"
import { Platform } from "react-native"

export class AppConfig {
    static cloudServerUrl = EnvConfig.POWERAUTH_CLOUD_URL || ""
    static cloudServerLogin = EnvConfig.POWERAUTH_CLOUD_USERNAME || ""
    static cloudServerPassword = EnvConfig.POWERAUTH_CLOUD_PASSWORD || ""
    static cloudApplicationId = EnvConfig.POWERAUTH_CLOUD_APP_ID || ""
    static enrollmentUrl = EnvConfig.ENROLLMENT_SERVER_URL || ""
    // Test results collector
    static testCollectorUrl = EnvConfig.TEST_COLLECTOR_URL || ""
    // User Data Store
    static udsServerUrl = EnvConfig.UDS_SERVER_URL || ""
    static udsServerUsername = EnvConfig.UDS_SERVER_USERNAME || ""
    static udsServerPassword = EnvConfig.UDS_SERVER_PASSWORD || ""
}

export interface CustomConfig {
    configuration?: PowerAuthConfiguration,
    /** Algorithm used when the helper creates the default test configuration. */
    algorithm?: PowerAuthAlgorithm,
    clientConfiguration?: PowerAuthClientConfiguration,
    biometryConfiguration?: PowerAuthBiometryConfiguration,
    keychainConfiguration?: PowerAuthKeychainConfiguration,
    sharingConfiguration?: PowerAuthSharingConfiguration
}

/**
 * Biometry configuration for automated tests that must not display biometric prompts on Android.
 * Interactive biometry suites override this when they intentionally test prompt behavior.
 */
export function createNonInteractiveBiometryConfiguration(): PowerAuthBiometryConfiguration {
    const biometryConfiguration = new PowerAuthBiometryConfiguration()
    biometryConfiguration.authenticateOnBiometricKeySetup = false
    return biometryConfiguration
}

/** Whether the device has biometry enrolled and can run addBiometryFactor without system enrollment UI. */
export async function isBiometryEnrolledForTests(sdk: PowerAuth): Promise<boolean> {
    const status = await sdk.getBiometricStatus()
    return status.systemStatus === PowerAuthBiometryStatus.OK
}

/**
 * Most E2E tests still run PowerAuth protocol V3.3. Focused protocol-4 suites can
 * select another algorithm explicitly.
 */
export function createE2ePowerAuthConfiguration(
    configuration: string,
    baseEndpointUrl: string,
    offlineAuthenticationCodeComponentLength: number = 8,
    algorithm: PowerAuthAlgorithm = PowerAuthAlgorithm.LEGACY
): PowerAuthConfiguration {
    return new PowerAuthConfiguration(
        configuration,
        baseEndpointUrl,
        algorithm,
        offlineAuthenticationCodeComponentLength
    )
}

export class IntegrationHelper {

    private jsonMediaType = "application/json; charset=UTF-8"
    private applicationDetail?: ApplicationDetail

    get userId(): string | undefined {
        return this._userId
    }

    // mocked user info based on the user id
    userInfo(userId: string): PowerAuthUserInfo {
        return {
            subject: `${userId}`,
            name: `Name ${userId}`,
            givenName: `given`,
            familyName: `family`,
            middleName: `middle`,
            nickname: `nickname`,
            preferredUsername: `preferred${userId}`,
            profileUrl: `https://wultra.com/profile`,
            pictureUrl: `https://wultra.com/icon.png`,
            websiteUrl: `https://wultra.com`,
            email: `${userId}@wultra.com`,
            isEmailVerified: true,
            isPhoneNumberVerified: true,
            phoneNumber: "+56 (2) 687 2400",
            birthdate: "2000-04-01",
            gender: "female",
            zoneInfo: "Europe/Prague",
            locale: "cs-CZ",
            updatedAt: new Date(2025, 4, 1, 19, 20, 21).getTime(),
            userAddress: {
                formatted: "Street 1, Prague, Czech Republic",
                street: "Street 1",
                locality: "Prague",
                region: "Prague",
                postalCode: "15000",
                country: "CZ"
            }
        }
    };

    get sdk(): PowerAuth {
        return this._sdk
    }

    get createdActivation(): CreatedActivation | undefined {
        return this._createdActivation
    }

    private _userId?: string | undefined // will be filled when activation is created
    private _sdk: PowerAuth
    private _createdActivation?: CreatedActivation

    constructor(sdk: PowerAuth) {
        this._sdk = sdk
    }

    /** Cleanup after the test is finished */
    async cleanup(): Promise<void> {
        if (await this._sdk.isConfigured() == false) {
            return
        }

        const activationId = await this._sdk.getActivationIdentifier()

        // REMOVE ACTIVATION LOCALLY
        await this._sdk.removeActivationLocal()

        // REMOVE ACTIVATION ON THE SERVER
        if (activationId != null) {
            await this.removeRegistration(activationId)
        }

        await this._sdk.deconfigure()
    }

    // --- COMPLEX TASKS ---

    /// Creates a new activation on the server and locally.
    async prepareActiveActivation(password: string, userId: string | undefined = undefined, setupBiometry: boolean = false, biometryPrompt: string = "Create activation with biometrics"): Promise<void> {

        const resp = await this.createActivation(userId, true)

        // CREATE ACTIVATION LOCALLY

        await this._sdk.createActivation(PowerAuthActivation.createWithActivationCode(resp.activationCode, "tests"))

        // PERSIST ACTIVATION LOCALLY

        await this._sdk.persistActivation(setupBiometry ? PowerAuthAuthentication.persistWithPasswordAndBiometry(password, {
            promptTitle: "test",
            promptMessage: biometryPrompt
        }) : PowerAuthAuthentication.persistWithPassword(password))

        // COMMIT ACTIVATION ON THE SERVER

        //await this.makeCall('{ "externalUserId": "test" }', `${AppConfig.cloudServerUrl}/v2/registrations/${resp.registrationId}/commit`)
    }

    async configure(config?: CustomConfig): Promise<void> {

        // GET APPLICATION DETAIL FROM THE SERVER
        const appDetail = await this.getApplicationDetail()

        // CONFIGURE SDK
        await this._sdk.configure(
            config?.configuration ?? createE2ePowerAuthConfiguration(
                appDetail.mobileSdkConfig,
                AppConfig.enrollmentUrl,
                8,
                config?.algorithm
            ),
            config?.clientConfiguration,
            config?.biometryConfiguration ?? createNonInteractiveBiometryConfiguration(),
            config?.keychainConfiguration,
            config?.sharingConfiguration
        )

        // REMOVE LOCAL INSTANCE IF PRESENT

        await this._sdk.removeActivationLocal()
    }

    // --- SERVER CALLS ---

    async getApplicationDetail(): Promise<ApplicationDetail> {
        // If not cached, get application detail from the server.
        if (!this.applicationDetail) {
            this.applicationDetail = await this.makeCall(undefined, `${AppConfig.cloudServerUrl}/admin/applications/${AppConfig.cloudApplicationId}`, "GET")
        }
        // Check if the application detail contains mobileSdkConfig, which is required for SDK configuration.
        if (!this.applicationDetail?.mobileSdkConfig) {
            throw new Error("Application detail is missing mobileSdkConfig")
        }
        return this.applicationDetail
    }

    async createActivation(userId?: string, autoCommit: boolean = true): Promise<CreatedActivation> {

        const activationName = userId ?? IntegrationHelper.randomString(20)
        this._userId = activationName

        const body = `
            {
                "userId": "${activationName}",
                "flags": [],
                "appId": "${AppConfig.cloudApplicationId}",
                "commitPhase": "${autoCommit ? "ON_KEY_EXCHANGE" : "ON_COMMIT"}"
            }
            `
        const created = await this.makeCall(body, `${AppConfig.cloudServerUrl}/v2/registrations`) as CreatedActivation
        this._createdActivation = created
        return created
    }

    async commitActivation(registrationId?: string): Promise<void> {
        await this.makeCall("{}", `${AppConfig.cloudServerUrl}/v2/registrations/${registrationId ?? this._createdActivation?.registrationId}/commit`)
    }

    async removeRegistration(registrationId?: string): Promise<void> {
        await this.makeCall("", `${AppConfig.cloudServerUrl}/v2/registrations/${registrationId ?? this._createdActivation?.registrationId}`, "DELETE")
    }

    async getRegistrationDetail(registrationId?: string): Promise<RegistrationDetail> {
        const resp = await this.makeCall(undefined, `${AppConfig.cloudServerUrl}/v2/registrations/${registrationId ?? this._createdActivation?.registrationId}`, "GET")
        return resp
    }

    async changeActivation(change: "BLOCK" | "UNBLOCK", registrationId?: string): Promise<void> {
        await this.makeCall(`{"change":"${change}"}`, `${AppConfig.cloudServerUrl}/v2/registrations/${registrationId ?? this._createdActivation?.registrationId}`, "PUT")
    }

    async verifySignature(method: string, uriId: string, body: string, authHeader: string, queryParams?: Record<string, string>, requestUsesParams: boolean = queryParams !== undefined): Promise<SignatureResponse> {
        const payload = JSON.stringify({
            method,
            uriId,
            authHeader,
            requestBody: requestUsesParams ? null : btoa(body),
            queryParams: requestUsesParams ? queryParams ?? null : null
        })
        return await this.makeCall(payload, `${AppConfig.cloudServerUrl}/v2/signature/verify`)
    }

    async verifyToken(authHeader: string): Promise<TokenResponse> {
        const payload = `
            {
                "authHeader": "${authHeader.replace(/\"/g, '\\\"')}"
            }
        `;
        return await this.makeCall(payload, `${AppConfig.cloudServerUrl}/v2/token/verify`)
    }

    /**
     * Function fills user info to the UDS server.
     *
     * @param userInfo User info to be filled.
     * */
    async fillUserInfo(userInfo: PowerAuthUserInfo | undefined) {
        if (!userInfo) {
            throw new Error("UserInfo is undefined");
        }

        // we need to convert PowerAuthUserInfo into payload
        const payload = {
            sub: userInfo.subject,
            name: userInfo.name,
            given_name: userInfo.givenName,
            family_name: userInfo.familyName,
            middle_name: userInfo.middleName,
            nickname: userInfo.nickname,
            preferred_username: userInfo.preferredUsername,
            profile: userInfo.profileUrl,
            picture: userInfo.pictureUrl,
            website: userInfo.websiteUrl,
            email: userInfo.email,
            email_verified: userInfo.isEmailVerified,
            phone_number: userInfo.phoneNumber,
            phone_number_verified: userInfo.isPhoneNumberVerified,
            gender: userInfo.gender,
            birthdate: userInfo.birthdate,
            zoneinfo: userInfo.zoneInfo,
            locale: userInfo.locale,
            updated_at: userInfo.updatedAt,
            address: {
                street_address: userInfo.userAddress?.street,
                postal_code: userInfo.userAddress?.postalCode,
                locality: userInfo.userAddress?.locality,
                region: userInfo.userAddress?.region,
                country: userInfo.userAddress?.country,
                formatted: userInfo.userAddress?.formatted
            }
        }

        return await this.makeCall(
            JSON.stringify(payload),
            `${AppConfig.udsServerUrl}/public/user-claims?userId=${userInfo.subject}`,
            "POST"
        );
    }

    // --- HELPER FUNCTIONS ---

    async callSDKEndpoint(endpoint: string, body: string, headers?: Headers, method: string = "POST"): Promise<any> {
        const url = this.sdkEndpointUrl(endpoint)
        const request: RequestInit = {
            body: body,
            headers: headers,
            method: method
        }
        return await fetch(url, request)
            .then(response => response.text())
            .then(stringResp => {
                return JSON.parse(stringResp)
            })
    }

    /** Calls an SDK endpoint and returns the response body as Base64. */
    async callRawSDKEndpoint(endpoint: string, bodyBase64: string, headers?: Headers, method: string = "POST"): Promise<string> {
        const url = this.sdkEndpointUrl(endpoint)
        const bodyBytes = Buffer.from(bodyBase64, 'base64')
        // RN should accept Uint8Array and forward it as a native base64 body, but Android
        // fetch fails with "Network request failed" for typed-array bodies in e2e. A binary
        // string uses the string body path where UTF-8 encoding preserves each byte 0x00-0xFF.
        const body = Platform.OS === 'android'
            ? bodyBytes.toString('latin1')
            : bodyBytes
        const response = await fetch(url, {
            body,
            headers: headers,
            method: method
        })
        return Buffer.from(await response.arrayBuffer()).toString('base64')
    }

    private sdkEndpointUrl(endpoint: string): string {
        return `${AppConfig.enrollmentUrl.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`
    }

    private async makeCall(payload: string | undefined, url: string, method: string = "POST"): Promise<any> {
        const request: RequestInit = {
            body: payload,
            headers: {
                "authorization": `Basic ${btoa(this.credentialsForUrl(url))}`,
                "content-type": this.jsonMediaType
            },
            method: method
        }
        return await fetch(url, request)
            .then(response => response.text())
            .then(stringResp => {
                return JSON.parse(stringResp)
            })
    }

    // Create credentials for the given URL - PowerAuth Cloud or UDS Server
    private credentialsForUrl(url: string): string {
        if (url.startsWith(AppConfig.cloudServerUrl)) {
            return `${AppConfig.cloudServerLogin}:${AppConfig.cloudServerPassword}`
        } else if (url.startsWith(AppConfig.udsServerUrl)) {
            return `${AppConfig.udsServerUsername}:${AppConfig.udsServerPassword}`
        } else {
            throw new Error(`Unknown server URL: ${url}`)
        }
    }

    static randomString(length: number): string {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        let result = ''
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        return result
    }
}

interface CreatedActivation {
  activationCode: string
  activationCodeSignature: string
  activationQrCodeData: string
  registrationId: string
}

interface ApplicationDetail {
    id: string
    serviceBaseUrl: string
    appKey: string
    appSecret: string
    mobileSdkConfig: string
}

interface RegistrationDetail {
  registrationId?: string
  registrationStatus?: string
  blockedReason?: string
  applicationId?: string
  name?: string
  platform?: string
  deviceInfo?: string
  flags?: string[]
  timestampCreated?: number
  timestampLastUsed?: number
  userId?: string
  activationQrCodeData?: string
  activationCode?: string
  activationCodeSignature?: string
}

interface SignatureResponse {
  signatureValid: boolean
  userId: string
  registrationId: string
  registrationStatus: string
  signatureType: string
  remainingAttempts: number
}

interface TokenResponse {
  tokenValid: boolean
  userId?: string
  registrationId?: string
  registrationStatus?: string
  signatureType?: string
}
