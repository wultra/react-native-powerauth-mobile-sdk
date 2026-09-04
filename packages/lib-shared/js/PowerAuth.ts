/*
 * Copyright 2021 Wultra s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { PowerAuthConfigurationType, buildConfiguration } from './model/PowerAuthConfiguration';
import { buildClientConfiguration, PowerAuthClientConfigurationType } from './model/PowerAuthClientConfiguration';
import { buildBiometryConfiguration, PowerAuthBiometryConfigurationType } from './model/PowerAuthBiometryConfiguration';
import { buildKeychainConfiguration, PowerAuthKeychainConfigurationType } from './model/PowerAuthKeychainConfiguration';
import { PowerAuthAuthorizationHttpHeader } from './model/PowerAuthAuthorizationHttpHeader';
import { PowerAuthHttpHeader } from './model/PowerAuthHttpHeader';
import { PowerAuthActivationStatus } from './model/PowerAuthActivationStatus';
import { PowerAuthAuthentication, PowerAuthBiometricPrompt } from './model/PowerAuthAuthentication';
import { PowerAuthCreateActivationResult } from './model/PowerAuthCreateActivationResult';
import { PowerAuthActivation } from './model/PowerAuthActivation';
import { PowerAuthBiometryInfo } from './model/PowerAuthBiometryInfo';
import { PowerAuthBiometricStatus } from './model/PowerAuthBiometricStatus';
import { PowerAuthError, PowerAuthErrorCode } from './model/PowerAuthError';
import { PowerAuthTokenStore } from "./PowerAuthTokenStore";
import { PowerAuthEncryptor, PowerAuthEncryptorImpl } from './model/PowerAuthEncryptor';
import { PowerAuthUserInfo } from "./model/PowerAuthUserInfo";
import { NativeWrapper } from "./internal/NativeWrapper";
import { resolveAuthentication } from "./internal/AuthResolver";
import { PasswordType, PowerAuthPassword } from './model/PowerAuthPassword';
import { PowerAuthPasswordChangeData } from './model/PowerAuthPasswordChangeData';
import { PowerAuthRawAuthentication, toPowerAuthRawPassword } from './model/PowerAuthNativeTypes';
import { buildSharingConfiguration, PowerAuthSharingConfigurationType } from './model/PowerAuthSharingConfiguration';
import { PowerAuthExternalPendingOperation } from './model/PowerAuthExternalPendingOperation';
import { PowerAuthDataFormat } from "./model/PowerAuthDataFormat"
import { PowerAuthTimeSynchronizationService } from './PowerAuthTimeSynchronizationService';
import { PowerAuthUtils } from "./PowerAuthUtils";
import { PowerAuthAlgorithm } from "./model/PowerAuthAlgorithm";
import { PowerAuthProtocolUpgradeResult } from "./model/PowerAuthProtocolUpgradeResult";

/**
 * Class used for the main interaction with the PowerAuth SDK components.
 */
export class PowerAuth {

    /** Effective native configuration used to configure this instance. */
    get configuration(): Promise<PowerAuthConfigurationType> {
        return NativeWrapper.thisCall("getConfiguration", this.instanceId)
    }

    /** Algorithm currently used for communication with the PowerAuth Server. */
    get currentAlgorithm(): Promise<PowerAuthAlgorithm> {
        return NativeWrapper.thisCall("getCurrentAlgorithm", this.instanceId)
    }

    /**
     * Effective native client configuration used to configure this instance.
     * Input-only HTTP headers and basic-auth credentials are not returned.
     */
    get clientConfiguration(): Promise<PowerAuthClientConfigurationType> {
        return NativeWrapper.thisCall("getClientConfiguration", this.instanceId)
    }

    /** Effective native biometry configuration used to configure this instance. */
    get biometryConfiguration(): Promise<PowerAuthBiometryConfigurationType> {
        return NativeWrapper.thisCall("getBiometryConfiguration", this.instanceId)
    }

    /** Effective Android keychain configuration, or `undefined` on Apple platforms. */
    get keychainConfiguration(): Promise<PowerAuthKeychainConfigurationType | undefined> {
        return NativeWrapper.thisCallNull("getKeychainConfiguration", this.instanceId)
    }

