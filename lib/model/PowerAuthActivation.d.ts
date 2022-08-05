/**
 * The `PowerAuthActivation` object contains activation data required for the activation creation. The object supports
 * all types of activation currently supported in the SDK.
 */
export declare class PowerAuthActivation {
    /** parameters that are filled by create* methods  */
    activationName: string;
    activationCode?: string | null;
    recoveryCode?: string | null;
    recoveryPuk?: string | null;
    identityAttributes?: any;
    /** Extra attributes of the activation, used for application specific purposes (for example, info about the clientdevice or system). This extras string will be associated with the activation record on PowerAuth Server. */
    extras?: string | null;
    /** Custom attributes object that are processed on Intermediate Server Application. Note that this custom data will not be associated with the activation record on PowerAuth Server */
    customAttributes?: any;
    /** Additional activation OTP that can be used only with a regular activation, by activation code */
    additionalActivationOtp?: string | null;
    /**
     * Private constructor, used internally.
     * @param activationName Activation name to be assigned to new activation.
     */
    private constructor();
    /**
     * Create an instance of `PowerAuthActivation` configured with the activation code. The activation code may contain
     * an optional signature part, in case that it is scanned from QR code.
     *
     * The activation's `name` parameter is recommended to set to device name. The name of activation will be associated with
     * an activation record on PowerAuth Server.
     *
     * @param activationCode Activation code, obtained either via QR code scanning or by manual entry.
     * @param name Activation name to be used for the activation.
     * @return New instance of `PowerAuthActivation`.
     */
    static createWithActivationCode(activationCode: string, name: string): PowerAuthActivation;
    /**
     * Creates an instance of `PowerAuthActivation` with a recovery activation code and PUK.
     *
     * The activation's `name` parameter is recommended to set to device name. The name of activation will be associated with
     * an activation record on PowerAuth Server.
     *
     * @param recoveryCode Recovery code, obtained either via QR code scanning or by manual entry.
     * @param recoveryPuk PUK obtained by manual entry.
     * @param name Activation name to be used for the activation.
     * @return New instance of `PowerAuthActivation`.
     */
    static createWithRecoveryCode(recoveryCode: string, recoveryPuk: string, name: string): PowerAuthActivation;
    /**
     * Creates an instance of `PowerAuthActivation` with an identity attributes for the custom activation purposes.
     *
     * The activation's `name` parameter is recommended to set to device name. The name of activation will be associated with
     * an activation record on PowerAuth Server.
     *
     * @param identityAttributes Custom activation parameters that are used to prove identity of a user (each object value is serialized and used).
     * @param name Activation name to be used for the activation.
     * @return New instance of `PowerAuthActivation`.
     */
    static createWithIdentityAttributes(identityAttributes: any, name: string): PowerAuthActivation;
}
