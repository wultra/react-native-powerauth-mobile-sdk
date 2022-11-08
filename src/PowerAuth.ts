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

import { PowerAuthConfiguration, PowerAuthConfigurationType, buildConfiguration } from './model/PowerAuthConfiguration';
import { buildClientConfiguration, PowerAuthClientConfigurationType } from './model/PowerAuthClientConfiguration';
import { buildBiometryConfiguration, PowerAuthBiometryConfigurationType } from './model/PowerAuthBiometryConfiguration';
import { buildKeychainConfiguration, PowerAuthKeychainConfigurationType } from './model/PowerAuthKeychainConfiguration';
import { PowerAuthAuthorizationHttpHeader } from './model/PowerAuthAuthorizationHttpHeader';
import { PowerAuthActivationStatus } from './model/PowerAuthActivationStatus';
import { PowerAuthAuthentication, PowerAuthBiometricPrompt } from './model/PowerAuthAuthentication';
import { PowerAuthCreateActivationResult } from './model/PowerAuthCreateActivationResult';
import { PowerAuthActivation } from './model/PowerAuthActivation';
import { PowerAuthBiometryInfo } from './model/PowerAuthBiometryInfo';
import { PowerAuthRecoveryActivationData } from './model/PowerAuthRecoveryActivationData';
import { PowerAuthError, PowerAuthErrorCode } from './model/PowerAuthError';
import { PowerAuthConfirmRecoveryCodeDataResult} from './model/PowerAuthConfirmRecoveryCodeDataResult';
import { PowerAuthTokenStore } from "./PowerAuthTokenStore"
import { NativeWrapper } from "./internal/NativeWrapper";
import { AuthResolver } from "./internal/AuthResolver";
import { PasswordType, PowerAuthPassword } from './model/PowerAuthPassword';
import { PowerAuthActivationCodeUtil } from './PowerAuthActivationCodeUtil';
import { RawAuthentication } from './internal/NativeTypes';

/**
 * Class used for the main interaction with the PowerAuth SDK components.
 */
export class PowerAuth {
    /**
     * Configuration used to configure this instance of class.
     */
    get configuration(): PowerAuthConfigurationType | undefined {
        return configRegister.get(this.instanceId)?.configuration
    }
    /**
     * Client configuration used to configure this instance of class.
     */
    get clientConfiguration(): PowerAuthClientConfigurationType | undefined {
        return configRegister.get(this.instanceId)?.clientConfiguration
    }
    /**
     * Biometry configuration used to configure this instance of class.
     */
    get biometryConfiguration(): PowerAuthBiometryConfigurationType | undefined {
        return configRegister.get(this.instanceId)?.biometryConfiguration
    }
    /**
     * Keychain configuration used to configure this instance of class.
     */
    get keychainConfiguration(): PowerAuthKeychainConfigurationType | undefined {
        return configRegister.get(this.instanceId)?.keychainConfiguration
    }

    /**
     * Object for managing access tokens.
     */
    readonly tokenStore: PowerAuthTokenStore;

    /**
     * Prepares the PowerAuth instance.
     * 
     * 2 instances with the same instanceId will be internaly the same object!
     * 
     * @param instanceId Identifier of the PowerAuthSDK instance. The bundle identifier/packagename is recommended.
     */
    constructor(public readonly instanceId: string) {
        this.authResolver = new AuthResolver(instanceId);
        this.tokenStore = new PowerAuthTokenStore(instanceId, this.authResolver);
    }

    /** 
     * If this PowerAuth instance was configured.
     */
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
     */
    configure(
        configuration: PowerAuthConfigurationType,
        clientConfiguration?: PowerAuthClientConfigurationType,
        biometryConfiguration?: PowerAuthBiometryConfigurationType,
        keychainConfiguration?: PowerAuthKeychainConfigurationType
    ): Promise<boolean>;