    /** Apple sharing configuration, or `undefined` when sharing is not configured or on Android. */
    get sharingConfiguration(): Promise<PowerAuthSharingConfigurationType | undefined> {
        return NativeWrapper.thisCallNull("getSharingConfiguration", this.instanceId)
    }

    /** Object for managing access tokens. */
    readonly tokenStore: PowerAuthTokenStore;

    /** Object providing functions to synchronize time with the server. */
    readonly timeSynchronizationService: PowerAuthTimeSynchronizationService;

    /**
     * Prepares the PowerAuth instance.
     * 
     * 2 instances with the same instanceId will be internaly the same object!
     * 
     * @param instanceId Identifier of the PowerAuthSDK instance. The bundle identifier/packagename is recommended.
     */
    constructor(public readonly instanceId: string) {
        this.tokenStore = new PowerAuthTokenStore(instanceId);
        this.timeSynchronizationService = new PowerAuthTimeSynchronizationService(instanceId);
    }

    /**
     * Removes local data for an instance that cannot be configured due to an incompatible data format.
     * Use the same values that were used when configuration failed.
     */
    static cleanupInstanceData(
        instanceId: string,
        configuration: PowerAuthConfigurationType,
        keychainConfiguration?: PowerAuthKeychainConfigurationType,
        sharingConfiguration?: PowerAuthSharingConfigurationType
    ): Promise<void> {
        return NativeWrapper.staticCall(
            "cleanupInstanceData",
            instanceId,
            buildConfiguration(configuration),
            buildKeychainConfiguration(keychainConfiguration),
            buildSharingConfiguration(sharingConfiguration)
        )
    }

    /** If this PowerAuth instance was configured. */
    async isConfigured(): Promise<boolean> {
        return NativeWrapper.thisCallBool("isConfigured", this.instanceId);
    }

    /**
     * Prepares the PowerAuth instance with an advanced configuration. The method needs to be called before before any other method.
     * 
     * @param configuration Configuration object with basic parameters for `PowerAuth` class.
     * @param clientConfiguration  Configuration for internal HTTP client. If `undefined`, then the default configuration is used.
     * @param biometryConfiguration Biometry configuration. If `undefined`, then the default configuration is used.
     * @param keychainConfiguration Configuration for internal keychain storage. If `undefined`, then the default configuration is used.
     * @param sharingConfiguration Configuration for iOS activation data sharing. If `undefined`, then no sharing configuration is applied.
     */
    configure(
        configuration: PowerAuthConfigurationType,
        clientConfiguration?: PowerAuthClientConfigurationType,
        biometryConfiguration?: PowerAuthBiometryConfigurationType,
        keychainConfiguration?: PowerAuthKeychainConfigurationType,
        sharingConfiguration?: PowerAuthSharingConfigurationType
    ): Promise<boolean>;

    /**
     * Prepares the PowerAuth instance with a basic configuration. The method needs to be called before before any other method.
     * If you have to tweak more configuration properties, then use method variant with the configuration objects as parameters.
     * 
     * @param configuration String with the cryptographic configuration.
     * @param baseEndpointUrl Base URL to the PowerAuth Standard RESTful API (the URL part before "/pa/...").
     * @param enableUnsecureTraffic If HTTP and invalid HTTPS communication should be enabled
     * @returns Promise that with result of the configuration (can by rejected if already configured).
     */
    configure(
        configuration: string,
        baseEndpointUrl: string,
        enableUnsecureTraffic: boolean
    ): Promise<boolean>;

