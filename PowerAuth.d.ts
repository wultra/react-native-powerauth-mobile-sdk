/**
 * Class used for the main interaction with the PowerAuth SDK components.
 */
declare class PowerAuth {
    private nativeModule;
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
    configure(instanceId: string, appKey: string, appSecret: string, masterServerPublicKey: string, baseEndpointUrl: string, enableUnsecureTraffic: boolean): Promise<boolean>;
    /**
     * Checks if there is a valid activation.
     *
     * @returns true if there is a valid activation, false otherwise.
     */
    hasValidActivation(): Promise<boolean>;
    /**
     * Check if it is possible to start an activation process.
     *
     * @return true if activation process can be started, false otherwise.
     */
    canStartActivation(): Promise<boolean>;
    /**
     * Checks if there is a pending activation (activation in progress).
     *
     * @return true if there is a pending activation, false otherwise.
     */
    hasPendingActivation(): Promise<boolean>;
    /**
     * Fetch the activation status for current activation.
     *
     * @return A promise with activation status result - it contains status information in case of success and error in case of failure.
     */
    fetchActivationStatus(): Promise<PowerAuthActivationStatus>;
    /**
     * Create a new activation.
     *
     * @param activation A PowerAuthActivation object containg all information required for the activation creation.
     */
    createActivation(activation: PowerAuthActivation): Promise<PowerAuthCreateActivationResult>;
    /**
     * Commit activation that was created and store related data using provided authentication instance.
     *
     * @param authentication An authentication instance specifying what factors should be stored.
     */
    commitActivation(authentication: PowerAuthAuthentication): Promise<void>;
    /**
     * Activation identifier or null if object has no valid activation.
     */
    getActivationIdentifier(): Promise<string>;
    /**
     * Fingerprint calculated from device's public key or null if object has no valid activation.
     */
    getActivationFingerprint(): Promise<string>;
    /**
     * Remove current activation by calling a PowerAuth Standard RESTful API endpoint '/pa/activation/remove'.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     */
    removeActivationWithAuthentication(authentication: PowerAuthAuthentication): Promise<void>;
    /**
     * This method removes the activation session state and biometry factor key. Cached possession related key remains intact.
     * Unlike the `removeActivationWithAuthentication`, this method doesn't inform server about activation removal. In this case
     * user has to remove the activation by using another channel (typically internet banking, or similar web management console)
     */
    removeActivationLocal(): void;
    /**
     * Compute the HTTP signature header for GET HTTP method, URI identifier and HTTP query parameters using provided authentication information.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     * @param uriId URI identifier.
     * @param params HTTP query params.
     * @return HTTP header with PowerAuth authorization signature
     */
    requestGetSignature(authentication: PowerAuthAuthentication, uriId: string, params?: any): Promise<PowerAuthAuthorizationHttpHeader>;
    /**
     * Compute the HTTP signature header for given HTTP method, URI identifier and HTTP request body using provided authentication information.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     * @param method HTTP method used for the signature computation.
     * @param uriId URI identifier.
     * @param body HTTP request body.
     * @return HTTP header with PowerAuth authorization signature.
     */
    requestSignature(authentication: PowerAuthAuthentication, method: string, uriId: string, body?: string): Promise<PowerAuthAuthorizationHttpHeader>;
    /**
     * Compute the offline signature for given HTTP method, URI identifier and HTTP request body using provided authentication information.
     *
     * @param authentication An authentication instance specifying what factors should be used to sign the request. The possession and knowledge is recommended.
     * @param uriId URI identifier.
     * @param body HTTP request body.
     * @param nonce NONCE in Base64 format.
     * @return String representing a calculated signature for all involved factors.
     */
    offlineSignature(authentication: PowerAuthAuthentication, uriId: string, nonce: string, body?: string): Promise<string>;
    /**
     * Validates whether the data has been signed with master server private key or personalized server's private key.
     *
     * @param data An arbitrary data
     * @param signature A signature calculated for data, in Base64 format
     * @param masterKey If true, then master server public key is used for validation, otherwise personalized server's public key.
     */
    verifyServerSignedData(data: string, signature: string, masterKey: boolean): Promise<boolean>;
    /**
     * Change the password, validate old password by calling a PowerAuth Standard RESTful API endpoint '/pa/vault/unlock'.
     *
     * @param oldPassword Old password, currently set to store the data.
     * @param newPassword New password, to be set in case authentication with old password passes.
     */
    changePassword(oldPassword: string, newPassword: string): Promise<void>;
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
    unsafeChangePassword(oldPassword: string, newPassword: string): Promise<boolean>;
    /**
     * Regenerate a biometry related factor key.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for original private key decryption.
     *
     * @param password Password used for authentication during vault unlocking call.
     * @param title (used only in Android) Title for biometry dialog
     * @param description (used only in Android) Description for biometry dialog
     */
    addBiometryFactor(password: string, title: string, description: string): Promise<void>;
    /**
     * Checks if a biometry related factor is present.
     * This method returns the information about the key value being present in keychain.
     */
    hasBiometryFactor(): Promise<boolean>;
    /**
     * Remove the biometry related factor key.
     *
     * @return true if the key was successfully removed, NO otherwise.
     */
    removeBiometryFactor(): Promise<boolean>;
    /**
     * Generate a derived encryption key with given index.
     * The key is returned in form of base64 encoded string.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for subsequent key derivation using given index.
     *
     * @param authentication Authentication used for vault unlocking call.
     * @param index Index of the derived key using KDF.
     */
    fetchEncryptionKey(authentication: PowerAuthAuthentication, index: number): Promise<string>;
    /**
     * Sign given data with the original device private key (asymetric signature).
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for private key decryption. Data is then signed using ECDSA algorithm with this key and can be validated on the server side.
     *
     * @param authentication Authentication used for vault unlocking call.
     * @param data Data to be signed with the private key.
     */
    signDataWithDevicePrivateKey(authentication: PowerAuthAuthentication, data: string): Promise<string>;
    /**
     * Validate a user password.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to validate the signature value.
     *
     * @param password Password to be verified.
     */
    validatePassword(password: string): Promise<void>;
    /**
     * Returns YES if underlying session contains an activation recovery data.
     */
    hasActivationRecoveryData(): Promise<boolean>;
    /**
     * Get an activation recovery data.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for private recovery data decryption.
     *
     * @param authentication Authentication used for vault unlocking call.
     */
    activationRecoveryData(authentication: PowerAuthAuthentication): Promise<PowerAuthRecoveryActivationData>;
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
    confirmRecoveryCode(recoveryCode: string, authentication: PowerAuthAuthentication): Promise<void>;
    /**
     * Retrieves authenticaiton key for biometry.
     *
     * @param title Dialog title
     * @param description  Dialog description
     */
    private processAuthentication;
}
/**
 * Success object returned by "createActivation" call.
 */
