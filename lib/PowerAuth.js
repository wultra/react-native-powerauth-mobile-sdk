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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
import { NativeModules, Platform } from 'react-native';
import { PowerAuthError } from './model/PowerAuthError';
import { __AuthenticationUtils } from "./internal/AuthenticationUtils";
/**
 * Class used for the main interaction with the PowerAuth SDK components.
 */
var PowerAuth = /** @class */ (function () {
    /**
     * Prepares the PowerAuth instance.
     *
     * 2 instances with the same instanceId will be internaly the same object!
     *
     * @param instanceId Identifier of the PowerAuthSDK instance. The bundle identifier/packagename is recommended.
     */
    function PowerAuth(instanceId) {
        this.instanceId = instanceId;
    }
    /**
     * If this PowerAuth instance was configured.
     */
    PowerAuth.prototype.isConfigured = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.native("isConfigured")];
            });
        });
    };
    /**
     * Prepares the PowerAuth instance. This method needs to be called before before any other method.
     *
     * @param appKey APPLICATION_KEY as defined in PowerAuth specification - a key identifying an application version.
     * @param appSecret APPLICATION_SECRET as defined in PowerAuth specification - a secret associated with an application version.
     * @param masterServerPublicKey KEY_SERVER_MASTER_PUBLIC as defined in PowerAuth specification - a master server public key.
     * @param baseEndpointUrl Base URL to the PowerAuth Standard RESTful API (the URL part before "/pa/...").
     * @param enableUnsecureTraffic If HTTP and invalid HTTPS communication should be enabled
     * @returns Promise that with result of the configuration (can by rejected if already configured).
     */
    PowerAuth.prototype.configure = function (appKey, appSecret, masterServerPublicKey, baseEndpointUrl, enableUnsecureTraffic) {
        return this.native("configure", appKey, appSecret, masterServerPublicKey, baseEndpointUrl, enableUnsecureTraffic);
    };
    /**
     * Deconfigures the instance
     */
    PowerAuth.prototype.deconfigure = function () {
        return this.native("deconfigure");
    };
    /**
     * Checks if there is a valid activation.
     *
     * @returns true if there is a valid activation, false otherwise.
     */
    PowerAuth.prototype.hasValidActivation = function () {
        return this.native("hasValidActivation");
    };
    /**
     * Check if it is possible to start an activation process.
     *
     * @return true if activation process can be started, false otherwise.
     */
    PowerAuth.prototype.canStartActivation = function () {
        return this.native("canStartActivation");
    };
    /**
     * Checks if there is a pending activation (activation in progress).
     *
     * @return true if there is a pending activation, false otherwise.
     */
    PowerAuth.prototype.hasPendingActivation = function () {
        return this.native("hasPendingActivation");
    };
    /**
     * Fetch the activation status for current activation.
     *
     * @return A promise with activation status result - it contains status information in case of success and error in case of failure.
     */
    PowerAuth.prototype.fetchActivationStatus = function () {
        return this.native("fetchActivationStatus");
    };
    /**
     * Create a new activation.
     *
     * @param activation A PowerAuthActivation object containg all information required for the activation creation.
     */
    PowerAuth.prototype.createActivation = function (activation) {
        return this.native("createActivation", activation);
    };
    /**
     * Commit activation that was created and store related data using provided authentication instance.
     *
     * @param authentication An authentication instance specifying what factors should be stored.
     */
    PowerAuth.prototype.commitActivation = function (authentication) {
        return this.native("commitActivation", authentication);
    };
    /**
     * Activation identifier or null if object has no valid activation.
     */
    PowerAuth.prototype.getActivationIdentifier = function () {
        return this.native("activationIdentifier");
    };
    /**
     * Fingerprint calculated from device's public key or null if object has no valid activation.
     */
    PowerAuth.prototype.getActivationFingerprint = function () {
        return this.native("activationFingerprint");
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
                        _a = this.native;
                        _b = ["removeActivationWithAuthentication"];
                        return [4 /*yield*/, __AuthenticationUtils.process(this.instanceId, authentication)];
                    case 1: return [2 /*return*/, _a.apply(this, _b.concat([_c.sent()]))];
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
        return this.native("removeActivationLocal");
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
                        _a = this.native;
                        _b = ["requestGetSignature"];
                        return [4 /*yield*/, __AuthenticationUtils.process(this.instanceId, authentication)];
                    case 1: return [2 /*return*/, _a.apply(this, _b.concat([_c.sent(), uriId, params !== null && params !== void 0 ? params : null]))];
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
                        _a = this.native;
                        _b = ["requestSignature"];
                        return [4 /*yield*/, __AuthenticationUtils.process(this.instanceId, authentication)];
                    case 1: return [2 /*return*/, _a.apply(this, _b.concat([_c.sent(), method, uriId, body]))];
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
                        _a = this.native;
                        _b = ["offlineSignature"];
                        return [4 /*yield*/, __AuthenticationUtils.process(this.instanceId, authentication)];
                    case 1: return [2 /*return*/, _a.apply(this, _b.concat([_c.sent(), uriId, body, nonce]))];
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
        return this.native("verifyServerSignedData", data, signature, masterKey);
    };
    /**
     * Change the password, validate old password by calling a PowerAuth Standard RESTful API endpoint '/pa/signature/validate'.
     *
     * @param oldPassword Old password, currently set to store the data.
     * @param newPassword New password, to be set in case authentication with old password passes.
     */
    PowerAuth.prototype.changePassword = function (oldPassword, newPassword) {
        return this.native("changePassword", oldPassword, newPassword);
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
        return this.native("unsafeChangePassword", oldPassword, newPassword);
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
            return this.native("addBiometryFactor", password, title, description);
        }
        else {
            return this.native("addBiometryFactor", password);
        }
    };
    /**
     * Checks if a biometry related factor is present.
     * This method returns the information about the key value being present in keychain.
     */
    PowerAuth.prototype.hasBiometryFactor = function () {
        return this.native("hasBiometryFactor");
    };
    /**
     * Remove the biometry related factor key.
     *
     * @return true if the key was successfully removed, NO otherwise.
     */
    PowerAuth.prototype.removeBiometryFactor = function () {
        return this.native("removeBiometryFactor");
    };
    /**
     * Returns biometry info data.
     *
     * @returns object with information data about biometry
     */
    PowerAuth.prototype.getBiometryInfo = function () {
        return this.native("getBiometryInfo");
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
                        _a = this.native;
                        _b = ["fetchEncryptionKey"];
                        return [4 /*yield*/, __AuthenticationUtils.process(this.instanceId, authentication)];
                    case 1: return [2 /*return*/, _a.apply(this, _b.concat([_c.sent(), index]))];
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
                        _a = this.native;
                        _b = ["signDataWithDevicePrivateKey"];
                        return [4 /*yield*/, __AuthenticationUtils.process(this.instanceId, authentication)];
                    case 1: return [2 /*return*/, _a.apply(this, _b.concat([_c.sent(), data]))];
                }
            });
        });
    };
    /**
     * Validate a user password.
     * This method calls PowerAuth Standard RESTful API endpoint '/pa/signature/validate' to validate the signature value.
     *
     * @param password Password to be verified.
     */
    PowerAuth.prototype.validatePassword = function (password) {
        return this.native("validatePassword", password);
    };
    /**
     * Returns YES if underlying session contains an activation recovery data.
     */
    PowerAuth.prototype.hasActivationRecoveryData = function () {
        return this.native("hasActivationRecoveryData");
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
                        _a = this.native;
                        _b = ["activationRecoveryData"];
                        return [4 /*yield*/, __AuthenticationUtils.process(this.instanceId, authentication)];
                    case 1: return [2 /*return*/, _a.apply(this, _b.concat([_c.sent()]))];
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
     *
     * @returns Result of the confirmation
     */
    PowerAuth.prototype.confirmRecoveryCode = function (recoveryCode, authentication) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _c = {};
                        _a = this.native;
                        _b = ["confirmRecoveryCode", recoveryCode];
                        return [4 /*yield*/, __AuthenticationUtils.process(this.instanceId, authentication)];
                    case 1: return [4 /*yield*/, _a.apply(this, _b.concat([_d.sent()]))];
                    case 2: return [2 /*return*/, (_c.alreadyConfirmed = _d.sent(), _c)];
                }
            });
        });
    };
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
    PowerAuth.prototype.groupedBiometricAuthentication = function (authentication, groupedAuthenticationCalls) {
        return __awaiter(this, void 0, void 0, function () {
            var reusable, e_1, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (authentication.useBiometry == false) {
                            throw new PowerAuthError(null, "Requesting biometric authentication, but `useBiometry` is set to false.");
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, __AuthenticationUtils.process(this.instanceId, authentication, true)];
                    case 2:
                        reusable = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        // integrator defined chain of authorization calls with reusable authentication
                        return [4 /*yield*/, groupedAuthenticationCalls(reusable)];
                    case 4:
                        // integrator defined chain of authorization calls with reusable authentication
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _a.sent();
                        // rethrow the error with information that the integrator should handle errors by himself
                        throw new PowerAuthError(e_1, "Your 'groupedAuthenticationCalls' function threw an exception. Please make sure that you catch errors yourself.");
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        e_2 = _a.sent();
                        // catching biometry authentication error and rethrowing it as PowerAuthError
                        throw new PowerAuthError(e_2);
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    PowerAuth.prototype.native = function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (NativeModules.PowerAuth[name].apply(null, __spreadArrays([this.instanceId], args)))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        e_3 = _a.sent();
                        throw new PowerAuthError(e_3);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return PowerAuth;
}());
export { PowerAuth };