    configure(param1: PowerAuthConfigurationType | string, ...args: Array<any>): Promise<boolean> {
        let configuration: PowerAuthConfigurationType
        let clientConfiguration: PowerAuthClientConfigurationType
        let biometryConfiguration: PowerAuthBiometryConfigurationType
        let keychainConfiguration: PowerAuthKeychainConfigurationType
        let sharingConfiguration: PowerAuthSharingConfigurationType
        if (typeof param1 === 'string') {
            configuration = buildConfiguration({
                configuration: param1,
                baseEndpointUrl: args[0]})
            clientConfiguration = buildClientConfiguration({enableUnsecureTraffic: args[1]})
            biometryConfiguration = buildBiometryConfiguration()
            keychainConfiguration = buildKeychainConfiguration()
            sharingConfiguration = buildSharingConfiguration()
        } else {
            configuration = buildConfiguration(param1)
            clientConfiguration = buildClientConfiguration(args[0])
            biometryConfiguration = buildBiometryConfiguration(args[1])
            keychainConfiguration = buildKeychainConfiguration(args[2])
            sharingConfiguration = buildSharingConfiguration(args[3])
        }
        return NativeWrapper.thisCallBool("configure", this.instanceId, configuration, clientConfiguration, biometryConfiguration, keychainConfiguration, sharingConfiguration)
    }

    /** Deconfigures the instance */
    deconfigure(): Promise<boolean> {
        return NativeWrapper.thisCallBool("deconfigure", this.instanceId);
    }

    /**
     * Checks if there is a valid activation.
     * 
     * @returns true if there is a valid activation, false otherwise.
     */
    hasValidActivation(): Promise<boolean> {
        return NativeWrapper.thisCallBool("hasValidActivation", this.instanceId);
    }

    /**
     * Check if it is possible to start an activation process.
     * 
     * @returns true if activation process can be started, false otherwise.
     */
    canStartActivation(): Promise<boolean> {
        return NativeWrapper.thisCallBool("canStartActivation", this.instanceId);
    }

    /**
     * Checks if there is a pending activation (activation in progress).
     * 
     * @returns true if there is a pending activation, false otherwise.
     */
    hasPendingActivation(): Promise<boolean> {
        return NativeWrapper.thisCallBool("hasPendingActivation", this.instanceId);
    }

    /**
     * Check if there's an external pending operation started in another application.
     * 
     * @returns A promise with information about external pending operation.
     */
    getExternalPendingOperation(): Promise<PowerAuthExternalPendingOperation | undefined> {
        return NativeWrapper.thisCallNull("getExternalPendingOperation", this.instanceId);
    }

    /**
     * Fetch the activation status for current activation.
     * 
     * The following calls to PowerAuth Standard RESTful API endpoints are performed on the background:
     * - `/pa/activation/status` - to get the activation status
     * - `/pa/upgrade/start` - (optional) in case that protocol upgrade is required.
     * - `/pa/upgrade/commit` - (optional) in case that protocol upgrade is required.
     * - `/pa/signature/validate` - (optional) as a prevention to local counter desynchronization.
     * 
     * @returns A promise with activation status result - it contains status information in case of success and error in case of failure.
     */
    fetchActivationStatus(): Promise<PowerAuthActivationStatus> {
        return NativeWrapper.thisCall("fetchActivationStatus", this.instanceId);
    }

    /**
     * Returns `true` if a protocol upgrade is available for the current activation.
     *
     * The result reflects locally stored activation status. Call
     * `fetchActivationStatus()` first to obtain the latest information from the server.
     */
    hasProtocolUpgradeAvailable(): Promise<boolean> {
        return NativeWrapper.thisCallBool("hasProtocolUpgradeAvailable", this.instanceId);
    }

    /**
     * Returns `true` if a protocol upgrade has started but has not yet finished.
     */
    hasPendingProtocolUpgrade(): Promise<boolean> {
        return NativeWrapper.thisCallBool("hasPendingProtocolUpgrade", this.instanceId);
    }

    /**
     * Starts a protocol upgrade for the current activation.
     *
     * On Android, set `upgradeBiometry` to `true` to migrate an existing local
     * biometry factor. This is supported only when `authenticateOnBiometricKeySetup`
     * is disabled. Otherwise, use the default value and add the biometry factor
     * again after the upgrade if it was removed. On iOS, the native SDK preserves
     * the factor automatically.
     *
     * If the result requires an activation status fetch, call
     * `fetchActivationStatus()` to finish the upgrade.
     *
     * @param password Password authorizing the protocol upgrade.
     * @param upgradeBiometry Whether Android should migrate the local biometry factor.
     */
    async startProtocolUpgrade(
        password: PasswordType,
        upgradeBiometry: boolean = false
    ): Promise<PowerAuthProtocolUpgradeResult> {
        return NativeWrapper.thisCall(
            "startProtocolUpgrade",
            this.instanceId,
            await toPowerAuthRawPassword(password),
            upgradeBiometry
        );
    }