export interface PowerAuthCreateActivationResult {
    activationFingerprint: string;
    activationRecovery?: PowerAuthRecoveryActivationData;
}
export interface PowerAuthRecoveryActivationData {
    recoveryCode: string;
    puk: string;
}
export interface PowerAuthActivationStatus {
    state: PA2ActivationState;
    failCount: number;
    maxFailCount: number;
    remainingAttempts: number;
}
/**
 * Class representing authorization HTTP header with the PowerAuth-Authorization or PowerAuth-Token signature.
 */
export interface PowerAuthAuthorizationHttpHeader {
    /**
     * Property representing PowerAuth HTTP Authorization Header. The current implementation
     * contains value "X-PowerAuth-Authorization" for standard authorization and "X-PowerAuth-Token" for
     * token-based authorization.
     */
    key: string;
    /** Computed value of the PowerAuth HTTP Authorization Header, to be used in HTTP requests "as is". */
    value: string;
}
export declare enum PA2ActivationState {
    PA2ActivationState_Created = "PA2ActivationState_Created",
    PA2ActivationState_PendingCommit = "PA2ActivationState_PendingCommit",
    PA2ActivationState_Active = "PA2ActivationState_Active",
    PA2ActivationState_Blocked = "PA2ActivationState_Blocked",
    PA2ActivationState_Removed = "PA2ActivationState_Removed",
    PA2ActivationState_Deadlock = "PA2ActivationState_Deadlock"
}
/**
 * The `PowerAuthActivation` object contains activation data required for the activation creation. The object supports
 * all types of activation currently supported in the SDK.
 */
