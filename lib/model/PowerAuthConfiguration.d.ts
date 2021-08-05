/**
 * Class representing a configuration of a single `PowerAuth` instance.
 */
export declare class PowerAuthConfiguration {
    /**
     * `APPLICATION_KEY` as defined in PowerAuth specification - a key identifying an application version.
     */
    applicationKey: string;
    /**
     * `APPLICATION_SECRET` as defined in PowerAuth specification - a secret associated with an application version.
     */
    applicationSecret: string;
    /**
     * `KEY_SERVER_MASTER_PUBLIC` as defined in PowerAuth specification - a master server public key.
     */
    masterServerPublicKey: string;
    /**
     * Base URL to the PowerAuth Standard REST API (the URL part before `"/pa/..."`).
     */
    baseEndpointUrl: string;
    /**
     * Construct configuration with required parameters.
     *
     * @param applicationKey `APPLICATION_KEY` as defined in PowerAuth specification - a key identifying an application version.
     * @param applicationSecret `APPLICATION_SECRET` as defined in PowerAuth specification - a secret associated with an application version.
     * @param masterServerPublicKey `KEY_SERVER_MASTER_PUBLIC` as defined in PowerAuth specification - a master server public key.
     * @param baseEndpointUrl Base URL to the PowerAuth Standard REST API (the URL part before `"/pa/..."`).
     */
    constructor(applicationKey: string, applicationSecret: string, masterServerPublicKey: string, baseEndpointUrl: string);
}