    /**
     * Prepares the PowerAuth instance with a basic configuration. The method needs to be called before before any other method.
     * If you have to tweak more configuration properties, then use method variant with the configuration objects as parameters.
     * 
     * @param appKey APPLICATION_KEY as defined in PowerAuth specification - a key identifying an application version.
     * @param appSecret APPLICATION_SECRET as defined in PowerAuth specification - a secret associated with an application version.
     * @param masterServerPublicKey KEY_SERVER_MASTER_PUBLIC as defined in PowerAuth specification - a master server public key.
     * @param baseEndpointUrl Base URL to the PowerAuth Standard RESTful API (the URL part before "/pa/...").
     * @param enableUnsecureTraffic If HTTP and invalid HTTPS communication should be enabled
     * @returns Promise that with result of the configuration (can by rejected if already configured).
     */
    configure(
        appKey: string,
        appSecret: string,
        masterServerPublicKey: string,
        baseEndpointUrl: string,
        enableUnsecureTraffic: boolean
    ): Promise<boolean>;

    configure(param1: PowerAuthConfiguration | string, ...args: Array<any>): Promise<boolean> {
        let configuration: PowerAuthConfigurationType
        let clientConfiguration: PowerAuthClientConfigurationType
        let biometryConfiguration: PowerAuthBiometryConfigurationType
        let keychainConfiguration: PowerAuthKeychainConfigurationType
        if (typeof param1 === 'string') {
            configuration = buildConfiguration({
                applicationKey: param1,
                applicationSecret: args[0],
                masterServerPublicKey: args[1],
                baseEndpointUrl: args[2]})
            clientConfiguration = buildClientConfiguration({enableUnsecureTraffic: args[3]})
            biometryConfiguration = buildBiometryConfiguration()
            keychainConfiguration = buildKeychainConfiguration()
        } else {
            configuration = buildConfiguration(param1)
            clientConfiguration = buildClientConfiguration(args[0])
            biometryConfiguration = buildBiometryConfiguration(args[1])
            keychainConfiguration = buildKeychainConfiguration(args[2])
        }
        configRegister.set(this.instanceId, {
            configuration: configuration,
            clientConfiguration: clientConfiguration,
            biometryConfiguration: biometryConfiguration,
            keychainConfiguration: keychainConfiguration
        })
        return NativeWrapper.thisCallBool("configure", this.instanceId, configuration, clientConfiguration, biometryConfiguration, keychainConfiguration)
    }

