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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { NativeModules, Platform } from 'react-native';
import { PowerAuthError } from '../model/PowerAuthError';
import { PowerAuthAuthentication } from '../model/PowerAuthAuthentication';
var __NativeWrapper = /** @class */ (function () {
    function __NativeWrapper(powerAuthInstanceId) {
        this.powerAuthInstanceId = powerAuthInstanceId;
    }
    __NativeWrapper.prototype.call = function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (NativeModules.PowerAuth[name].apply(null, __spreadArray([this.powerAuthInstanceId], args, true)))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        e_1 = _a.sent();
                        throw __NativeWrapper.processException(e_1);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    __NativeWrapper.call = function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, (NativeModules.PowerAuth[name].apply(null, __spreadArray([], args, true)))];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        e_2 = _a.sent();
                        throw __NativeWrapper.processException(e_2);
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Process any exception reported from the native module and handle platfrom specific cases.
     * The method also validate whether exception parameter is already PowerAuthError type, to prevent
     * double error wrapping.
     *
     * @param exception Exception to process.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    __NativeWrapper.processException = function (exception, message) {
        if (message === void 0) { message = null; }
        // Initial checks:
        // - Check if exception is null. That can happen when non-native exception is processed.
        // - Check if the exception is already PowerAuthError type. If so, then return the same instance.
        if (exception == null) {
            return new PowerAuthError(null, message !== null && message !== void 0 ? message : "Operation failed with unspecified error");
        }
        else if (exception instanceof PowerAuthError) {
            // There's no additional message, we can return exception as it is.
            if (message == null) {
                return exception;
            }
            // There's additional message, so wrap PowerAuthError into another PowerAuthError
            return new PowerAuthError(exception, message);
        }
        // Otherwise handle the platform specific cases.
        if (Platform.OS == "android") {
            return this.processAndroidException(exception, message);
        }
        else if (Platform.OS == "ios") {
            return this.processIosException(exception, message);
        }
        else {
            return new PowerAuthError(null, "Unsupported platform");
        }
    };
    /**
     * Process iOS specific exception reported from the native module.
     *
     * @param exception Original exception reported from iOS native module.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    __NativeWrapper.processIosException = function (exception, message) {
        if (message === void 0) { message = null; }
        return new PowerAuthError(exception, message);
    };
    /**
     * Process Android specific exception reported from the native module.
     *
     * @param exception Original exception reported from Android native module.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    __NativeWrapper.processAndroidException = function (exception, message) {
        if (message === void 0) { message = null; }
        return new PowerAuthError(exception, message);
    };
    /**
     * Method will process `PowerAuthAuthentication` object are will return object according to the platform.
     *
     * @param authentication authentication configuration
     * @param makeReusable if the object should be forced to be reusable
     * @returns configured authorization object
     */
    __NativeWrapper.prototype.authenticate = function (authentication, makeReusable) {
        var _a, _b;
        if (makeReusable === void 0) { makeReusable = false; }
        return __awaiter(this, void 0, void 0, function () {
            var obj, key, e_3;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        obj = __assign({ biometryKey: null }, authentication);
                        if (!((Platform.OS == "android" && authentication.useBiometry && (obj.biometryKey == null || makeReusable)) || (Platform.OS == "ios" && makeReusable))) return [3 /*break*/, 4];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.call("authenticateWithBiometry", (_a = authentication.biometryTitle) !== null && _a !== void 0 ? _a : "??", (_b = authentication.biometryMessage) !== null && _b !== void 0 ? _b : "??")];
                    case 2:
                        key = _c.sent();
                        obj.biometryKey = key;
                        return [2 /*return*/, obj];
                    case 3:
                        e_3 = _c.sent();
                        throw __NativeWrapper.processException(e_3);
                    case 4: 
                    // no need for processing, just return original object
                    return [2 /*return*/, authentication];
                }
            });
        });
    };
    return __NativeWrapper;
}());
export { __NativeWrapper };
var ReusablePowerAuthAuthentication = /** @class */ (function (_super) {
    __extends(ReusablePowerAuthAuthentication, _super);
    function ReusablePowerAuthAuthentication() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.biometryKey = null;
        return _this;
    }
    return ReusablePowerAuthAuthentication;
}(PowerAuthAuthentication));
