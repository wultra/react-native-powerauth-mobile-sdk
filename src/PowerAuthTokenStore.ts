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

import { PowerAuthAuthentication } from './model/PowerAuthAuthentication';
import { PowerAuthAuthorizationHttpHeader } from './model/PowerAuthAuthorizationHttpHeader';
import { __NativeWrapper } from "./internal/NativeWrapper";

/**
 * The PowerAuthTokenStore provides interface for managing access tokens. The class is using Keychain as 
 * underlying storage for received data. Note that the whole store's interface is thread safe, but it's 
 * not recommended to query for the same token in overlapping asynchronous requests. This usage may lead 
 * to leaking tokens on the PowerAuth server.
 */
export class PowerAuthTokenStore {

    constructor(instanceId: string) {
        this.wrapper = new __NativeWrapper(instanceId);
    }

    /**
     * Quick check whether the token with name is in local database.
     *
     * @param tokenName Name of access token to be checked.
     * @return true if token exists in local database.
     */
    hasLocalToken(tokenName: string): Promise<boolean> {
        return this.wrapper.call("hasLocalToken", tokenName);
    }

    /**
     * Returns token if the token is already in local database
     * 
     * @param tokenName Name of access token to be returned
     * @return token object if in the local database (or throws)
     */
     getLocalToken(tokenName: string): Promise<PowerAuthToken> {
        return this.wrapper.call("getLocalToken", tokenName);
    }

    /**
     * Remove token from local database. This method doesn't issue a HTTP request to the server.
     *
     * @param tokenName token to be removed
     */
    removeLocalToken(tokenName: string): Promise<void> {
        return this.wrapper.call("removeLocalToken", tokenName);
    }

    /**
     * Remove all tokens from local database. This method doesn't issue a HTTP request to the server.
     */
    removeAllLocalTokens(): Promise<void> {
        return this.wrapper.call("removeAllLocalTokens");
    }

    /**
     * Create a new access token with given name for requested signature factors by calling 
     * a PowerAuth Standard RESTful API endpoint `/pa/token/create`.
     * 
     * Note that the method is thread safe, but it's not recommended to request for the same token
     * name in parallel when the token is not created yet. You can use hasLocalToken() method
     * to check, whether the token is already in the local database.
     *
     * @param tokenName Name of requested token.
     * @param authentication An authentication instance specifying what factors should be used for token creation.
     * @return PowerAuth token with already generated header
     */
    async requestAccessToken(tokenName: string, authentication: PowerAuthAuthentication): Promise<PowerAuthToken> {
        return this.wrapper.call("requestAccessToken", tokenName, await this.wrapper.authenticate(authentication));
    }

    /**
     * Remove previously created access token from the server and from local database by calling 
     * a PowerAuth Standard RESTful API endpoint `/pa/token/remove`.
     * 
     * Note that if the removal request doesn't succeed, then the local token's data is not removed.
     * The method is thread safe, but it's not recommended to issue conflicting request for the same
     * token's name in parallel (e.g. create & remove token at the same time).
     *
     * @param tokenName Name of token to be removed
     */
    removeAccessToken(tokenName: string): Promise<void> {
        return this.wrapper.call("removeAccessToken", tokenName);
    }

    /**
     * Generates a http header for the token in local storage.
     * 
     * @param tokenName Name of token in the local storage that will be used for generating
     * @returns header or throws
     */
    generateHeaderForToken(tokenName: string): Promise<PowerAuthAuthorizationHttpHeader> {
        return this.wrapper.call("generateHeaderForToken", tokenName ?? "");
    }

    private wrapper: __NativeWrapper;
}

export interface PowerAuthToken {
    /**
     * Symbolic name of token or null if token contains an invalid data.
     */
    tokenName: string;
    /**
     * Return token's unique identifier. You normally don't need this value, but it may help
     * with application's debugging. The value identifies this token on PowerAuth server.
     *
     * Null if token contains an invalid data.
     */
    tokenIdentifier: string;
}