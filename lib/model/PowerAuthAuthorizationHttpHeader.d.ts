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
