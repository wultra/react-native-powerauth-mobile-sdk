var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { NativeModules, Platform } from 'react-native';
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
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.nativeModule).commitActivation;
                        return [4 /*yield*/, this.processAuthentication(authentication)];
                    case 1: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
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
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.nativeModule).removeActivationWithAuthentication;
                        return [4 /*yield*/, this.processAuthentication(authentication)];
                    case 1: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
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
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.nativeModule).requestGetSignature;
                        return [4 /*yield*/, this.processAuthentication(authentication)];
                    case 1: return [2 /*return*/, _b.apply(_a, [_c.sent(), uriId, params !== null && params !== void 0 ? params : null])];
                }
            });
        });
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
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.nativeModule).requestSignature;
                        return [4 /*yield*/, this.processAuthentication(authentication)];
                    case 1: return [2 /*return*/, _b.apply(_a, [_c.sent(), method, uriId, body ? toBase64(body) : null])];
                }
            });
        });
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
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.nativeModule).offlineSignature;
                        return [4 /*yield*/, this.processAuthentication(authentication)];
                    case 1: return [2 /*return*/, _b.apply(_a, [_c.sent(), uriId, body ? toBase64(body) : null, nonce])];
                }
            });
        });
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
    PowerAuth.prototype.unsafeChangePassword = function (oldPassword, newPassword) {
        return this.nativeModule.unsafeChangePassword(oldPassword, newPassword);
    };
    /**
     * Regenerate a biometry related factor key.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for original private key decryption.
     *
     * @param password Password used for authentication during vault unlocking call.
     * @param title (used only in Android) Title for biometry dialog
     * @param description (used only in Android) Description for biometry dialog
     */
    PowerAuth.prototype.addBiometryFactor = function (password, title, description) {
        if (Platform.OS == "android") {
            return this.nativeModule.addBiometryFactor(password, title, description);
        }
        else {
            return this.nativeModule.addBiometryFactor(password);
        }
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
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.nativeModule).fetchEncryptionKey;
                        return [4 /*yield*/, this.processAuthentication(authentication)];
                    case 1: return [2 /*return*/, _b.apply(_a, [_c.sent(), index])];
                }
            });
        });
    };
    /**
     * Sign given data with the original device private key (asymetric signature).
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/vault/unlock' to obtain the vault encryption key used for private key decryption. Data is then signed using ECDSA algorithm with this key and can be validated on the server side.
     *
     * @param authentication Authentication used for vault unlocking call.
     * @param data Data to be signed with the private key.
     */
    PowerAuth.prototype.signDataWithDevicePrivateKey = function (authentication, data) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.nativeModule).signDataWithDevicePrivateKey;
                        return [4 /*yield*/, this.processAuthentication(authentication)];
                    case 1: return [2 /*return*/, _b.apply(_a, [_c.sent(), toBase64(data)])];
                }
            });
        });
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
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.nativeModule).activationRecoveryData;
                        return [4 /*yield*/, this.processAuthentication(authentication)];
                    case 1: return [2 /*return*/, _b.apply(_a, [_c.sent()])];
                }
            });
        });
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
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _b = (_a = this.nativeModule).confirmRecoveryCode;
                        _c = [recoveryCode];
                        return [4 /*yield*/, this.processAuthentication(authentication)];
                    case 1: return [2 /*return*/, _b.apply(_a, _c.concat([_d.sent()]))];
                }
            });
        });
    };
    /**
     * Retrieves authenticaiton key for biometry.
     *
     * @param title Dialog title
     * @param description  Dialog description
     */
    PowerAuth.prototype.processAuthentication = function (authentication) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function () {
            var key;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!(Platform.OS == "android" && authentication.useBiometry)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.nativeModule.authenticateWithBiometry((_a = authentication.biometryTitle) !== null && _a !== void 0 ? _a : "??", (_b = authentication.biometryMessage) !== null && _b !== void 0 ? _b : "??")];
                    case 1:
                        key = _c.sent();
                        authentication.biometryKey = key;
                        _c.label = 2;
                    case 2: return [2 /*return*/, authentication];
                }
            });
        });
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
         * Message displayed when prompted for biometric authentication
         */
        this.biometryMessage = null;
        /** (Android only) Title of biometric prompt */
        this.biometryTitle = null;
        /** Filled by the SDK. */
        this.biometryKey = null;
    }
    return PowerAuthAuthentication;
}());
export { PowerAuthAuthentication };
;
var PowerAuthError = /** @class */ (function () {
    function PowerAuthError(exception) {
        var _a, _b, _c, _d, _e;
        this.originalException = exception;
        this.code = (_a = exception === null || exception === void 0 ? void 0 : exception.code) !== null && _a !== void 0 ? _a : null;
        this.message = (_b = exception === null || exception === void 0 ? void 0 : exception.message) !== null && _b !== void 0 ? _b : null;
        this.domain = (_c = exception === null || exception === void 0 ? void 0 : exception.domain) !== null && _c !== void 0 ? _c : null;
        this.description = (_e = (_d = exception === null || exception === void 0 ? void 0 : exception.userInfo) === null || _d === void 0 ? void 0 : _d.NSLocalizedDescription) !== null && _e !== void 0 ? _e : null;
    }
    PowerAuthError.prototype.print = function () {
        return "code: " + this.code + "\nmessage: " + this.message + "\ndomain: " + this.domain + "\ndescription: " + this.description;
    };
    return PowerAuthError;
}());
export { PowerAuthError };
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
var PowerAuthOtpUtil = /** @class */ (function () {
    function PowerAuthOtpUtil() {
    }
    /**
     * Parses an input |activationCode| (which may or may not contain an optional signature) and returns PowerAuthOtp
     * object filled with valid data. The method doesn't perform an auto-correction, so the provided code must be valid.
     *
     * @return OTP object
     * @throws error when not valid
     */
    PowerAuthOtpUtil.parseActivationCode = function (activationCode) {
        return NativeModules.PowerAuth.parseActivationCode(activationCode);
    };
    /**
     * Parses an input |recoveryCode| (which may or may not contain an optional "R:" prefix) and returns PowerAuthOtp
     * object filled with valid data. The method doesn't perform an auto-correction, so the provided code must be valid.
     *
     * @return OTP object
     * @throws error when not valid
     */
    PowerAuthOtpUtil.parseRecoveryCode = function (recoveryCode) {
        return NativeModules.PowerAuth.parseRecoveryCode(recoveryCode);
    };
    /**
     * Returns true if |activationCode| is a valid activation code. The input code must not contain a signature part.
     * You can use this method to validate a whole user-typed activation code at once.
     */
    PowerAuthOtpUtil.validateActivationCode = function (activationCode) {
        return NativeModules.PowerAuth.validateActivationCode(activationCode);
    };
    /**
     * Returns true if |recoveryCode| is a valid recovery code. You can use this method to validate
     * a whole user-typed recovery code at once. The input code may contain "R:" prefix, if code is scanned from QR code.
     */
    PowerAuthOtpUtil.validateRecoveryCode = function (recoveryCode) {
        return NativeModules.PowerAuth.validateRecoveryCode(recoveryCode);
    };
    /**
     * Returns true if |puk| appears to be valid. You can use this method to validate
     * a whole user-typed recovery PUK at once. In current version, only 10 digits long string is considered as a valid PUK.
     */
    PowerAuthOtpUtil.validateRecoveryPuk = function (puk) {
        return NativeModules.PowerAuth.validateRecoveryPuk(puk);
    };
    /**
     * Returns true if |character| is a valid character allowed in the activation or recovery code.
     * The method strictly checks whether the character is from [A-Z2-7] characters range.
     */
    PowerAuthOtpUtil.validateTypedCharacter = function (character) {
        return NativeModules.PowerAuth.validateTypedCharacter(character);
    };
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
    PowerAuthOtpUtil.correctTypedCharacter = function (character) {
        return NativeModules.PowerAuth.correctTypedCharacter(character);
    };
    return PowerAuthOtpUtil;
}());
export { PowerAuthOtpUtil };
// HELPER METHODS
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
