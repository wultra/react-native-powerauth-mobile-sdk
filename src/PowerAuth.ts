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

import { NativeModules, Platform } from 'react-native';
import { PowerAuthAuthorizationHttpHeader } from './model/PowerAuthAuthorizationHttpHeader';
import { PowerAuthActivationStatus } from './model/PowerAuthActivationStatus';
import { PowerAuthAuthentication } from './model/PowerAuthAuthentication';
import { PowerAuthCreateActivationResult } from './model/PowerAuthCreateActivationResult';
import { PowerAuthActivation } from './model/PowerAuthActivation';
import { PowerAuthBiometryInfo } from './model/PowerAuthBiometryInfo';
import { PowerAuthRecoveryActivationData } from './model/PowerAuthRecoveryActivationData';
import { PowerAuthError } from './model/PowerAuthError';
import { __AuthenticationUtils } from "./internal/AuthenticationUtils";

/**
 * Class used for the main interaction with the PowerAuth SDK components.
 */
class PowerAuth {

    private nativeModule = NativeModules.PowerAuth;

    /** If the PowerAuth module was configured. */
    async isConfigured(): Promise<boolean> {
        return this.wrapNativeCall(this.nativeModule.isConfigured());
    }

    /**
     * Prepares the PowerAuth instance. This method needs to be called before before any other method.
     * 
     * @param instanceId Identifier of the PowerAuthSDK instance. The bundle identifier/packagename is recommended.
     * @param appKey APPLICATION_KEY as defined in PowerAuth specification - a key identifying an application version.
     * @param appSecret APPLICATION_SECRET as defined in PowerAuth specification - a secret associated with an application version.
     * @param masterServerPublicKey KEY_SERVER_MASTER_PUBLIC as defined in PowerAuth specification - a master server public key.
     * @param baseEndpointUrl Base URL to the PowerAuth Standard RESTful API (the URL part before "/pa/...").
     * @param enableUnsecureTraffic If HTTP and invalid HTTPS communication should be enabled
     * @returns Promise that with result of the configuration (can by rejected if already configured).
     */
    configure(instanceId: string, appKey: string, appSecret: string, masterServerPublicKey: string, baseEndpointUrl: string, enableUnsecureTraffic: boolean): Promise<boolean>  {
        return this.wrapNativeCall(this.nativeModule.configure(instanceId, appKey, appSecret, masterServerPublicKey, baseEndpointUrl, enableUnsecureTraffic));
    }

    /**
     * Checks if there is a valid activation.
     * 
     * @returns true if there is a valid activation, false otherwise.
     */
    hasValidActivation(): Promise<boolean> {
        return this.wrapNativeCall(this.nativeModule.hasValidActivation());
    }

    /**
     * Check if it is possible to start an activation process.
     * 
     * @return true if activation process can be started, false otherwise.
     */
    canStartActivation(): Promise<boolean> {
        return this.wrapNativeCall(this.nativeModule.canStartActivation());
    }

    /**
     * Checks if there is a pending activation (activation in progress).
     * 
     * @return true if there is a pending activation, false otherwise.
     */
    hasPendingActivation(): Promise<boolean> {
        return this.wrapNativeCall(this.nativeModule.hasPendingActivation());
    }

    /**
     * Fetch the activation status for current activation.
     * 
     * @return A promise with activation status result - it contains status information in case of success and error in case of failure.
     */
    fetchActivationStatus(): Promise<PowerAuthActivationStatus> {
        return this.wrapNativeCall(this.nativeModule.fetchActivationStatus());
    }

    /**
     * Create a new activation.
     * 
     * @param activation A PowerAuthActivation object containg all information required for the activation creation.
     */
    createActivation(activation: PowerAuthActivation): Promise<PowerAuthCreateActivationResult> {
        return this.wrapNativeCall(this.nativeModule.createActivation(activation));
    }

    /**
     * Commit activation that was created and store related data using provided authentication instance.
     * 
     * @param authentication An authentication instance specifying what factors should be stored.
     */
    commitActivation(authentication: PowerAuthAuthentication): Promise<void> {
        return this.wrapNativeCall(this.nativeModule.commitActivation(authentication));
    }

    /**
     * Activation identifier or null if object has no valid activation.
     */
    getActivationIdentifier(): Promise<string> {
        return this.wrapNativeCall(this.nativeModule.activationIdentifier());
    }

    /**
     * Fingerprint calculated from device's public key or null if object has no valid activation.
     */
    getActivationFingerprint(): Promise<string> {
        return this.wrapNativeCall(this.nativeModule.activationFingerprint());
    }

    /**
     * Remove current activation by calling a PowerAuth Standard RESTful API endpoint '/pa/activation/remove'.
     * 
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     */
    async removeActivationWithAuthentication(authentication: PowerAuthAuthentication): Promise<void> {
        return this.wrapNativeCall(this.nativeModule.removeActivationWithAuthentication(await __AuthenticationUtils.process(authentication)));
    }

