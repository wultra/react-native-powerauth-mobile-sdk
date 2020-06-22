import { NativeModules } from 'react-native';

/**
 * Class used for the main interaction with the PowerAuth SDK components.
 */
class PowerAuth {

    private nativeModule = NativeModules.PowerAuth;

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
    configure(instanceId: string, appKey: string, appSecret: string, masterServerPublicKey: string, baseEndpointUrl: string, enableUnsecureTraffic: boolean): Promise<boolean>  {
        return this.nativeModule.configure(instanceId, appKey, appSecret, masterServerPublicKey, baseEndpointUrl, enableUnsecureTraffic);
    }

    /**
     * Checks if there is a valid activation.
     * 
     * @returns true if there is a valid activation, false otherwise.
     */
    hasValidActivation(): Promise<boolean> {
        return this.nativeModule.hasValidActivation();
    }

    /**
     * Check if it is possible to start an activation process.
     * 
     * @return true if activation process can be started, false otherwise.
     */
    canStartActivation(): Promise<boolean> {
        return this.nativeModule.canStartActivation();
    }

    /**
     * Checks if there is a pending activation (activation in progress).
     * 
     * @return true if there is a pending activation, false otherwise.
     */
    hasPendingActivation(): Promise<boolean> {
        return this.nativeModule.hasPendingActivation();
    }

    /**
     * Fetch the activation status for current activation.
     * 
     * @return A promise with activation status result - it contains status information in case of success and error in case of failure.
     */
    fetchActivationStatus(): Promise<PowerAuthActivationStatus> {
        return this.nativeModule.fetchActivationStatus();
    }

    /**
     * Create a new activation.
     * 
     * @param activation A PowerAuthActivation object containg all information required for the activation creation.
     */
    createActivation(activation: PowerAuthActivation): Promise<PowerAuthCreateActivationResult> {
        return this.nativeModule.createActivation(activation);
    }

    /**
     * Commit activation that was created and store related data using provided authentication instance.
     * 
     * @param authentication An authentication instance specifying what factors should be stored.
     */
    commitActivation(authentication: PowerAuthAuthentication): Promise<boolean> {
        return this.nativeModule.commitActivation(authentication)
    }

    /**
     * Activation identifier or null if object has no valid activation.
     */
    getActivationIdentifier(): Promise<string> {
        return this.nativeModule.activationIdentifier();
    }

    /**
     * Fingerprint calculated from device's public key or null if object has no valid activation.
     */
    getActivationFingerprint(): Promise<string> {
        return this.nativeModule.activationFingerprint();
    }

    /**
     * Remove current activation by calling a PowerAuth Standard RESTful API endpoint '/pa/activation/remove'.
     * 
     * @param authentication An authentication instance specifying what factors should be used to sign the request.
     */
    removeActivationWithAuthentication(authentication: PowerAuthAuthentication): Promise<boolean> {
        return this.nativeModule.removeActivationWithAuthentication(authentication);
    }

    /**
     * This method removes the activation session state and biometry factor key. Cached possession related key remains intact.
     * Unlike the `removeActivationWithAuthentication`, this method doesn't inform server about activation removal. In this case
     * user has to remove the activation by using another channel (typically internet banking, or similar web management console)
     */
    removeActivationLocal(): void {
        return this.nativeModule.removeActivationLocal();
    }
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
export enum PA2ActivationState {
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
export class PowerAuthActivation {

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
    static createWithActivationCode(activationCode: string, name: string): PowerAuthActivation {
        const a = new PowerAuthActivation();
        a.activationName = name;
        a.activationCode = activationCode;
        return a;
    }

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
    static createWithRecoveryCode(recoveryCode: string, recoveryPuk: string, name: string): PowerAuthActivation {
        const a = new PowerAuthActivation();
        a.activationName = name;
        a.recoveryCode = recoveryCode;
        a.recoveryPuk = recoveryPuk;
        return a;
    }

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
    static createWithIdentityAttributes(identityAttributes: any, name: string): PowerAuthActivation {
        const a = new PowerAuthActivation();
        a.activationName = name;
        a.identityAttributes = identityAttributes;
        return a;
    }
};
/**
 * Class representing a multi-factor authentication object.
 */
export class PowerAuthAuthentication {
    /** Indicates if a possession factor should be used. */
    usePossession: boolean = false;
    /** Indicates if a biometry factor should be used. */
    useBiometry: boolean = false;
    /** Password to be used for knowledge factor, or nil of knowledge factor should not be used */
    userPassword: string = null;
    /**
     * Specifies the text displayed on Touch or Face ID prompt in case biometry is required to obtain data.
     * 
     * Use this value to give user a hint on what is biometric authentication used for in this specific authentication.
     * For example, include a name of the account user uses to log in. 
     * */
    biometryPrompt: string = null;
};

export enum PowerAuthErrorCode {

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

export default new PowerAuth();

