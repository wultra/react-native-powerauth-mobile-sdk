export interface PowerAuthBiometryInfo {
    /**
     * Evaluate whether the biometric authentication is supported on the system.
     *
     * Note that the property contains "false" on iOS if biometry is not enrolled or if it has been locked down.
     * To distinguish between an availability and lockdown you can use `biometryType` and `canAuthenticate`.
     */
    isAvailable: boolean;
    /**
     * Return type of biometry supported on the system.
     */
    biometryType: PowerAuthBiometryType;
    /**
     * Check whether biometric authentication is available on this authenticator and biometric data
     * are enrolled on the system.
     */
    canAuthenticate: PowerAuthBiometryStatus;
}
/**
 * The PowerAuthBiometryType interface provides constants that defines biometry types, supported
 * on the system. In case that device supports multiple biometry types, then GENERIC type
 * is returned.
 */
export declare enum PowerAuthBiometryType {
    /**
     * There's no biometry support on the device.
     */
    NONE = "NONE",
    /**
     * It's not possible to determine exact type of biometry. This happens on Android 10+ systems,
     * when the device supports more than one type of biometric authentication. In this case,
     * you should use generic terms, like "Authenticate with biometry" for your UI.
     */
    GENERIC = "GENERIC",
    /**
     * Fingerprint scanner/TouchID is present on the device.
     */
    FINGERPRINT = "FINGERPRINT",
    /**
     * Face scanner/FaceID is present on the device.
     */
    FACE = "FACE",
    /**
     * Iris scanner is present on the device.
     */
    IRIS = "IRIS"
}
/**
 * The PowerAuthBiometryStatus interface defines constants defining various states of biometric
 * authentication support on the system. The status may change during the application lifetime,
 * unless it's NOT_SUPPORTED}.
 */
export declare enum PowerAuthBiometryStatus {
    /**
     * The biometric authentication can be used right now.
     */
    OK = "OK",
    /**
     * The biometric authentication is not supported on the device, due to missing hardware or
     * missing support in the operating system.
     */
    NOT_SUPPORTED = "NOT_SUPPORTED",
    /**
     * The biometric authentication is supported, but there's no biometric image enrolled in the
     * system. User has to add at least one fingerprint, or another type of biometry in the device's
     * settings.
     */
    NOT_ENROLLED = "NOT_ENROLLED",
    /**
     * The biometric authentication is not available at this time. You can retry the operation later.
     */
    NOT_AVAILABLE = "NOT_AVAILABLE",
    /**
     * Biometric authentication is supported, but too many failed attempts caused its lockout.
     * User has to authenticate with the password or passcode. (iOS only)
     */
    LOCKOUT = "LOCKOUT"
}
