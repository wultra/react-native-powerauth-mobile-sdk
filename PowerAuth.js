import { NativeModules } from 'react-native';
/**
 * Class used for the main interaction with the PowerAuth SDK components.
 */
var PowerAuth = /** @class */ (function () {
    function PowerAuth() {
        this.nativeModule = NativeModules.PowerAuth;
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
     * @returns Promise that with result of the configuration.
     */
    PowerAuth.prototype.configure = function (instanceId, appKey, appSecret, masterServerPublicKey, baseEndpointUrl, enableUnsecureTraffic) {
        return this.nativeModule.configure(instanceId, appKey, appSecret, masterServerPublicKey, baseEndpointUrl, enableUnsecureTraffic);
    };
    /**
     * Checks if there is a valid activation.
     *
     * @returns true if there is a valid activation, false otherwise.
     */
    PowerAuth.prototype.hasValidActivation = function () {
        return this.nativeModule.hasValidActivation();
    };
    /**
     * Check if it is possible to start an activation process.
     *
     * @return true if activation process can be started, false otherwise.
     */
    PowerAuth.prototype.canStartActivation = function () {
        return this.nativeModule.canStartActivation();
    };
    /**
     * Checks if there is a pending activation (activation in progress).
     *
     * @return true if there is a pending activation, false otherwise.
     */
    PowerAuth.prototype.hasPendingActivation = function () {
        return this.nativeModule.hasPendingActivation();
    };
    /**
     * Fetch the activation status for current activation.
     *
     * @return A promise with activation status result - it contains status information in case of success and error in case of failure.
     */
    PowerAuth.prototype.fetchActivationStatus = function () {
        return this.nativeModule.fetchActivationStatus();
    };
    /**
     * Create a new activation.
     *
     * @param activation A PowerAuthActivation object containg all information required for the activation creation.
     */
    PowerAuth.prototype.createActivation = function (activation) {
        return this.nativeModule.createActivation(activation);
    };
    /**
     * Commit activation that was created and store related data using provided authentication instance.
     *
     * @param authentication An authentication instance specifying what factors should be stored.
     */
    PowerAuth.prototype.commitActivation = function (authentication) {
        return this.nativeModule.commitActivation(authentication);
    };
    /**
     * Activation identifier or null if object has no valid activation.
     */
    PowerAuth.prototype.getActivationIdentifier = function () {
        return this.nativeModule.activationIdentifier();
    };
    /**
     * Fingerprint calculated from device's public key or null if object has no valid activation.
     */
    PowerAuth.prototype.getActivationFingerprint = function () {
        return this.nativeModule.activationFingerprint();
    };
    /**
     * Remove current activation by calling a PowerAuth Standard RESTful API endpoint '/pa/activation/remove'.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     */
    PowerAuth.prototype.removeActivationWithAuthentication = function (authentication) {
        return this.nativeModule.removeActivationWithAuthentication(authentication);
    };
    /**
     * This method removes the activation session state and biometry factor key. Cached possession related key remains intact.
     * Unlike the `removeActivationWithAuthentication`, this method doesn't inform server about activation removal. In this case
     * user has to remove the activation by using another channel (typically internet banking, or similar web management console)
     */
    PowerAuth.prototype.removeActivationLocal = function () {
        return this.nativeModule.removeActivationLocal();
    };
    /**
     * Compute the HTTP signature header for GET HTTP method, URI identifier and HTTP query parameters using provided authentication information.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     * @param uriId URI identifier.
     * @param params HTTP query params.
     * @return HTTP header with PowerAuth authorization signature
     */
    PowerAuth.prototype.requestGetSignature = function (authentication, uriId, params) {
        return this.nativeModule.requestGetSignature(authentication, uriId, params !== null && params !== void 0 ? params : null);
    };
    /**
     * Compute the HTTP signature header for given HTTP method, URI identifier and HTTP request body using provided authentication information.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     * @param method HTTP method used for the signature computation.
     * @param uriId URI identifier.
     * @param body HTTP request body.
     * @return HTTP header with PowerAuth authorization signature.
     */
    PowerAuth.prototype.requestSignature = function (authentication, method, uriId, body) {
        return this.nativeModule.requestSignature(authentication, method, uriId, body ? toBase64(body) : null);
    };
    /**
     * Compute the offline signature for given HTTP method, URI identifier and HTTP request body using provided authentication information.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request. The possession and knowledge is recommended.
     * @param uriId URI identifier.
     * @param body HTTP request body.
     * @param nonce NONCE in Base64 format.
     * @return String representing a calculated signature for all involved factors.
     */
    PowerAuth.prototype.offlineSignature = function (authentication, uriId, nonce, body) {
        return this.nativeModule.offlineSignature(authentication, uriId, body ? toBase64(body) : null, nonce);
    };
    /**
     * Validates whether the data has been signed with master server private key or personalized server's private key.
     *
     * @param data An arbitrary data
     * @param signature A signature calculated for data, in Base64 format
     * @param masterKey If true, then master server public key is used for validation, otherwise personalized server's public key.
     */
    PowerAuth.prototype.verifyServerSignedData = function (data, signature, masterKey) {
        return this.nativeModule.verifyServerSignedData(toBase64(data), signature, masterKey);
    };
    /**
     * Change the password, validate old password by calling a PowerAuth Standard RESTful API endpoint '/pa/vault/unlock'.
     *
     * @param oldPassword Old password, currently set to store the data.
     * @param newPassword New password, to be set in case authentication with old password passes.
     */
    PowerAuth.prototype.changePassword = function (oldPassword, newPassword) {
        return this.nativeModule.changePassword(oldPassword, newPassword);
    };
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
    PowerAuth.prototype.unsafeChangedPassword = function (oldPassword, newPassword) {
        return this.nativeModule.unsafeChangedPassword(oldPassword, newPassword);
    };
    /**
     * Regenerate a biometry related factor key.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for original private key decryption.
     *
     * @param password Password used for authentication during vault unlocking call.
     */
    PowerAuth.prototype.addBiometryFactor = function (password) {
        return this.nativeModule.addBiometryFactor(password);
    };
    /**
     * Checks if a biometry related factor is present.
     * This method returns the information about the key value being present in keychain.
     */
    PowerAuth.prototype.hasBiometryFactor = function () {
        return this.nativeModule.hasBiometryFactor();
    };
    /**
     * Remove the biometry related factor key.
     *
     * @return true if the key was successfully removed, NO otherwise.
     */
    PowerAuth.prototype.removeBiometryFactor = function () {
        return this.nativeModule.removeBiometryFactor();
    };
    /**
     * Generate a derived encryption key with given index.
     * The key is returned in form of base64 encoded string.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for subsequent key derivation using given index.
     *
     * @param authentication Authentication used for vault unlocking call.
     * @param index Index of the derived key using KDF.
     */
    PowerAuth.prototype.fetchEncryptionKey = function (authentication, index) {
        return this.nativeModule.fetchEncryptionKey(authentication, index);
    };
    /**
     * Sign given data with the original device private key (asymetric signature).
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for private key decryption. Data is then signed using ECDSA algorithm with this key and can be validated on the server side.
     *
     * @param authentication Authentication used for vault unlocking call.
     * @param data Data to be signed with the private key.
     */
    PowerAuth.prototype.signDataWithDevicePrivateKey = function (authentication, data) {
        return this.nativeModule.signDataWithDevicePrivateKey(authentication, toBase64(data));
    };
    /**
     * Validate a user password.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to validate the signature value.
     *
     * @param password Password to be verified.
     */
    PowerAuth.prototype.validatePassword = function (password) {
        return this.nativeModule.validatePassword(password);
    };
    /**
     * Returns YES if underlying session contains an activation recovery data.
     */
    PowerAuth.prototype.hasActivationRecoveryData = function () {
        return this.nativeModule.hasActivationRecoveryData();
    };
    /**
     * Get an activation recovery data.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for private recovery data decryption.
     *
     * @param authentication Authentication used for vault unlocking call.
     */
    PowerAuth.prototype.activationRecoveryData = function (authentication) {
        return this.nativeModule.activationRecoveryData(authentication);
    };
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
    PowerAuth.prototype.confirmRecoveryCode = function (recoveryCode, authentication) {
        return this.nativeModule.confirmRecoveryCode(recoveryCode, authentication);
    };
    return PowerAuth;
}());
export var PA2ActivationState;
(function (PA2ActivationState) {
    PA2ActivationState["PA2ActivationState_Created"] = "PA2ActivationState_Created";
    PA2ActivationState["PA2ActivationState_PendingCommit"] = "PA2ActivationState_PendingCommit";
    PA2ActivationState["PA2ActivationState_Active"] = "PA2ActivationState_Active";
    PA2ActivationState["PA2ActivationState_Blocked"] = "PA2ActivationState_Blocked";
    PA2ActivationState["PA2ActivationState_Removed"] = "PA2ActivationState_Removed";
    PA2ActivationState["PA2ActivationState_Deadlock"] = "PA2ActivationState_Deadlock";
})(PA2ActivationState || (PA2ActivationState = {}));
/**
 * The `PowerAuthActivation` object contains activation data required for the activation creation. The object supports
 * all types of activation currently supported in the SDK.
 */
var PowerAuthActivation = /** @class */ (function () {
    function PowerAuthActivation() {
    }
    /**
     * Create an instance of `PowerAuthActivation` configured with the activation code. The activation code may contain
     * an optional signature part, in case that it is scanned from QR code.
     *
     * The activation's `name` parameter is recommended to set to device name. The name of activation will be associated with
     * an activation record on PowerAuth Server.
     *
     * @param activationCode Activation code, obtained either via QR code scanning or by manual entry.
     * @param name Activation name to be used for the activation.
     * @return New instance of `PowerAuthActivation`.
     */
    PowerAuthActivation.createWithActivationCode = function (activationCode, name) {
        var a = new PowerAuthActivation();
        a.activationName = name;
        a.activationCode = activationCode;
        return a;
    };
    /**
     * Creates an instance of `PowerAuthActivation` with a recovery activation code and PUK.
     *
     * The activation's `name` parameter is recommended to set to device name. The name of activation will be associated with
     * an activation record on PowerAuth Server.
     *
     * @param recoveryCode Recovery code, obtained either via QR code scanning or by manual entry.
     * @param recoveryPuk PUK obtained by manual entry.
     * @param name Activation name to be used for the activation.
     * @return New instance of `PowerAuthActivation`.
     */
    PowerAuthActivation.createWithRecoveryCode = function (recoveryCode, recoveryPuk, name) {
        var a = new PowerAuthActivation();
        a.activationName = name;
        a.recoveryCode = recoveryCode;
        a.recoveryPuk = recoveryPuk;
        return a;
    };
    /**
     * Creates an instance of `PowerAuthActivation` with an identity attributes for the custom activation purposes.
     *
     * The activation's `name` parameter is recommended to set to device name. The name of activation will be associated with
     * an activation record on PowerAuth Server.
     *
     * @param identityAttributes Custom activation parameters that are used to prove identity of a user (each object value is serialized and used).
     * @param name Activation name to be used for the activation.
     * @return New instance of `PowerAuthActivation`.
     */
    PowerAuthActivation.createWithIdentityAttributes = function (identityAttributes, name) {
        var a = new PowerAuthActivation();
        a.activationName = name;
        a.identityAttributes = identityAttributes;
        return a;
    };
    return PowerAuthActivation;
}());
export { PowerAuthActivation };
;
/**
 * Class representing a multi-factor authentication object.
 */
var PowerAuthAuthentication = /** @class */ (function () {
    function PowerAuthAuthentication() {
        /** Indicates if a possession factor should be used. */
        this.usePossession = false;
        /** Indicates if a biometry factor should be used. */
        this.useBiometry = false;
        /** Password to be used for knowledge factor, or nil of knowledge factor should not be used */
        this.userPassword = null;
        /**
         * Specifies the text displayed on Touch or Face ID prompt in case biometry is required to obtain data.
         *
         * Use this value to give user a hint on what is biometric authentication used for in this specific authentication.
         * For example, include a name of the account user uses to log in.
         * */
        this.biometryPrompt = null;
    }
    return PowerAuthAuthentication;
}());
export { PowerAuthAuthentication };
;
export var PowerAuthErrorCode;
(function (PowerAuthErrorCode) {
    /** When the error is not originating from the native module */
    PowerAuthErrorCode["PA2ReactNativeError"] = "PA2ReactNativeError";
    /** Code returned, or reported, when operation succeeds. */
    PowerAuthErrorCode["PA2Succeed"] = "PA2Succeed";
    /** Error code for error with network connectivity or download. */
    PowerAuthErrorCode["PA2ErrorCodeNetworkError"] = "PA2ErrorCodeNetworkError";
    /** Error code for error in signature calculation. */
    PowerAuthErrorCode["PA2ErrorCodeSignatureError"] = "PA2ErrorCodeSignatureError";
    /** Error code for error that occurs when activation state is invalid. */
    PowerAuthErrorCode["PA2ErrorCodeInvalidActivationState"] = "PA2ErrorCodeInvalidActivationState";
    /** Error code for error that occurs when activation data is invalid. */
    PowerAuthErrorCode["PA2ErrorCodeInvalidActivationData"] = "PA2ErrorCodeInvalidActivationData";
    /** Error code for error that occurs when activation is required but missing. */
    PowerAuthErrorCode["PA2ErrorCodeMissingActivation"] = "PA2ErrorCodeMissingActivation";
    /** Error code for error that occurs when pending activation is present and work with completed activation is required. */
    PowerAuthErrorCode["PA2ErrorCodeActivationPending"] = "PA2ErrorCodeActivationPending";
    /** Error code for situation when biometric prompt is canceled by the user. */
    PowerAuthErrorCode["PA2ErrorCodeBiometryCancel"] = "PA2ErrorCodeBiometryCancel";
    /**
     * Error code for canceled operation. This kind of error may occur in situations, when SDK
     * needs to cancel an asynchronous operation, but the cancel is not initiated by the application
     * itself. For example, if you reset the state of {@code PowerAuthSDK} during the pending
     * fetch for activation status, then the application gets an exception, with this error code.
     */
    PowerAuthErrorCode["PA2ErrorCodeOperationCancelled"] = "PA2ErrorCodeOperationCancelled";
    /** Error code for error that occurs when invalid activation code is provided. */
    PowerAuthErrorCode["PA2ErrorCodeInvalidActivationCode"] = "PA2ErrorCodeInvalidActivationCode";
    /** Error code for accessing an unknown token. */
    PowerAuthErrorCode["PA2ErrorCodeInvalidToken"] = "PA2ErrorCodeInvalidToken";
    /** Error code for errors related to end-to-end encryption. */
    PowerAuthErrorCode["PA2ErrorCodeEncryption"] = "PA2ErrorCodeEncryption";
    /** Error code for a general API misuse. */
    PowerAuthErrorCode["PA2ErrorCodeWrongParameter"] = "PA2ErrorCodeWrongParameter";
    /** Error code for protocol upgrade failure. The recommended action is to retry the status fetch operation, or locally remove the activation. */
    PowerAuthErrorCode["PA2ErrorCodeProtocolUpgrade"] = "PA2ErrorCodeProtocolUpgrade";
    /** The requested function is not available during the protocol upgrade. You can retry the operation, after the upgrade is finished. */
    PowerAuthErrorCode["PA2ErrorCodePendingProtocolUpgrade"] = "PA2ErrorCodePendingProtocolUpgrade";
    /** The biometric authentication cannot be processed due to lack of required hardware or due to a missing support from the operating system. */
    PowerAuthErrorCode["PA2ErrorCodeBiometryNotSupported"] = "PA2ErrorCodeBiometryNotSupported";
    /** The biometric authentication is temporarily unavailable. */
    PowerAuthErrorCode["PA2ErrorCodeBiometryNotAvailable"] = "PA2ErrorCodeBiometryNotAvailable";
    /** The biometric authentication did not recognize the biometric image (fingerprint, face, etc...) */
    PowerAuthErrorCode["PA2ErrorCodeBiometryNotRecognized"] = "PA2ErrorCodeBiometryNotRecognized";
    /** Error code for a general error related to WatchConnectivity (iOS only) */
    PowerAuthErrorCode["PA2ErrorCodeWatchConnectivity"] = "PA2ErrorCodeWatchConnectivity";
})(PowerAuthErrorCode || (PowerAuthErrorCode = {}));
function toBase64(input) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var str = input;
    var output = '';
    for (var block = 0, charCode = void 0, i = 0, map = chars; str.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
        charCode = str.charCodeAt(i += 3 / 4);
        if (charCode > 0xFF) {
            throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
        }
        block = block << 8 | charCode;
    }
    return output;
}
export default new PowerAuth();