    /**
     * Create a new activation by calling a PowerAuth Standard RESTful API endpoint `/pa/activation/create`.
     * 
     * @param activation A PowerAuthActivation object containg all information required for the activation creation.
     */
    async createActivation(activation: PowerAuthActivation): Promise<PowerAuthCreateActivationResult> {
        const result: PowerAuthCreateActivationResult = await NativeWrapper.thisCall("createActivation", this.instanceId, activation);
        // if the userInfo object exists, we need to expand it from allClaims
        if (result.userInfo) {
            result.userInfo = PowerAuthUtils.expandUserInfoObject(result.userInfo);
        }
        return result;
    }

    /**
     * Persists activation that was created and store related data using provided authentication instance.
     * On Android, biometric persistence requires a biometric prompt when
     * `authenticateOnBiometricKeySetup` is enabled. If disabled, biometric key setup proceeds
     * without displaying a prompt.
     * 
     * @param authentication An authentication instance specifying what factors should be stored.
     */
    async persistActivation(authentication: PowerAuthAuthentication): Promise<void> {
        return NativeWrapper.thisCall("persistActivation", this.instanceId, await authentication.convertLegacyObject(true).toRawAuthentication());
    }

    /** Activation identifier or undefined if object has no valid activation. */
    getActivationIdentifier(): Promise<string | undefined> {
        return NativeWrapper.thisCallNull("activationIdentifier", this.instanceId);
    }

    /** Fingerprint calculated from device's public key or undefined if object has no valid activation. */
    getActivationFingerprint(): Promise<string | undefined> {
        return NativeWrapper.thisCallNull("activationFingerprint", this.instanceId);
    }

    /**
     * Remove current activation by calling a PowerAuth Standard RESTful API endpoint `/pa/activation/remove`. The user can authenticate with password
     * or with biometry, if biometric factor is configured in the current activation. In case of biometry, the system biometric authentication dialog 
     * is displayed, so the operation may take an undefined amount of time to complete.
     * 
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     */
    async removeActivationWithAuthentication(authentication: PowerAuthAuthentication): Promise<void> {
        return NativeWrapper.thisCall("removeActivationWithAuthentication", this.instanceId, await this.authenticate(authentication));
    }

    /**
     * This method removes the activation session state and biometry factor key. Cached possession related key remains intact.
     * Unlike the `removeActivationWithAuthentication()`, this method doesn't inform server about activation removal. In this case
     * user has to remove the activation by using another channel (typically internet banking, or similar web management console)
     */
    removeActivationLocal(): Promise<void> {
        return NativeWrapper.thisCall("removeActivationLocal", this.instanceId);
    }

    /**
     * Computes an HTTP authentication header for a request with query parameters.
     * Be aware that if `PowerAuthAuthentication.useBiometry` is true, then the system biometric authentication dialog is displayed, so the operation
     * may take an undefined amount of time to complete.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     * @param method HTTP method used for the authentication code computation.
     * @param uriId URI identifier.
     * @param params HTTP query params.
     * @returns HTTP header with a PowerAuth authentication code.
     */
    async authenticationHeaderForRequestWithParams(authentication: PowerAuthAuthentication, method: string, uriId: string, params?: Record<string, string>): Promise<PowerAuthHttpHeader> {
        return NativeWrapper.thisCall("authenticationHeaderForRequestWithParams", this.instanceId, await this.authenticate(authentication), method, uriId, params ?? undefined);
    }