export declare class PowerAuthActivation {
    /** parameters that are filled by create* methods  */
    activationName: string;
    activationCode?: string;
    recoveryCode?: string;
    recoveryPuk?: string;
    identityAttributes?: any;
    /** Extra attributes of the activation, used for application specific purposes (for example, info about the clientdevice or system). This extras string will be associated with the activation record on PowerAuth Server. */
    extras?: string;
    /** Custom attributes object that are processed on Intermediate Server Application. Note that this custom data will not be associated with the activation record on PowerAuth Server */
    customAttributes?: any;
    /** Additional activation OTP that can be used only with a regular activation, by activation code */
    additionalActivationOtp?: string;
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
    static createWithActivationCode(activationCode: string, name: string): PowerAuthActivation;
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
    static createWithRecoveryCode(recoveryCode: string, recoveryPuk: string, name: string): PowerAuthActivation;
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
    static createWithIdentityAttributes(identityAttributes: any, name: string): PowerAuthActivation;
}
/**
 * Class representing a multi-factor authentication object.
 */
export declare class PowerAuthAuthentication {
    /** Indicates if a possession factor should be used. */
    usePossession: boolean;
    /** Indicates if a biometry factor should be used. */
    useBiometry: boolean;
    /** Password to be used for knowledge factor, or nil of knowledge factor should not be used */
    userPassword?: string;
    /**
     * Message displayed when prompted for biometric authentication
     */
    biometryMessage: string;
    /** (Android only) Title of biometric prompt */
    biometryTitle: string;
    /** Filled by the SDK. */
    biometryKey: string;
}
export declare class PowerAuthError {
    code?: PowerAuthErrorCode;
    message?: string;
    domain?: string;
    description?: string;
    originalException: any;
    constructor(exception: any);
    print(): string;
}
export declare enum PowerAuthErrorCode {
    /** When the error is not originating from the native module */
    PA2ReactNativeError = "PA2ReactNativeError",
    /** Code returned, or reported, when operation succeeds. */
    PA2Succeed = "PA2Succeed",
    /** Error code for error with network connectivity or download. */
    PA2ErrorCodeNetworkError = "PA2ErrorCodeNetworkError",
    /** Error code for error in signature calculation. */
    PA2ErrorCodeSignatureError = "PA2ErrorCodeSignatureError",
    /** Error code for error that occurs when activation state is invalid. */
    PA2ErrorCodeInvalidActivationState = "PA2ErrorCodeInvalidActivationState",
    /** Error code for error that occurs when activation data is invalid. */
    PA2ErrorCodeInvalidActivationData = "PA2ErrorCodeInvalidActivationData",
    /** Error code for error that occurs when activation is required but missing. */
    PA2ErrorCodeMissingActivation = "PA2ErrorCodeMissingActivation",
    /** Error code for error that occurs when pending activation is present and work with completed activation is required. */
    PA2ErrorCodeActivationPending = "PA2ErrorCodeActivationPending",
    /** Error code for situation when biometric prompt is canceled by the user. */
    PA2ErrorCodeBiometryCancel = "PA2ErrorCodeBiometryCancel",
    /**
     * Error code for canceled operation. This kind of error may occur in situations, when SDK
     * needs to cancel an asynchronous operation, but the cancel is not initiated by the application
     * itself. For example, if you reset the state of {@code PowerAuthSDK} during the pending
     * fetch for activation status, then the application gets an exception, with this error code.
     */
    PA2ErrorCodeOperationCancelled = "PA2ErrorCodeOperationCancelled",
    /** Error code for error that occurs when invalid activation code is provided. */
    PA2ErrorCodeInvalidActivationCode = "PA2ErrorCodeInvalidActivationCode",
    /** Error code for accessing an unknown token. */
    PA2ErrorCodeInvalidToken = "PA2ErrorCodeInvalidToken",
    /** Error code for errors related to end-to-end encryption. */
    PA2ErrorCodeEncryption = "PA2ErrorCodeEncryption",
    /** Error code for a general API misuse. */
    PA2ErrorCodeWrongParameter = "PA2ErrorCodeWrongParameter",
    /** Error code for protocol upgrade failure. The recommended action is to retry the status fetch operation, or locally remove the activation. */
    PA2ErrorCodeProtocolUpgrade = "PA2ErrorCodeProtocolUpgrade",
    /** The requested function is not available during the protocol upgrade. You can retry the operation, after the upgrade is finished. */
    PA2ErrorCodePendingProtocolUpgrade = "PA2ErrorCodePendingProtocolUpgrade",
    /** The biometric authentication cannot be processed due to lack of required hardware or due to a missing support from the operating system. */
    PA2ErrorCodeBiometryNotSupported = "PA2ErrorCodeBiometryNotSupported",
    /** The biometric authentication is temporarily unavailable. */
    PA2ErrorCodeBiometryNotAvailable = "PA2ErrorCodeBiometryNotAvailable",
    /** The biometric authentication did not recognize the biometric image (fingerprint, face, etc...) */
    PA2ErrorCodeBiometryNotRecognized = "PA2ErrorCodeBiometryNotRecognized",
    /** Error code for a general error related to WatchConnectivity (iOS only) */
    PA2ErrorCodeWatchConnectivity = "PA2ErrorCodeWatchConnectivity"
}
/**
 * The `PowerAuthOtpUtil` provides various set of methods for parsing and validating
 activation or recovery codes.
 
 Current format:
 ------------------
 code without signature:	CCCCC-CCCCC-CCCCC-CCCCC
 code with signature:		CCCCC-CCCCC-CCCCC-CCCCC#BASE64_STRING_WITH_SIGNATURE
 
 recovery code:				CCCCC-CCCCC-CCCCC-CCCCC
 recovery code from QR:		R:CCCCC-CCCCC-CCCCC-CCCCC
 
 recovery PUK:				DDDDDDDDDD
 
 - Where the 'C' is Base32 sequence of characters, fully decodable into the sequence of bytes.
   The validator then compares CRC-16 checksum calculated for the first 10 bytes and compares
   it to last two bytes (in big endian order).
 
 - Where the 'D' is digit (0 - 9)
 
 As you can see, both activation and recovery codes, shares the same basic principle (like CRC16
 checksum). That's why parser returns the same `PowerAuthOtp` object for both scenarios.
 */
