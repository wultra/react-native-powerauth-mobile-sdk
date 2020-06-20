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
     * @returns Promise that with result of the configuration.
     */
    PowerAuth.prototype.configure = function (instanceId, appKey, appSecret, masterServerPublicKey, baseEndpointUrl) {
        return this.nativeModule.configure(instanceId, appKey, appSecret, masterServerPublicKey, baseEndpointUrl);
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
    return PowerAuth;
}());
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
export default new PowerAuth();
