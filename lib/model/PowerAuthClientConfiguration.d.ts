/**
 * Class that is used to provide RESTful API client configuration.
 */
export declare class PowerAuthClientConfiguration {
    /**
     * Defines whether unsecured connection is allowed.
     */
    enableUnsecureTraffic: boolean;
    /**
     * Connection timeout in seconds.
     */
    connectionTimeout: number;
    /**
     * Read timeout in seconds. Be aware that this parameter is ignored on Apple platforms.
     */
    readTimeout: number;
    /**
     * @returns `PowerAuthClientConfiguration` with default values.
     */
    static default(): PowerAuthClientConfiguration;
}
