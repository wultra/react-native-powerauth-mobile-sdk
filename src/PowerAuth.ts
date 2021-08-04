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

import { Platform } from 'react-native';
import { PowerAuthConfiguration } from './model/PowerAuthConfiguration';
import { PowerAuthClientConfiguration } from './model/PowerAuthClientConfiguration';
import { PowerAuthBiometryConfiguration } from './model/PowerAuthBiometryConfiguration';
import { PowerAuthKeychainConfiguration } from './model/PowerAuthKeychainConfiguration';
import { PowerAuthAuthorizationHttpHeader } from './model/PowerAuthAuthorizationHttpHeader';
import { PowerAuthActivationStatus } from './model/PowerAuthActivationStatus';
import { PowerAuthAuthentication } from './model/PowerAuthAuthentication';
import { PowerAuthCreateActivationResult } from './model/PowerAuthCreateActivationResult';
import { PowerAuthActivation } from './model/PowerAuthActivation';
import { PowerAuthBiometryInfo } from './model/PowerAuthBiometryInfo';
import { PowerAuthRecoveryActivationData } from './model/PowerAuthRecoveryActivationData';
import { PowerAuthError } from './model/PowerAuthError';
import { PowerAuthConfirmRecoveryCodeDataResult} from './model/PowerAuthConfirmRecoveryCodeDataResult';
import { __NativeWrapper } from "./internal/NativeWrapper";
import { PowerAuthTokenStore } from "./core/PowerAuthTokenStore"

/**
 * Class used for the main interaction with the PowerAuth SDK components.
 */
export class PowerAuth {

    /**
     * Configuration used to configure this instance of class. Note that modifying this property has no effect, but the
     * stored object is useful for the debugging purposes.
     */
    configuration?: PowerAuthConfiguration
    /**
     * Client configuration used to configure this instance of class. Note that modifying this property has no effect, but the
     * stored object is useful for the debugging purposes.
     */
    clientConfiguration?: PowerAuthClientConfiguration
    /**
     * Biometry configuration used to configure this instance of class. Note that modifying this property has no effect, but the
     * stored object is useful for the debugging purposes.
     */
    biometryConfiguration?: PowerAuthBiometryConfiguration
    /**
     * Keychain configuration used to configure this instance of class. Note that modifying this property has no effect, but the
     * stored object is useful for the debugging purposes.
     */
    keychainConfiguration?: PowerAuthKeychainConfiguration

    /**
     * Object for managing access tokens.
     */
    tokenStore: PowerAuthTokenStore;

    /**
     * Prepares the PowerAuth instance.
     * 
     * 2 instances with the same instanceId will be internaly the same object!
     * 
     * @param instanceId Identifier of the PowerAuthSDK instance. The bundle identifier/packagename is recommended.
     */
    constructor(instanceId: string) {
        this.wrapper = new __NativeWrapper(instanceId);
        this.tokenStore = new PowerAuthTokenStore(instanceId);
    }

    /** 
     * If this PowerAuth instance was configured.
     */
    async isConfigured(): Promise<boolean> {
        return this.wrapper.call("isConfigured");
    }

    /**
     * Prepares the PowerAuth instance with an advanced configuration. The method needs to be called before before any other method.
     * 
     * @param configuration Configuration object with basic parameters for `PowerAuth` class.
     * @param clientConfiguration  Configuration for internal HTTP client. If `null` is provided, then `PowerAuthClientConfiguration.default()` is used.
     * @param biometryConfiguration Biometry configuration. If `null` is provided, then `PowerAuthBiometryConfiguration.default()` is used.
     * @param keychainConfiguration Configuration for internal keychain storage. If `null` is provided, then `PowerAuthKeychainConfiguration.default()` is used.
     */
    configure(configuration: PowerAuthConfiguration, clientConfiguration?: PowerAuthClientConfiguration, biometryConfiguration?: PowerAuthBiometryConfiguration, keychainConfiguration?: PowerAuthKeychainConfiguration): Promise<boolean>;

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
    configure(appKey: string, appSecret: string, masterServerPublicKey: string, baseEndpointUrl: string, enableUnsecureTraffic: boolean): Promise<boolean>;