    /**
     * Computes an HTTP authentication header for a request with a UTF-8 body.
     * Be aware that if `PowerAuthAuthentication.useBiometry` is true, then the system biometric authentication dialog is displayed, so the operation
     * may take an undefined amount of time to complete.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     * @param method HTTP method used for the authentication code computation.
     * @param uriId URI identifier.
     * @param body Optional HTTP request body represented as a UTF-8 string.
     * @returns HTTP header with a PowerAuth authentication code.
     */
    async authenticationHeaderForRequestWithBody(authentication: PowerAuthAuthentication, method: string, uriId: string, body?: string): Promise<PowerAuthHttpHeader> {
        return NativeWrapper.thisCall("authenticationHeaderForRequestWithBody", this.instanceId, await this.authenticate(authentication), method, uriId, body);
    }

    /**
     * Computes the HTTP authentication header for a GET request with query parameters.
     * @deprecated Use `authenticationHeaderForRequestWithParams()` and provide the HTTP method explicitly.
     */
    async requestGetSignature(authentication: PowerAuthAuthentication, uriId: string, params?: any): Promise<PowerAuthAuthorizationHttpHeader> {
        const header = await this.authenticationHeaderForRequestWithParams(authentication, "GET", uriId, params ?? undefined);
        return { key: header.name, value: header.value };
    }

    /**
     * Computes the HTTP authentication header for a request with a UTF-8 body.
     * @deprecated Use `authenticationHeaderForRequestWithBody()`.
     */
    async requestSignature(authentication: PowerAuthAuthentication, method: string, uriId: string, body?: string): Promise<PowerAuthAuthorizationHttpHeader> {
        const header = await this.authenticationHeaderForRequestWithBody(authentication, method, uriId, body);
        return { key: header.name, value: header.value };
    }

    /**
     * Computes an offline PowerAuth authentication code for the URI identifier and UTF-8 request body. Be aware that if
     * `PowerAuthAuthentication.useBiometry` is true, then the system biometric authentication dialog is displayed, so the operation may take an undefined
     * amount of time to complete.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request. The possession and knowledge is recommended.
     * @param uriId URI identifier.
     * @param body Optional HTTP request body represented as a UTF-8 string.
     * @param nonce NONCE in Base64 format.
     * @returns Offline authentication code calculated for all involved factors.
     */
    async offlineAuthenticationCode(authentication: PowerAuthAuthentication, uriId: string, nonce: string, body?: string): Promise<string> {
        return NativeWrapper.thisCall("offlineAuthenticationCode", this.instanceId, await this.authenticate(authentication), uriId, body, nonce);
    }

    /**
     * Computes an offline PowerAuth authentication code.
     * @deprecated Use `offlineAuthenticationCode()`.
     */
    async offlineSignature(authentication: PowerAuthAuthentication, uriId: string, nonce: string, body?: string): Promise<string> {
        return this.offlineAuthenticationCode(authentication, uriId, nonce, body);
    }

    /**
     * Validates whether the data has been signed with master server private key or personalized server's private key.
     *
     * @param data An arbitrary data
     * @param signature A signature calculated for data, in Base64 format
     * @param masterKey If `true`, then master server public key is used for validation, otherwise personalized server's public key.
     */
    verifyServerSignedData(data: string, signature: string, masterKey: boolean): Promise<boolean> {
        return NativeWrapper.thisCallBool("verifyServerSignedData", this.instanceId, data, signature, masterKey);
    }

    /**
     * Begins a password change by validating the old password on the server.
     *
     * Call `release()` on the returned object if the operation is abandoned.
     *
     * @param oldPassword Password currently used for the knowledge factor.
     */
    async beginPasswordChange(oldPassword: PasswordType): Promise<PowerAuthPasswordChangeData> {
        return PowerAuthPasswordChangeData.begin(
            this.instanceId,
            await toPowerAuthRawPassword(oldPassword)
        )
    }

    /**
     * Finishes a password change initiated by `beginPasswordChange()`.
     *
     * The password-change data is consumed and released regardless of whether the operation
     * succeeds or fails.
     *
     * @param newPassword New password to use for the knowledge factor.
     * @param passwordChangeData Data returned by `beginPasswordChange()`.
     */
    async finishPasswordChange(
        newPassword: PasswordType,
        passwordChangeData: PowerAuthPasswordChangeData
    ): Promise<void> {
        return passwordChangeData.executeAndRelease(async objectId =>
            NativeWrapper.thisCall(
                "finishPasswordChange",
                this.instanceId,
                await toPowerAuthRawPassword(newPassword),
                objectId
            )
        )
    }