    /** 
     * Deconfigures the instance
     */
    deconfigure(): Promise<boolean> {
        configRegister.delete(this.instanceId)
        return NativeWrapper.thisCallBool("deconfigure", this.instanceId)
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
     * Create a new activation by calling a PowerAuth Standard RESTful API endpoint `/pa/activation/create`.
     * 
     * @param activation A PowerAuthActivation object containg all information required for the activation creation.
     */
    createActivation(activation: PowerAuthActivation): Promise<PowerAuthCreateActivationResult> {
        return NativeWrapper.thisCall("createActivation", this.instanceId, activation);
    }

    /**
     * Commit activation that was created and store related data using provided authentication instance.
     * 
     * @param authentication An authentication instance specifying what factors should be stored.
     */
    commitActivation(authentication: PowerAuthAuthentication): Promise<void> {
        return NativeWrapper.thisCall("commitActivation", this.instanceId, authentication.convertLegacyObject(true));
    }

    /**
     * Activation identifier or undefined if object has no valid activation.
     */
    getActivationIdentifier(): Promise<string | undefined> {
        return NativeWrapper.thisCallNull("activationIdentifier", this.instanceId);
    }

    /**
     * Fingerprint calculated from device's public key or undefined if object has no valid activation.
     */
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
        return NativeWrapper.thisCall("removeActivationWithAuthentication", this.instanceId,  await this.authenticate(authentication));
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
     * Compute the HTTP signature header for GET HTTP method, URI identifier and HTTP query parameters using provided authentication information.
     * Be aware that if `PowerAuthAuthentication.useBiometry` is true, then the system biometric authentication dialog is displayed, so the operation
     * may take an undefined amount of time to complete. 
     * 
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     * @param uriId URI identifier.
     * @param params HTTP query params.
     * @returns HTTP header with PowerAuth authorization signature
     */
    async requestGetSignature(authentication: PowerAuthAuthentication, uriId: string, params?: any): Promise<PowerAuthAuthorizationHttpHeader> {
        return NativeWrapper.thisCall("requestGetSignature", this.instanceId, await this.authenticate(authentication), uriId, params ?? undefined);
    }

    /**
     * Compute the HTTP signature header for given HTTP method, URI identifier and HTTP request body using provided authentication information.
     * Be aware that if `PowerAuthAuthentication.useBiometry` is true, then the system biometric authentication dialog is displayed, so the operation
     * may take an undefined amount of time to complete.
     * 
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     * @param method HTTP method used for the signature computation.
     * @param uriId URI identifier.
     * @param body HTTP request body.
     * @returns HTTP header with PowerAuth authorization signature.
     */
    async requestSignature(authentication: PowerAuthAuthentication, method: string, uriId: string, body?: string): Promise<PowerAuthAuthorizationHttpHeader> {
        return NativeWrapper.thisCall("requestSignature", this.instanceId, await this.authenticate(authentication), method, uriId, body);
    }

    /**
     * Compute the offline signature for given HTTP method, URI identifier and HTTP request body using provided authentication information. Be aware that if 
     * `PowerAuthAuthentication.useBiometry` is true, then the system biometric authentication dialog is displayed, so the operation may take an undefined 
     * amount of time to complete. 
     * 
     * @param authentication An authentication instance specifying what factors should be used to sign the request. The possession and knowledge is recommended.
     * @param uriId URI identifier.
     * @param body HTTP request body.
     * @param nonce NONCE in Base64 format.
     * @returns String representing a calculated signature for all involved factors.
     */
    async offlineSignature(authentication: PowerAuthAuthentication, uriId: string, nonce: string, body?: string): Promise<string> {
        return NativeWrapper.thisCall("offlineSignature", this.instanceId, await this.authenticate(authentication), uriId, body, nonce);
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
     * Change the password, validate old password by calling a PowerAuth Standard RESTful API endpoint `/pa/signature/validate`.
     * 
     * @param oldPassword Old password, currently set to store the data.
     * @param newPassword New password, to be set in case authentication with old password passes.
     */
    changePassword(oldPassword: PasswordType, newPassword: PasswordType): Promise<void> {
        return NativeWrapper.thisCall("changePassword", this.instanceId, oldPassword, newPassword);
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
     */
    unsafeChangePassword(oldPassword: PasswordType, newPassword: PasswordType): Promise<boolean> {
        return NativeWrapper.thisCallBool("unsafeChangePassword", this.instanceId, oldPassword, newPassword);
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

    addBiometryFactor(password: PasswordType,  ...args: any[]): Promise<void> {
        let prompt: PowerAuthBiometricPrompt | undefined
        if (typeof args[0] === 'string' && typeof args[1] === 'string') {
            prompt = { promptTitle: args[0], promptMessage: args[1] }
        } else {
            prompt = args[0]
        }
        return NativeWrapper.thisCall("addBiometryFactor", this.instanceId, password, prompt);
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
     */
    getBiometryInfo(): Promise<PowerAuthBiometryInfo> {
        return NativeWrapper.thisCall("getBiometryInfo", this.instanceId);
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
     */
    async signDataWithDevicePrivateKey(authentication: PowerAuthAuthentication, data: string): Promise<string> {
        return NativeWrapper.thisCall("signDataWithDevicePrivateKey", this.instanceId, await this.authenticate(authentication), data);
    }

    /** 
     * Validate a user password.
     * 
     * This method calls PowerAuth Standard RESTful API endpoint `/pa/signature/validate` to validate the signature value.
     * 
     * @param password Password to be verified.
     */
    validatePassword(password: PasswordType): Promise<void> {
        return NativeWrapper.thisCall("validatePassword", this.instanceId, password);
    }

    /**
     * Returns YES if underlying session contains an activation recovery data.
     */
    hasActivationRecoveryData(): Promise<boolean> {
        return NativeWrapper.thisCallBool("hasActivationRecoveryData", this.instanceId);
    }

    /**
     * Get an activation recovery data.
     * 
     * This method calls PowerAuth Standard RESTful API endpoint `/pa/vault/unlock` to obtain the vault encryption key used for private recovery data decryption.
     * 
     * @param authentication Authentication used for vault unlocking call.
     */
    async activationRecoveryData(authentication: PowerAuthAuthentication): Promise<PowerAuthRecoveryActivationData> {
        return NativeWrapper.thisCall("activationRecoveryData", this.instanceId, await this.authenticate(authentication));
    }

    /**
     * Confirm given recovery code on the server by calling a PowerAuth Standard RESTful API endpoint `/pa/recovery/confirm`.
     * 
     * The method is useful for situations when user receives a recovery information via OOB channel (for example via postcard). 
     * Such recovery codes cannot be used without a proper confirmation on the server. To confirm codes, user has to authenticate himself
     * with a knowledge factor.
     * 
     * Note that the provided recovery code can contain a `"R:"` prefix, if it's scanned from QR code.
     * 
     * @param recoveryCode Recovery code to confirm
     * @param authentication Authentication used for recovery code confirmation
     * 
     * @returns Result of the confirmation
     */
    async confirmRecoveryCode(recoveryCode: string, authentication: PowerAuthAuthentication): Promise<PowerAuthConfirmRecoveryCodeDataResult> {
        return { 
            alreadyConfirmed: await NativeWrapper.thisCall("confirmRecoveryCode", this.instanceId, recoveryCode, await this.authenticate(authentication)) 
        }
    }

    /**
     * Function verify activation code scanned from QR code whethner it's formally valid and is issued by
     * the PowerAuth Server.
     * @param activationCode Activation code to scan. 
     * @returns true if activation code is valid and is issued by PowerAuth Server.
     */
    async verifyScannedActivationCode(activationCode: string): Promise<boolean> {
        try {
            const code = await PowerAuthActivationCodeUtil.parseActivationCode(activationCode)
            if (!code.activationSignature) {
                return false
            }
            return await this.verifyServerSignedData(code.activationCode, code.activationSignature, true)
        } catch {
            return false
        }
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
        if (authentication.isBiometricAuthentication == false) {
            throw new PowerAuthError(undefined, "Authentication object is not configured for biometric factor", PowerAuthErrorCode.WRONG_PARAMETER);
        }
        try {
            const reusable = await this.authResolver.resolve(authentication, true);
            try {
                // integrator defined chain of authorization calls with reusable authentication
                await groupedAuthenticationCalls(reusable);
            } catch (e) {
                // rethrow the error with information that the integrator should handle errors by himself
                throw new PowerAuthError(e, "Your 'groupedAuthenticationCalls' function threw an exception. Please make sure that you catch errors yourself.");
            }
        } catch (e) {
            // catching biometry authentication error and rethrowing it as PowerAuthError
            throw NativeWrapper.processException(e);
        }  
    }

    /**
     * Create new PowerAuthPassword object that will be destroyed automatically when this PowerAuth instance is deconfigured.
     * @param destroyOnUse If `true` then the underlying native password is destroyed immediately after it's used for a cryptographic operation.
     * @param onAutomaticCleanup If provided, then the closure is called when the native password is restored and the previous content is lost.
     * @returns new instance of PowerAuthPassword class that's owned by this PowerAuth instance.
     */
    createPassword(destroyOnUse: boolean = true, onAutomaticCleanup: (() => void) | undefined = undefined): PowerAuthPassword {
        return new PowerAuthPassword(destroyOnUse, onAutomaticCleanup, this.instanceId)
    }

    /**
     * Method will process `PowerAuthAuthentication` object are will return object according to the platform.
     * 
     * @param authentication authentication configuration
     * @returns configured authorization object
     */
    private async authenticate(authentication: PowerAuthAuthentication): Promise<RawAuthentication> {
        return (await this.authResolver.resolve(authentication, false)).toRawAuthentication()
    }

    private authResolver: AuthResolver
}

/**
 * Interface containing all configurations associated to `PowerAuth` instance.
 */
interface InstanceConfigurations {
    configuration: PowerAuthConfigurationType
    clientConfiguration: PowerAuthClientConfigurationType
    biometryConfiguration: PowerAuthBiometryConfigurationType
    keychainConfiguration: PowerAuthKeychainConfigurationType
}

/**
 * Configurations register.
 */
const configRegister = new Map<string, InstanceConfigurations>()