    configure(param1: PowerAuthConfiguration | string, ...args: Array<any>): Promise<boolean> {
        let configuration: PowerAuthConfiguration
        let clientConfiguration: PowerAuthClientConfiguration
        let biometryConfiguration: PowerAuthBiometryConfiguration
        let keychainConfiguration: PowerAuthKeychainConfiguration
        if (param1 instanceof PowerAuthConfiguration) {
            configuration = param1
            clientConfiguration = args[0] as PowerAuthClientConfiguration ?? PowerAuthClientConfiguration.default()
            biometryConfiguration = args[1] as PowerAuthBiometryConfiguration ?? PowerAuthBiometryConfiguration.default()
            keychainConfiguration = args[2] as PowerAuthKeychainConfiguration ?? PowerAuthKeychainConfiguration.default()
        } else {
            configuration = new PowerAuthConfiguration(param1, args[0], args[1], args[2])
            clientConfiguration = PowerAuthClientConfiguration.default()
            clientConfiguration.enableUnsecureTraffic = args[3]
            biometryConfiguration = PowerAuthBiometryConfiguration.default()
            keychainConfiguration = PowerAuthKeychainConfiguration.default()
        }
        this.configuration = configuration
        this.clientConfiguration = clientConfiguration
        this.biometryConfiguration = biometryConfiguration
        this.keychainConfiguration = keychainConfiguration
        return this.wrapper.call("configure", configuration, clientConfiguration, biometryConfiguration, keychainConfiguration)
    }

    /** 
     * Deconfigures the instance
     */
    deconfigure(): Promise<boolean> {
        this.configuration = null
        this.clientConfiguration = null
        this.biometryConfiguration = null
        this.keychainConfiguration = null
        return this.wrapper.call("deconfigure");
    }

    /**
     * Checks if there is a valid activation.
     * 
     * @returns true if there is a valid activation, false otherwise.
     */
    hasValidActivation(): Promise<boolean> {
        return this.wrapper.call("hasValidActivation");
    }

    /**
     * Check if it is possible to start an activation process.
     * 
     * @return true if activation process can be started, false otherwise.
     */
    canStartActivation(): Promise<boolean> {
        return this.wrapper.call("canStartActivation");
    }

    /**
     * Checks if there is a pending activation (activation in progress).
     * 
     * @return true if there is a pending activation, false otherwise.
     */
    hasPendingActivation(): Promise<boolean> {
        return this.wrapper.call("hasPendingActivation");
    }

    /**
     * Fetch the activation status for current activation.
     * 
     * @return A promise with activation status result - it contains status information in case of success and error in case of failure.
     */
    fetchActivationStatus(): Promise<PowerAuthActivationStatus> {
        return this.wrapper.call("fetchActivationStatus");
    }

    /**
     * Create a new activation.
     * 
     * @param activation A PowerAuthActivation object containg all information required for the activation creation.
     */
    createActivation(activation: PowerAuthActivation): Promise<PowerAuthCreateActivationResult> {
        return this.wrapper.call("createActivation", activation);
    }

    /**
     * Commit activation that was created and store related data using provided authentication instance.
     * 
     * @param authentication An authentication instance specifying what factors should be stored.
     */
    commitActivation(authentication: PowerAuthAuthentication): Promise<void> {
        return this.wrapper.call("commitActivation", authentication);
    }

    /**
     * Activation identifier or null if object has no valid activation.
     */
    getActivationIdentifier(): Promise<string> {
        return this.wrapper.call("activationIdentifier");
    }

    /**
     * Fingerprint calculated from device's public key or null if object has no valid activation.
     */
    getActivationFingerprint(): Promise<string> {
        return this.wrapper.call("activationFingerprint");
    }