    /**
     * Change the password, validate old password by calling PowerAuth Standard RESTful API endpoints.
     *
     * @param oldPassword Old password, currently set to store the data.
     * @param newPassword New password, to be set in case authentication with old password passes.
     * @deprecated Use `beginPasswordChange()` and `finishPasswordChange()`.
     */
    async changePassword(oldPassword: PasswordType, newPassword: PasswordType): Promise<void> {
        const changeData = await this.beginPasswordChange(oldPassword)
        return this.finishPasswordChange(newPassword, changeData)
    }

    /**
     * Change the password using local re-encryption, do not validate old password by calling any endpoint.
     *
     * You are responsible for validating the old password against some server endpoint yourself before using it in this method.
     * If you do not validate the old password to make sure it is correct, calling this method will corrupt the local data, since
     * existing data will be decrypted using invalid PIN code and re-encrypted with a new one.

     @param oldPassword Old password, currently set to store the data.
     @param newPassword New password, to be set in case authentication with old password passes.
     @returns Returns true in case password was changed without error, false otherwise.
     @deprecated Use `beginPasswordChange()` and `finishPasswordChange()`.
     */
    async unsafeChangePassword(oldPassword: PasswordType, newPassword: PasswordType): Promise<boolean> {
        return NativeWrapper.thisCallBool("unsafeChangePassword", this.instanceId, await toPowerAuthRawPassword(oldPassword), await toPowerAuthRawPassword(newPassword));
    }

    /**
     * Change the password using unsafe local re-encryption.
     *
     * You are responsible for validating the old password against a server endpoint before using
     * this method. An incorrect old password corrupts the local activation data and makes it
     * irreversibly unusable.
     *
     * @deprecated Use `beginPasswordChange()` and `finishPasswordChange()`.
     */
    async changePasswordUnsafe(oldPassword: PasswordType, newPassword: PasswordType): Promise<boolean> {
        return this.unsafeChangePassword(oldPassword, newPassword)
    }

    /**
     * Regenerate a biometry related factor key. This variant of method is useful only on iOS platform or on Android, if `authenticateOnBiometricKeySetup` is `false`.
     * This method calls PowerAuth Standard RESTful API endpoint `/pa/vault/unlock` to obtain the vault encryption key used for original private key decryption.
     *
     * @param password Password used for authentication during vault unlocking call.
     */
    addBiometryFactor(password: PasswordType): Promise<void>

    /**
     * Regenerate a biometry related factor key.
     * This method calls PowerAuth Standard RESTful API endpoint `/pa/vault/unlock` to obtain the vault encryption key used for original private key decryption.
     *
     * @param password Password used for authentication during vault unlocking call.
     * @param prompt Prompt to be displayed. Parameter is required on Android platform if `authenticateOnBiometricKeySetup` is `true`.
     */
    addBiometryFactor(password: PasswordType, prompt: PowerAuthBiometricPrompt | undefined): Promise<void>

    /**
     * Regenerate a biometry related factor key.
     * This method calls PowerAuth Standard RESTful API endpoint `/pa/vault/unlock` to obtain the vault encryption key used for original private key decryption.
     *
     * @param password Password used for authentication during vault unlocking call.
     * @param title Title for biometry dialog. Parameter is required on Android platform if `authenticateOnBiometricKeySetup` is `true`.
     * @param description Description for biometry dialog. Parameter is required on Android platform if `authenticateOnBiometricKeySetup` is `true`.
     */
    addBiometryFactor(password: PasswordType, title: string, description: string): Promise<void>

    async addBiometryFactor(password: PasswordType,  ...args: any[]): Promise<void> {
        let prompt: PowerAuthBiometricPrompt | undefined
        if (typeof args[0] === 'string' && typeof args[1] === 'string') {
            prompt = { promptTitle: args[0], promptMessage: args[1] }
        } else {
            prompt = args[0]
        }
        return NativeWrapper.thisCall("addBiometryFactor", this.instanceId, await toPowerAuthRawPassword(password), prompt);
    }

