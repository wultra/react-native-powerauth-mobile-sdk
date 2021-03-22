import { PowerAuthAuthentication } from './model/PowerAuthAuthentication';
import { PowerAuthAuthorizationHttpHeader } from './model/PowerAuthAuthorizationHttpHeader';
export declare class PowerAuthTokenStore {
    /**
     * Quick check whether the token with name is in local database.
     *
     * @param tokenName Name of access token to be checked.
     * @return true if token exists in local database.
     */
    static hasLocalToken(tokenName: string): Promise<boolean>;
    /**
     * Returns token if the token is already in local database
     *
     * @param tokenName Name of access token to be returned
     * @return token object if in the local database (or throws)
     */
    static getLocalToken(tokenName: string): Promise<PowerAuthToken>;
    /**
     * Remove token from local database. This method doesn't issue a HTTP request to the server.
     *
     * @param tokenName token to be removed
     */
    static removeLocalToken(tokenName: string): Promise<void>;
    /**
     * Remove all tokens from local database. This method doesn't issue a HTTP request to the server.
     */
    static removeAllLocalTokens(): Promise<void>;
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
    static requestAccessToken(tokenName: string, authentication: PowerAuthAuthentication): Promise<PowerAuthToken>;
    /**
     * Remove previously created access token from the server and from local database.
     *
     * Note that if the removal request doesn't succeed, then the local token's data is not removed.
     * The method is thread safe, but it's not recommended to issue conflicting request for the same
     * token's name in parallel (e.g. create & remove token at the same time).
     *
     * @param tokenName Name of token to be removed
     */
    static removeAccessToken(tokenName: string): Promise<void>;
    /**
     * Generates a http header for the token in local storage.
     *
     * @param tokenName Name of token in the local storage that will be used for generating
     * @returns header or throws
     */
    static generateHeaderForToken(tokenName: string): Promise<PowerAuthAuthorizationHttpHeader>;
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
