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
import { NativeModules } from 'react-native';
import { PowerAuthAuthorizationHttpHeader } from './model/PowerAuthAuthorizationHttpHeader';
import { __AuthenticationUtils } from './internal/AuthenticationUtils';

export class PowerAuthTokenStore {

    /**
     * Quick check whether the token with name is in local database.
     *
     * @param tokenName Name of access token to be checked.
     * @return true if token exists in local database.
     */
    static hasLocalToken(tokenName: string): Promise<boolean> {
        return NativeModules.PowerAuth.hasLocalToken(tokenName);
    }

    /**
     * Returns token if the token is already in local database
     * 
     * @param tokenName Name of access token to be returned
     * @return token object if in the local database (or throws)
     */
     static async getLocalToken(tokenName: string): Promise<PowerAuthToken> {
        return NativeModules.PowerAuth.getLocalToken(tokenName);
    }

    /**
     * Remove token from local database. This method doesn't issue a HTTP request to the server.
     *
     * @param tokenName token to be removed
     */
    static removeLocalToken(tokenName: string): Promise<void> {
        return NativeModules.PowerAuth.removeLocalToken(tokenName);
    }

    /**
     * Remove all tokens from local database. This method doesn't issue a HTTP request to the server.
     */
    static removeAllLocalTokens(): Promise<void> {
        return NativeModules.PowerAuth.removeAllLocalTokens();
    }

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
    static async requestAccessToken(tokenName: string, authentication: PowerAuthAuthentication): Promise<PowerAuthToken> {
        return NativeModules.PowerAuth.requestAccessToken(tokenName, await __AuthenticationUtils.process(authentication));
    }

    /**
     * Remove previously created access token from the server and from local database.
     * 
     * Note that if the removal request doesn't succeed, then the local token's data is not removed.
     * The method is thread safe, but it's not recommended to issue conflicting request for the same
     * token's name in parallel (e.g. create & remove token at the same time).
     *
     * @param tokenName Name of token to be removed
     */
    static removeAccessToken(tokenName: string): Promise<void> {
        return NativeModules.PowerAuth.removeAccessToken(tokenName);
    }

    /**
     * Generates a http header for the token in local storage.
     * 
     * @param tokenName Name of token in the local storage that will be used for generating
     * @returns header or throws
     */
    static generateHeaderForToken(tokenName: string): Promise<PowerAuthAuthorizationHttpHeader> {
        return NativeModules.PowerAuth.generateHeaderForToken(tokenName ?? "");
    }
}

export interface PowerAuthToken {
    /**
     * Return true if this token object contains a valid token data.
     */
     isValid: boolean;
     /**
      * Symbolic name of token or null if token contains an invalid data.
      */
     tokenName?: string;
     /**
      * Return token's unique identifier. You normally don't need this value, but it may help
      * with application's debugging. The value identifies this token on PowerAuth server.
      *
      * Null if token contains an invalid data.
      */
     tokenIdentifier?: string;
     /**
      * True if header can be generated.
      */
      canGenerateHeader: boolean;
}