    /** 
     * Checks if a biometry related factor is present.
     * This method returns the information about the key value being present in keychain.
     */
    hasBiometryFactor(): Promise<boolean> {
        return NativeWrapper.thisCallBool("hasBiometryFactor", this.instanceId);
    }

    /**
     * Remove the biometry related factor key.
     */
    removeBiometryFactor(): Promise<void> {
        return NativeWrapper.thisCall("removeBiometryFactor", this.instanceId);
    }

    /**
     * Returns biometry info data.
     *
     * @returns object with information data about biometry
     * @deprecated Use the instance-aware `getBiometricStatus()` method.
     */
    getBiometryInfo(): Promise<PowerAuthBiometryInfo> {
        return NativeWrapper.thisCall("getBiometryInfo", this.instanceId);
    }

    /**
     * Returns the biometric authentication status for this configured `PowerAuth` instance.
     */
    getBiometricStatus(): Promise<PowerAuthBiometricStatus> {
        return NativeWrapper.thisCall("getBiometricStatus", this.instanceId);
    }

    /**
     * Returns whether biometric authentication is available for the current activation.
     */
    isAuthenticationWithBiometricsAvailable(): Promise<boolean> {
        return NativeWrapper.thisCallBool("isAuthenticationWithBiometricsAvailable", this.instanceId);
    }

    /**
     * Generate a derived encryption key with given index. The key is returned in form of base64 encoded string.
     *
     * This method calls PowerAuth Standard RESTful API endpoint `/pa/vault/unlock` to obtain the vault encryption key used
     * for subsequent key derivation using given index.
     *
     * @param authentication Authentication used for vault unlocking call.
     * @param index Index of the derived key using KDF.
     */
    async fetchEncryptionKey(authentication: PowerAuthAuthentication, index: number): Promise<string> {
        return NativeWrapper.thisCall("fetchEncryptionKey", this.instanceId, await this.authenticate(authentication), index);
    }

    /**
     * Sign given data with the original device private key (asymetric signature).
     *
     * This method calls PowerAuth Standard RESTful API endpoint `/pa/vault/unlock` to obtain the vault encryption key
     * used for private key decryption. Data is then signed using ECDSA algorithm with this key and can be validated on the server side.
     *
     * @param authentication Authentication used for vault unlocking call.
     * @param data Data to be signed with the private key.
     * @param dataFormat Data format of the input data.
     */
    async signDataWithDevicePrivateKey(authentication: PowerAuthAuthentication, data: string, dataFormat: PowerAuthDataFormat): Promise<string> {
        return NativeWrapper.thisCall("signDataWithDevicePrivateKey", this.instanceId, await this.authenticate(authentication), data, dataFormat);
    }

    /**
     * Validate a user password.
     *
     * This method calls PowerAuth Standard RESTful API endpoint `/pa/signature/validate` to validate the signature value.
     *
     * @param password Password to be verified.
     * @deprecated Use `beginPasswordChange()` and release the returned data if no password change follows.
     */
    async validatePassword(password: PasswordType): Promise<void> {
        const changeData = await this.beginPasswordChange(password)
        return changeData.release()
    }

    /**
     * Helper method for grouping biometric authentications.
     *
     * With this method, you can use 1 biometric authentication (dialog) for several operations.
     * Just use the `reusableAuthentication` variable inside the `groupedAuthenticationCalls` callback.
     *
     * Be aware, that you must not execute the next HTTP request signed with the same credentials when the previous one
     * fails with the 401 HTTP status code. If you do, then you risk blocking the user's activation on the server.
     *
     * @param authentication authentication object
     * @param groupedAuthenticationCalls call that will use reusable authentication object
     */
    async groupedBiometricAuthentication(authentication: PowerAuthAuthentication, groupedAuthenticationCalls: (reusableAuthentication: PowerAuthAuthentication) => Promise<void>): Promise<void> {
        if (!await this.isConfigured()) {
            throw new PowerAuthError(undefined, "Instance is not configured", PowerAuthErrorCode.INSTANCE_NOT_CONFIGURED);
        }
        const reusable = await resolveAuthentication(this.instanceId, authentication, true);
        if (reusable.isBiometricAuthentication == false) {
            throw new PowerAuthError(undefined, "Authentication object is not configured for biometric factor", PowerAuthErrorCode.WRONG_PARAMETER);
        }
        try {
            // Integrator-defined chain of authorization calls with reusable authentication.
            await groupedAuthenticationCalls(reusable);
        } catch (e) {
            throw new PowerAuthError(
                e,
                "Your 'groupedAuthenticationCalls' function threw an exception. Please make sure that you catch errors yourself.",
                PowerAuthErrorCode.UNKNOWN_ERROR
            );
        }
    }

