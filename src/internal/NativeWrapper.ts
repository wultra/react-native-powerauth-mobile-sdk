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

import { NativeModulesProvider } from './NativeModulesProvider';
import { PowerAuthError } from '../model/PowerAuthError';
import { PowerAuthDebug } from '../debug/PowerAuthDebug';
import { PowerAuthAuthentication } from '../index';
import { Utils } from "../internal/Utils";

interface StaticCallTrampoline {
    call<T>(name: string, args: any[]): Promise<T>
}

interface ThisCallTrampoline {
    call<T>(name: string, instanceId: string, args: any[]): Promise<T>
}

/**
 * The default `StaticCallTrampoline` implementation with no debug features supported.
 */
class DefaultStaticCall implements StaticCallTrampoline {
    async call<T>(name: string, args: any[]): Promise<T> {
        try {
            return await NativeModulesProvider.PowerAuth.callNative(name, args);
        } catch (e) {
            throw NativeWrapper.processException(e);
        }
    }
}

/**
 * The default `ThisCallTrampoline` implementation with no debug features supported.
 */
class DefaultThisCall implements ThisCallTrampoline {
    async call<T>(name: string, instanceId: string, args: any[]): Promise<T> {
        try {
            return await NativeModulesProvider.PowerAuth.callNative(name, [instanceId, ...args]);
        } catch (e) {
            throw NativeWrapper.processException(e);
        }
    }
}

/**
 * The `StaticCallTrampoline` implementation that supports debug features.
 */
class DebugStaticCall implements StaticCallTrampoline {
    constructor(private traceCall: boolean, private traceFail: boolean) {}
    async call<T>(name: string, args: any[]): Promise<T> {
        const msg = this.traceCall || this.traceFail ? `PowerAuth.${name}(${prettyArgs(name, args)})` : undefined
        try {
            if (this.traceCall) {
                console.log(`call ${msg}`)
            }
            const r = await NativeModulesProvider.PowerAuth.callNative<T>(name, args)
            if (this.traceCall) {
                console.log(` ret ${msg} => ${JSON.stringify(r)}`)
            }
            return r
        } catch (e) {
            const te = NativeWrapper.processException(e)
            if (this.traceFail) {
                console.error(`fail ${msg} => ${PowerAuthDebug.describeError(te)}`)
            }
            throw te
        }
    }
}

/**
 * The `ThisCallTrampoline` implementation that supports debug features.
 */
class DebugThisCall implements ThisCallTrampoline {
    constructor(private traceCall: boolean, private traceFail: boolean) {}
    async call<T>(name: string, instanceId: string, args: any[]): Promise<T> {
        const msg = this.traceCall || this.traceFail ? `PowerAuth.${name}(${prettyArgs(name, [instanceId, ...args])})` : undefined
        try {
            if (this.traceCall) {
                console.log(`call ${msg}`)
            }
            const r = await NativeModulesProvider.PowerAuth.callNative<T>(name, [instanceId, ...args])
            if (this.traceCall) {
                console.log(` ret ${msg} => ${JSON.stringify(r)}`)
            }
            return r
        } catch (e) {
            const te = NativeWrapper.processException(e)
            if (this.traceFail) {
                console.error(`fail ${msg} => ${PowerAuthDebug.describeError(te)}`)
            }
            throw te
        }
    }
}

/**
 * The `NativeWrapper` class is a bridge between JS and Native PowerAuth library.
 */
export class NativeWrapper {

    private static staticTrampoline: StaticCallTrampoline = new DefaultStaticCall()
    private static thisTrampoline: ThisCallTrampoline = new DefaultThisCall()

    /**
     * Perform call to the native function with given name.
     * @param name Name of function to call.
     * @param instanceId PowerAuth instance identifier.
     * @param args Additional arguments for the function.
     * @returns Promise with return type.
     */
    static thisCall<T>(name: string, instanceId: string, ...args): Promise<T> {
        return this.thisTrampoline.call(name, instanceId, [ ...args ])
    }

    /**
     * Perform call to the native function with given name.
     * @param name Name of function to call.
     * @param instanceId PowerAuth instance identifier.
     * @param args Additional arguments for the function.
     * @returns Promise with optional return type.
     */
    static thisCallNull<T>(name: string, instanceId: string, ...args): Promise<T | undefined> {
        return patchNull(this.thisTrampoline.call(name, instanceId, [ ...args ]))
    }

    /**
     * Perform call to the native function with given name, returning bool.
     * @param name Name of function to call.
     * @param instanceId PowerAuth instance identifier.
     * @param args Additional arguments for the function.
     * @returns Promise with boolean type.
     */
    static thisCallBool(name: string, instanceId: string, ...args): Promise<boolean> {
        return patchBool(this.thisTrampoline.call(name, instanceId, [ ...args ]))
    }

    /**
     * Perform call to the native function with given name. The method is useful in case that
     * call to functions doesn't require instance identifier.
     * @param name Name of function to call.
     * @param args Additional arguments for the function.
     * @returns Promise with type.
     */
    static staticCall<T>(name: string, ...args): Promise<T> {
        return this.staticTrampoline.call(name, [ ...args ])
    }
    
    /**
     * Perform call to the native function with given name. The method is useful in case that
     * call to functions doesn't require instance identifier.
     * @param name Name of function to call.
     * @param args Additional arguments for the function.
     * @returns Promise with optiomal return type.
     */
    static staticCallNull<T>(name: string, ...args): Promise<T | undefined> {
        return patchNull(this.staticTrampoline.call(name, [ ...args ]))
    }

