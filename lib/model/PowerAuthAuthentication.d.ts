/**
 * Class representing a multi-factor authentication object.
 */
export declare class PowerAuthAuthentication {
    /** Indicates if a possession factor should be used. */
    usePossession: boolean;
    /** Indicates if a biometry factor should be used. */
    useBiometry: boolean;
    /** Password to be used for knowledge factor, or nil of knowledge factor should not be used */
    userPassword?: string;
    /**
     * Message displayed when prompted for biometric authentication
     */
    biometryMessage: string;
    /** (Android only) Title of biometric prompt */
    biometryTitle: string;
}