    /**
     * Create a new PowerAuthPassword object that will be destroyed automatically when this PowerAuth instance is deconfigured.
     * @param destroyOnUse If `true` then the underlying native password is destroyed immediately after it's used for a cryptographic operation.
     * @param onAutomaticCleanup If provided, then the closure is called when the native password is restored and the previous content is lost.
     * @returns new instance of PowerAuthPassword class that's owned by this PowerAuth instance.
     */
    createPassword(destroyOnUse: boolean = true, onAutomaticCleanup: (() => void) | undefined = undefined): PowerAuthPassword {
        return new PowerAuthPassword(destroyOnUse, onAutomaticCleanup, this.instanceId)
    }

    /**
     * Fetch information about the user from the server.
     * If the operation succeeds, then the user information object is also
     * internally stored and available in the [getLastFetchedUserInfo] method.
     */
    async fetchUserInfo(): Promise<PowerAuthUserInfo | undefined> {
        const userInfo: PowerAuthUserInfo | undefined = await NativeWrapper.thisCallNull("fetchUserInfo", this.instanceId)
        if (userInfo) {
            // userInfo object has all properties stored in allClaims. We need to unwrap these into properties before returning
            return PowerAuthUtils.expandUserInfoObject(userInfo);
        } else {
            return undefined;
        }
    }

    /**
     * Returns the last fetched user info or undefined when there's no cached user info available.
     *
     * Notes:
     * - On iOS native SDK, `PowerAuthSDK.lastFetchedUserInfo` is nullable and may be `nil` until user info is fetched.
     * - This bridge returns `undefined` when the native value is `nil`, or when the claims are missing/empty.
     */
    async getLastFetchedUserInfo(): Promise<PowerAuthUserInfo | undefined> {
        const userInfo: PowerAuthUserInfo | undefined = await NativeWrapper.thisCallNull("getLastFetchedUserInfo", this.instanceId);
        if (userInfo) {
            // userInfo object has all properties stored in allClaims. We need to unwrap these into properties before returning
            return PowerAuthUtils.expandUserInfoObject(userInfo);
        } else {
            return undefined;
        }
    }

    // End-To-End Encryption

    /**
     * Creates a new instance of encryptor suited for general end-to-end encryption purposes. The returned
     * encryptor is cryptographically bounded to the PowerAuth configuration, so it can be used with or
     * without a valid activation.
     */
    getEncryptorForApplicationScope(): Promise<PowerAuthEncryptor> {
        return PowerAuthEncryptorImpl.acquire('APPLICATION', this.instanceId)
    }

    /**
     * Creates a new instance of encryptor suited for general end-to-end encryption purposes. The returned
     * encryptor is cryptographically bounded to a device's activation, so it can be used only when this
     * instance has a valid activation.
     */
    getEncryptorForActivationScope(): Promise<PowerAuthEncryptor> {
        return PowerAuthEncryptorImpl.acquire('ACTIVATION', this.instanceId)
    }

    /**
     * Method will process `PowerAuthAuthentication` object are will return object according to the platform.
     *
     * @param authentication authentication configuration
     * @returns configured authorization object
     */
    private async authenticate(authentication: PowerAuthAuthentication): Promise<PowerAuthRawAuthentication> {
        return (await resolveAuthentication(this.instanceId, authentication, false)).toRawAuthentication()
    }
}