    /**
     * Perform call to the native function with given name. The method is useful in case that
     * call to functions doesn't require instance identifier.
     * @param name Name of function to call.
     * @param args Additional arguments for the function.
     * @returns Promise with bool type.
     */
    static staticCallBool(name: string, ...args): Promise<boolean> {
        return patchBool(this.staticTrampoline.call(name, [ ...args ]))
    }

    /**
     * Enable or disable low level debug features. The __DEV__ variable must be true.
     * @param traceFail If true, then detailed log entry about failure will be printed to the console.
     * @param traceCall If true, then each call to native code will be printed with a detailed information.
     */
    static setDebugFeatures(traceFail: boolean, traceCall: boolean) {
        if (Utils.isDev) {
            if (traceCall || traceFail) {
                this.thisTrampoline = new DebugThisCall(traceCall, traceFail)
                this.staticTrampoline = new DebugStaticCall(traceCall, traceFail)
            } else {
                this.thisTrampoline = new DefaultThisCall()
                this.staticTrampoline = new DefaultStaticCall()
            }    
        }
    }

    /**
     * Process any exception reported from the native module and handle platfrom specific cases.
     * The method also validate whether exception parameter is already PowerAuthError type, to prevent
     * double error wrapping.
     * 
     * @param exception Exception to process.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    static processException(exception: any, message: string | undefined = undefined): PowerAuthError {
        // Initial checks:
        // - Check if exception is undefined. That can happen when non-native exception is processed.
        // - Check if the exception is already PowerAuthError type. If so, then return the same instance.
        if (!exception) {
            return new PowerAuthError(undefined, message ?? "Operation failed with unspecified error")
        } else if (exception instanceof PowerAuthError) {
            // There's no additional message, we can return exception as it is.
            if (!message) {
                return exception
            }
            // There's additional message, so wrap PowerAuthError into another PowerAuthError
            return new PowerAuthError(exception, message)
        } 
        // Otherwise handle the platform specific cases.
        if (Utils.platformOs == "android") {
            return this.processAndroidException(exception, message)
        } else if (Utils.platformOs == "ios") {
            return this.processIosException(exception, message)
        } else {
            return new PowerAuthError(undefined, "Unsupported platform")
        }
    }

    /**
     * Process iOS specific exception reported from the native module.
     * 
     * @param exception Original exception reported from iOS native module.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    private static processIosException(exception: any, message: string | undefined = undefined): PowerAuthError {
        return new PowerAuthError(exception, message)
    }

    /**
     * Process Android specific exception reported from the native module.
     * 
     * @param exception Original exception reported from Android native module.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    private static processAndroidException(exception: any, message: string | undefined = undefined): PowerAuthError {
        return new PowerAuthError(exception, message)
    }
}

/**
 * Function patch boolean value returned on iOS platform to be always true or false.
 * The reason for this is that on iOS, we marshal BOOL as NSNumber.
 * @param originalPromise Original promise which result needs to be patched.
 * @returns Patched promise that always resolve to true or false.
 */
export function patchBool(originalPromise: Promise<boolean>): Promise<boolean> {
    if (Utils.platformOs === 'android') {
        return originalPromise
    }
    return new Promise((resolved, rejected) => {
        originalPromise
            .then(r => resolved(r ? true : false))
            .catch(f => rejected(f))
    })
}

/**
 * Function patch nullable value (e.g. null or undefined) returned from native code to be always undefined.
 * The reason for this is that on iOS, we marshal BOOL as NSNumber.
 * @param originalPromise Original promise which result needs to be patched.
 * @returns Patched promise that always resolve to value or undefined.
 */
export function patchNull<T>(originalPromise: Promise<T | undefined>): Promise<T | undefined> {
    return new Promise((resolved, rejected) => {
        originalPromise
            .then(r => resolved(r ?? undefined))
            .catch(f => rejected(f))
    })
}

/**
 * Function translate array of arguments into pretty string.
 * @param fname Function name.
 * @param args Array with arguments.
 * @returns Pretty string created from arguments array.
 */
function prettyArgs(fname: string, args: any[]): string {
    switch (fname) {
        case 'changePassword':
        case 'unsafeChangePassword': 
            args[1] = args[2] = '***' 
            break
        case 'validatePassword':
        case 'addBiometryFactor':
            args[1] = '***'
            break
        default:
            break
    }
    let authIndex = 0
    if (args[1] instanceof PowerAuthAuthentication) {
        authIndex = 1
    } else if (args[2] instanceof PowerAuthAuthentication) {
        authIndex = 2
    }
    if (authIndex > 0) {
        const auth = args[authIndex]
        args[authIndex] = {
            password: auth.password ? '***' : undefined,
            biometricPrompt: auth.biometricPrompt,
            isCommit: auth.isCommit,
            isBiometry: auth.isBiometry,
            biometryKeyId: auth.biometryKeyId,
            // deprecated
            usePossession: auth.usePossession,
            useBiometry: auth.useBiometry,
            userPassword: auth.userPassword ? '***' : undefined,
            biometryMessage: auth.biometryMessage,
            biometryTitle: auth.biometryTitle
        }
    }

    const v = JSON.stringify(args)
    return v.slice(1, v.length - 1)
}