    /**
     * Remove current activation by calling a PowerAuth Standard RESTful API endpoint '/pa/activation/remove'.
     * 
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     */
    async removeActivationWithAuthentication(authentication: PowerAuthAuthentication): Promise<void> {
        return this.wrapper.call("removeActivationWithAuthentication", await this.wrapper.authenticate(authentication));
    }

    /**
     * This method removes the activation session state and biometry factor key. Cached possession related key remains intact.
     * Unlike the `removeActivationWithAuthentication`, this method doesn't inform server about activation removal. In this case
     * user has to remove the activation by using another channel (typically internet banking, or similar web management console)
     */
    removeActivationLocal(): Promise<void> {
        return this.wrapper.call("removeActivationLocal");
    }

    /**
     * Compute the HTTP signature header for GET HTTP method, URI identifier and HTTP query parameters using provided authentication information.
     * 
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     * @param uriId URI identifier.
     * @param params HTTP query params.
     * @return HTTP header with PowerAuth authorization signature
     */
    async requestGetSignature(authentication: PowerAuthAuthentication, uriId: string, params?: any): Promise<PowerAuthAuthorizationHttpHeader> {
        return this.wrapper.call("requestGetSignature",await this.wrapper.authenticate(authentication), uriId, params ?? null);
    }

    /**
     * Compute the HTTP signature header for given HTTP method, URI identifier and HTTP request body using provided authentication information.
     * 
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     * @param method HTTP method used for the signature computation.
     * @param uriId URI identifier.
     * @param body HTTP request body.
     * @return HTTP header with PowerAuth authorization signature.
     */
    async requestSignature(authentication: PowerAuthAuthentication, method: string, uriId: string, body?: string): Promise<PowerAuthAuthorizationHttpHeader> {
        return this.wrapper.call("requestSignature", await this.wrapper.authenticate(authentication), method, uriId, body);
    }

    /**
     * Compute the offline signature for given HTTP method, URI identifier and HTTP request body using provided authentication information.
     * 
     * @param authentication An authentication instance specifying what factors should be used to sign the request. The possession and knowledge is recommended.
     * @param uriId URI identifier.
     * @param body HTTP request body.
     * @param nonce NONCE in Base64 format.
     * @return String representing a calculated signature for all involved factors.
     */
    async offlineSignature(authentication: PowerAuthAuthentication, uriId: string, nonce: string, body?: string): Promise<string> {
        return this.wrapper.call("offlineSignature", await this.wrapper.authenticate(authentication), uriId, body, nonce);
    }

    /**
     * Validates whether the data has been signed with master server private key or personalized server's private key.
     * 
     * @param data An arbitrary data
     * @param signature A signature calculated for data, in Base64 format
     * @param masterKey If true, then master server public key is used for validation, otherwise personalized server's public key.
     */
    verifyServerSignedData(data: string, signature: string, masterKey: boolean): Promise<boolean> {
        return this.wrapper.call("verifyServerSignedData", data, signature, masterKey);
    }

    /**
     * Change the password, validate old password by calling a PowerAuth Standard RESTful API endpoint '/pa/signature/validate'.
     * 
     * @param oldPassword Old password, currently set to store the data.
     * @param newPassword New password, to be set in case authentication with old password passes.
     */
    changePassword(oldPassword: string, newPassword: string): Promise<void> {
        return this.wrapper.call("changePassword", oldPassword, newPassword);
    }

    /**
     * Change the password using local re-encryption, do not validate old password by calling any endpoint.
     * 
     * You are responsible for validating the old password against some server endpoint yourself before using it in this method.
     * If you do not validate the old password to make sure it is correct, calling this method will corrupt the local data, since
     * existing data will be decrypted using invalid PIN code and re-encrypted with a new one.
 
     @param oldPassword Old password, currently set to store the data.
     @param newPassword New password, to be set in case authentication with old password passes.
     @return Returns true in case password was changed without error, NO otherwise.
     */
    unsafeChangePassword(oldPassword: string, newPassword: string): Promise<boolean> {
        return this.wrapper.call("unsafeChangePassword", oldPassword, newPassword);
    }

