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

import { PowerAuth, PowerAuthActivation, PowerAuthAuthentication, PowerAuthBiometryConfiguration, PowerAuthClientConfiguration, PowerAuthConfiguration, PowerAuthKeychainConfiguration, PowerAuthSharingConfiguration } from "react-native-powerauth-mobile-sdk"
import { Config as EnvConfig } from "react-native-config"

export class AppConfig {
    static cloudServerUrl = EnvConfig.POWERAUTH_CLOUD_URL || ""
    static cloudServerLogin = EnvConfig.POWERAUTH_CLOUD_USERNAME || ""
    static cloudServerPassword = EnvConfig.POWERAUTH_CLOUD_PASSWORD || ""
    static cloudApplicationId = EnvConfig.POWERAUTH_CLOUD_APP_ID || ""
    static enrollmentUrl = EnvConfig.ENROLLMENT_SERVER_URL || ""
    static sdkConfig = EnvConfig.SDK_CONFIG || ""
}

export interface CustomConfig {
    configuration?: PowerAuthConfiguration,
    clientConfiguration?: PowerAuthClientConfiguration,
    biometryConfiguration?: PowerAuthBiometryConfiguration,
    keychainConfiguration?: PowerAuthKeychainConfiguration,
    sharingConfiguration?: PowerAuthSharingConfiguration
}

export class IntegrationHelper {
    
    private jsonMediaType = "application/json; charset=UTF-8"

    get userId(): string | undefined {
        return this._userId
    }

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

        const resp = await this.createActivation(userId)

        // CREATE ACTIVATION LOCALLY

        await this._sdk.createActivation(PowerAuthActivation.createWithActivationCode(resp.activationCode, "tests"))

        // PERSIST ACTIVATION LOCALLY

        await this._sdk.persistActivation(setupBiometry ? PowerAuthAuthentication.persistWithPasswordAndBiometry(password, { promptMessage: biometryPrompt }) : PowerAuthAuthentication.persistWithPassword(password))

        // COMMIT ACTIVATION ON THE SERVER

        //await this.makeCall('{ "externalUserId": "test" }', `${AppConfig.cloudServerUrl}/v2/registrations/${resp.registrationId}/commit`)
    }

    async configure(config?: CustomConfig): Promise<void> {

        // CONFIGURE SDK
        await this._sdk.configure(
            config?.configuration ?? new PowerAuthConfiguration(AppConfig.sdkConfig, AppConfig.enrollmentUrl), 
            config?.clientConfiguration, 
            config?.biometryConfiguration, 
            config?.keychainConfiguration, 
            config?.sharingConfiguration
        )

        // REMOVE LOCAL INSTANCE IF PRESENT

        await this._sdk.removeActivationLocal()
    }

    // --- SERVER CALLS ---

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

    async verifySignature(method: string, uriId: string, body: string, authHeader: string): Promise<SignatureResponse> {
        const payload = `
            {
            "method": "${method}",
            "uriId": "${uriId}",
            "authHeader": "${authHeader.replaceAll("\"", "\\\"")}",
            "requestBody": "${btoa(body)}"
            }
            `;
        return await this.makeCall(payload, `${AppConfig.cloudServerUrl}/v2/signature/verify`)
    }

    // --- HELPER FUNCTIONS ---

    async callSDKEndpoint(endpoint: string, body: string, headers?: Headers, method: string = "POST"): Promise<any> {
        const url = `${AppConfig.enrollmentUrl}/${endpoint}`
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

    private async makeCall(payload: string | undefined, url: string, method: string = "POST"): Promise<any> {
        const creds = `${AppConfig.cloudServerLogin}:${AppConfig.cloudServerPassword}`
        const request: RequestInit = {
            body: payload,
            headers: {
                "authorization": `Basic ${btoa(creds)}`,
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