export declare class PowerAuthOtpUtil {
    /**
     * Parses an input |activationCode| (which may or may not contain an optional signature) and returns PowerAuthOtp
     * object filled with valid data. The method doesn't perform an auto-correction, so the provided code must be valid.
     *
     * @return OTP object
     * @throws error when not valid
     */
    static parseActivationCode(activationCode: string): Promise<PowerAuthOtp>;
    /**
     * Parses an input |recoveryCode| (which may or may not contain an optional "R:" prefix) and returns PowerAuthOtp
     * object filled with valid data. The method doesn't perform an auto-correction, so the provided code must be valid.
     *
     * @return OTP object
     * @throws error when not valid
     */
    static parseRecoveryCode(recoveryCode: string): Promise<PowerAuthOtp>;
    /**
     * Returns true if |activationCode| is a valid activation code. The input code must not contain a signature part.
     * You can use this method to validate a whole user-typed activation code at once.
     */
    static validateActivationCode(activationCode: string): Promise<boolean>;
    /**
     * Returns true if |recoveryCode| is a valid recovery code. You can use this method to validate
     * a whole user-typed recovery code at once. The input code may contain "R:" prefix, if code is scanned from QR code.
     */
    static validateRecoveryCode(recoveryCode: string): Promise<boolean>;
    /**
     * Returns true if |puk| appears to be valid. You can use this method to validate
     * a whole user-typed recovery PUK at once. In current version, only 10 digits long string is considered as a valid PUK.
     */
    static validateRecoveryPuk(puk: string): Promise<boolean>;
    /**
     * Returns true if |character| is a valid character allowed in the activation or recovery code.
     * The method strictly checks whether the character is from [A-Z2-7] characters range.
     */
    static validateTypedCharacter(character: number): Promise<boolean>;
    /**
     * Validates an input |character| and throws if it's not valid or cannot be corrected.
     * The returned value contains the same input character, or the corrected one.
     * You can use this method for validation & auto-correction of just typed characters.
     *
     * The function performs following auto-corections:
     * - lowercase characters are corrected to uppercase (e.g. 'a' will be corrected to 'A')
     * - '0' is corrected to 'O'
     * - '1' is corrected to 'I'
     */
    static correctTypedCharacter(character: number): Promise<number>;
}
/**
 The `PowerAuthOtp` object contains parsed components from user-provided activation, or recovery
 code. You can use methods from `PowerAuthOtpUtil` class to fill this object with valid data.
 */
interface PowerAuthOtp {
    /**
     * If object is constructed from an activation code, then property contains just a code, without a signature part.
     * If object is constructed from a recovery code, then property contains just a code, without an optional "R:" prefix.
     */
    activationCode: string;
    /**
     * Signature calculated from activationCode. The value is typically optional for cases,
     * when the user re-typed activation code manually.
     *
     * If object is constructed from a recovery code, then the activation signature part is always empty.
     */
    activationSignature: string;
}
declare const _default: PowerAuth;
export default _default;