    /**
     * Regenerate a biometry related factor key.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for original private key decryption.
     * 
     * @param password Password used for authentication during vault unlocking call.
     * @param title (used only in Android) Title for biometry dialog
     * @param description (used only in Android) Description for biometry dialog
     */
    addBiometryFactor(password: string, title: string, description: string): Promise<void> {
        if (Platform.OS == "android") {
            return this.wrapper.call("addBiometryFactor", password, title, description);
        } else {
            return this.wrapper.call("addBiometryFactor", password);
        }
    }

    /** 
     * Checks if a biometry related factor is present.
     * This method returns the information about the key value being present in keychain.
     */
    hasBiometryFactor(): Promise<boolean> {
        return this.wrapper.call("hasBiometryFactor");
    }

    /**
     * Remove the biometry related factor key.
     * 
     * @return true if the key was successfully removed, NO otherwise.
     */
    removeBiometryFactor(): Promise<boolean> {
        return this.wrapper.call("removeBiometryFactor");
    }

    /**
     * Returns biometry info data.
     * 
     * @returns object with information data about biometry
     */
    getBiometryInfo(): Promise<PowerAuthBiometryInfo> {
        return this.wrapper.call("getBiometryInfo");
    }

    /** 
     * Generate a derived encryption key with given index.
     * The key is returned in form of base64 encoded string.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for subsequent key derivation using given index.
     * 
     * @param authentication Authentication used for vault unlocking call.
     * @param index Index of the derived key using KDF. 
     */
    async fetchEncryptionKey(authentication: PowerAuthAuthentication, index: number): Promise<string> {
        return this.wrapper.call("fetchEncryptionKey", await this.wrapper.authenticate(authentication), index);
    }

    /**
     * Sign given data with the original device private key (asymetric signature).
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for private key decryption. Data is then signed using ECDSA algorithm with this key and can be validated on the server side.
     * 
     * @param authentication Authentication used for vault unlocking call.
     * @param data Data to be signed with the private key.
     */
    async signDataWithDevicePrivateKey(authentication: PowerAuthAuthentication, data: string): Promise<string> {
        return this.wrapper.call("signDataWithDevicePrivateKey", await this.wrapper.authenticate(authentication), data);
    }

    /** 
     * Validate a user password.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/signature/validate' to validate the signature value.
     * 
     * @param password Password to be verified.
     */
    validatePassword(password: string): Promise<void> {
        return this.wrapper.call("validatePassword", password);
    }

    /**
     * Returns YES if underlying session contains an activation recovery data.
     */
    hasActivationRecoveryData(): Promise<boolean> {
        return this.wrapper.call("hasActivationRecoveryData");
    }

    /**
     * Get an activation recovery data.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for private recovery data decryption.
     * 
     * @param authentication Authentication used for vault unlocking call.
     */
    async activationRecoveryData(authentication: PowerAuthAuthentication): Promise<PowerAuthRecoveryActivationData> {
        return this.wrapper.call("activationRecoveryData", await this.wrapper.authenticate(authentication));
    }

    /**
     * Confirm given recovery code on the server.
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
        return { alreadyConfirmed: await this.wrapper.call("confirmRecoveryCode", recoveryCode, await this.wrapper.authenticate(authentication)) };
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
        if (authentication.useBiometry == false) {
            throw new PowerAuthError(null, "Requesting biometric authentication, but `useBiometry` is set to false.");
        }
        try {
            let reusable = await this.wrapper.authenticate(authentication, true);
            try {
                // integrator defined chain of authorization calls with reusable authentication
                await groupedAuthenticationCalls(reusable);
            } catch (e) {
                // rethrow the error with information that the integrator should handle errors by himself
                throw new PowerAuthError(e, "Your 'groupedAuthenticationCalls' function threw an exception. Please make sure that you catch errors yourself.");
            }
        } catch (e) {
            // catching biometry authentication error and rethrowing it as PowerAuthError
            throw __NativeWrapper.processException(e);
        }  
    }
    
    private wrapper: __NativeWrapper;
}
