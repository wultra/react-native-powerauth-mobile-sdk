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
import { __NativeWrapper } from "../internal/NativeWrapper";
/**
 * The PowerAuthTokenStore provides interface for managing access tokens. The class is using Keychain as
 * underlying storage for received data. Note that the whole store's interface is thread safe, but it's
 * not recommended to query for the same token in overlapping asynchronous requests. This usage may lead
 * to leaking tokens on the PowerAuth server.
 */
var PowerAuthTokenStore = /** @class */ (function () {
    function PowerAuthTokenStore(instanceId) {
        this.wrapper = new __NativeWrapper(instanceId);
    }
    /**
     * Quick check whether the token with name is in local database.
     *
     * @param tokenName Name of access token to be checked.
     * @return true if token exists in local database.
     */
    PowerAuthTokenStore.prototype.hasLocalToken = function (tokenName) {
        return this.wrapper.call("hasLocalToken", tokenName);
    };
    /**
     * Returns token if the token is already in local database
     *
     * @param tokenName Name of access token to be returned
     * @return token object if in the local database (or throws)
     */
    PowerAuthTokenStore.prototype.getLocalToken = function (tokenName) {
        return this.wrapper.call("getLocalToken", tokenName);
    };
    /**
     * Remove token from local database. This method doesn't issue a HTTP request to the server.
     *
     * @param tokenName token to be removed
     */
    PowerAuthTokenStore.prototype.removeLocalToken = function (tokenName) {
        return this.wrapper.call("removeLocalToken", tokenName);
    };
    /**
     * Remove all tokens from local database. This method doesn't issue a HTTP request to the server.
     */
    PowerAuthTokenStore.prototype.removeAllLocalTokens = function () {
        return this.wrapper.call("removeAllLocalTokens");
    };
    /**
     * Create a new access token with given name for requested signature factors.
     *
     * Note that the method is thread safe, but it's not recommended to request for the same token
     * name in parallel when the token is not created yet. You can use hasLocalToken() method
     * to check, whether the token is already in the local database.
     *
     * @param tokenName Name of requested token.
     * @param authentication An authentication instance specifying what factors should be used for token creation.
     * @return PowerAuth token with already generated header
     */
    PowerAuthTokenStore.prototype.requestAccessToken = function (tokenName, authentication) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _b = (_a = this.wrapper).call;
                        _c = ["requestAccessToken", tokenName];
                        return [4 /*yield*/, this.wrapper.authenticate(authentication)];
                    case 1: return [2 /*return*/, _b.apply(_a, _c.concat([_d.sent()]))];
                }
            });
        });
    };
    /**
     * Remove previously created access token from the server and from local database.
     *
     * Note that if the removal request doesn't succeed, then the local token's data is not removed.
     * The method is thread safe, but it's not recommended to issue conflicting request for the same
     * token's name in parallel (e.g. create & remove token at the same time).
     *
     * @param tokenName Name of token to be removed
     */
    PowerAuthTokenStore.prototype.removeAccessToken = function (tokenName) {
        return this.wrapper.call("removeAccessToken", tokenName);
    };
    /**
     * Generates a http header for the token in local storage.
     *
     * @param tokenName Name of token in the local storage that will be used for generating
     * @returns header or throws
     */
    PowerAuthTokenStore.prototype.generateHeaderForToken = function (tokenName) {
        return this.wrapper.call("generateHeaderForToken", tokenName !== null && tokenName !== void 0 ? tokenName : "");
    };
    return PowerAuthTokenStore;
}());
export { PowerAuthTokenStore };