    /**
     * This method removes the activation session state and biometry factor key. Cached possession related key remains intact.
     * Unlike the `removeActivationWithAuthentication`, this method doesn't inform server about activation removal. In this case
     * user has to remove the activation by using another channel (typically internet banking, or similar web management console)
     */
    removeActivationLocal(): Promise<void> {
        return this.wrapNativeCall(this.nativeModule.removeActivationLocal());
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
        return this.wrapNativeCall(this.nativeModule.requestGetSignature(await __AuthenticationUtils.process(authentication), uriId, params ?? null));
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
        return this.wrapNativeCall(this.nativeModule.requestSignature(await __AuthenticationUtils.process(authentication), method, uriId, body));
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
        return this.wrapNativeCall(this.nativeModule.offlineSignature(await __AuthenticationUtils.process(authentication), uriId, body, nonce));
    }

    /**
     * Validates whether the data has been signed with master server private key or personalized server's private key.
     * 
     * @param data An arbitrary data
     * @param signature A signature calculated for data, in Base64 format
     * @param masterKey If true, then master server public key is used for validation, otherwise personalized server's public key.
     */
    verifyServerSignedData(data: string, signature: string, masterKey: boolean): Promise<boolean> {
        return this.wrapNativeCall(this.nativeModule.verifyServerSignedData(data, signature, masterKey));
    }

    /**
     * Change the password, validate old password by calling a PowerAuth Standard RESTful API endpoint '/pa/signature/validate'.
     * 
     * @param oldPassword Old password, currently set to store the data.
     * @param newPassword New password, to be set in case authentication with old password passes.
     */
    changePassword(oldPassword: string, newPassword: string): Promise<void> {
        return this.wrapNativeCall(this.nativeModule.changePassword(oldPassword, newPassword));
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
        return this.wrapNativeCall(this.nativeModule.unsafeChangePassword(oldPassword, newPassword));
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
            return this.wrapNativeCall(this.nativeModule.addBiometryFactor(password, title, description));
        } else {
            return this.wrapNativeCall(this.nativeModule.addBiometryFactor(password));
        }
    }

    /** 
     * Checks if a biometry related factor is present.
     * This method returns the information about the key value being present in keychain.
     */
    hasBiometryFactor(): Promise<boolean> {
        return this.wrapNativeCall(this.nativeModule.hasBiometryFactor());
    }

    /**
     * Remove the biometry related factor key.
     * 
     * @return true if the key was successfully removed, NO otherwise.
     */
    removeBiometryFactor(): Promise<boolean> {
        return this.wrapNativeCall(this.nativeModule.removeBiometryFactor());
    }

    /**
     * Returns biometry info data.
     * 
     * @returns object with information data about biometry
     */
    getBiometryInfo(): Promise<PowerAuthBiometryInfo> {
        return this.wrapNativeCall(this.nativeModule.getBiometryInfo());
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
        return this.wrapNativeCall(this.nativeModule.fetchEncryptionKey(await __AuthenticationUtils.process(authentication), index));
    }

    /**
     * Sign given data with the original device private key (asymetric signature).
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for private key decryption. Data is then signed using ECDSA algorithm with this key and can be validated on the server side.
     * 
     * @param authentication Authentication used for vault unlocking call.
     * @param data Data to be signed with the private key.
     */
    async signDataWithDevicePrivateKey(authentication: PowerAuthAuthentication, data: string): Promise<string> {
        return this.wrapNativeCall(this.nativeModule.signDataWithDevicePrivateKey(await __AuthenticationUtils.process(authentication), data));
    }

    /** 
     * Validate a user password.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/signature/validate' to validate the signature value.
     * 
     * @param password Password to be verified.
     */
    validatePassword(password: string): Promise<void> {
        return this.wrapNativeCall(this.nativeModule.validatePassword(password));
    }

    /**
     * Returns YES if underlying session contains an activation recovery data.
     */
    hasActivationRecoveryData(): Promise<boolean> {
        return this.wrapNativeCall(this.nativeModule.hasActivationRecoveryData());
    }

    /**
     * Get an activation recovery data.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for private recovery data decryption.
     * 
     * @param authentication Authentication used for vault unlocking call.
     */
    async activationRecoveryData(authentication: PowerAuthAuthentication): Promise<PowerAuthRecoveryActivationData> {
        return this.wrapNativeCall(this.nativeModule.activationRecoveryData(await __AuthenticationUtils.process(authentication)));
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
     */
    async confirmRecoveryCode(recoveryCode: string, authentication: PowerAuthAuthentication): Promise<void> {
        return this.wrapNativeCall(this.nativeModule.confirmRecoveryCode(recoveryCode, await __AuthenticationUtils.process(authentication)));
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
            let reusable = await __AuthenticationUtils.process(authentication, true);
            try {
                // integrator defined chain of authorization calls with reusable authentication
                await groupedAuthenticationCalls(reusable);
            } catch (e) {
                // rethrow the error with information that the integrator should handle errors by himself
                throw new PowerAuthError(e, "Your 'groupedAuthenticationCalls' function threw an exception. Please make sure that you catch errors yourself.");
            }
        } catch (e) {
            // catching biometry authentication error and rethrowing it as PowerAuthError
            throw new PowerAuthError(e);
        }
        
    }

    private async wrapNativeCall(nativePromise: Promise<any>) {
        try {
            return await nativePromise;
        } catch (e) {
            throw new PowerAuthError(e);
        }
    }
}

export default new PowerAuth();
