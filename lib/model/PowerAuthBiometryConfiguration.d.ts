/**
 * Class that is used to provide biomety configuration for `PowerAuth` class.
 */
export declare class PowerAuthBiometryConfiguration {
    /**
     * Set whether the key protected with the biometry is invalidated if fingers are added or
     * removed, or if the user re-enrolls for face.
     */
    linkItemsToCurrentSet: boolean;
    /**
     * ### iOS specific
     *
     * If set to `true`, then the key protected with the biometry can be accessed also with a device passcode.
     * If set, then `linkItemsToCurrentSet` option has no effect. The default is `false`, so fallback
     * to device's passcode is not enabled.
     */
    fallbackToDevicePasscode: boolean;
    /**
     * ### Android specific
     *
     * If set to `true`, then the user's confirmation will be required after the successful biometric authentication.
     */
    confirmBiometricAuthentication: boolean;
    /**
     * ### Android specific
     *
     * Set, whether biometric key setup always require a biometric authentication.
     *
     * ### Discussion
     *
     * Setting parameter to `true` leads to use symmetric AES cipher on the background,
     * so both configuration and usage of biometric key require the biometric authentication.
     *
     * If set to `false`, then RSA cipher is used and only the usage of biometric key
     * require the biometric authentication. This is due to fact, that RSA cipher can encrypt
     * data with using it's public key available immediate after the key-pair is created in
     * Android KeyStore.
     *
     * The default value is `false`.
     */
    authenticateOnBiometricKeySetup: boolean;
    /**
     * @returns `PowerAuthBiometryConfiguration` with default configuration.
     */
    static default(): PowerAuthBiometryConfiguration;
}
