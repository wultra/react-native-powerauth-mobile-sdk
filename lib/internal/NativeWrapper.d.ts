import { PowerAuthError } from '../model/PowerAuthError';
import { PowerAuthAuthentication } from '../model/PowerAuthAuthentication';
export declare class __NativeWrapper {
    private powerAuthInstanceId;
    constructor(powerAuthInstanceId: string);
    call<T>(name: string, ...args: any[]): Promise<T>;
    static call<T>(name: string, ...args: any[]): Promise<T>;
    /**
     * Process any exception reported from the native module and handle platfrom specific cases.
     * The method also validate whether exception parameter is already PowerAuthError type, to prevent
     * double error wrapping.
     *
     * @param exception Exception to process.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    static processException(exception: any, message?: string): PowerAuthError;
    /**
     * Process iOS specific exception reported from the native module.
     *
     * @param exception Original exception reported from iOS native module.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    private static processIosException;
    /**
     * Process Android specific exception reported from the native module.
     *
     * @param exception Original exception reported from Android native module.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    private static processAndroidException;
    /**
     * Method will process `PowerAuthAuthentication` object are will return object according to the platform.
     *
     * @param authentication authentication configuration
     * @param makeReusable if the object should be forced to be reusable
     * @returns configured authorization object
     */
    authenticate(authentication: PowerAuthAuthentication, makeReusable?: boolean): Promise<PowerAuthAuthentication>;
}
