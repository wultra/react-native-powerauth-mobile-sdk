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

import { NativeModules, Platform } from 'react-native';
import { PowerAuthError } from '../model/PowerAuthError';
import { PowerAuthDebug } from '../PowerAuthDebug';

interface StaticCallTrampoline {
    call<T>(name: string, args: any[]): Promise<T>;
    callBool(name: string, args: any[]): Promise<boolean>;
}

interface ThisCallTrampoline {
    call<T>(name: string, instanceId: string, args: any[]): Promise<T>;
    callBool(name: string, instanceId: string, args: any[]): Promise<boolean>
}

/**
 * The default `StaticCallTrampoline` implementation with no debug features supported.
 */
class DefaultStaticCall implements StaticCallTrampoline {
    async call<T>(name: string, args: any[]): Promise<T> {
        try {
            return await ((NativeModules.PowerAuth[name] as Function).apply(null, args));
        } catch (e) {
            throw NativeWrapper.processException(e);
        }
    }
    async callBool(name: string, args: any[]): Promise<boolean> {
        try {
            return await patchBool(((NativeModules.PowerAuth[name] as Function).apply(null, args)));
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
            return await ((NativeModules.PowerAuth[name] as Function).apply(null, [instanceId, ...args]));
        } catch (e) {
            throw NativeWrapper.processException(e);
        }
    }
    async callBool(name: string, instanceId: string, args: any[]): Promise<boolean> {
        try {
            return await patchBool((NativeModules.PowerAuth[name] as Function).apply(null, [instanceId, ...args]));
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
        const msg = this.traceCall || this.traceFail ? `PowerAuth.${name}(${prettyArgs(args)})` : undefined
        try {
            if (this.traceCall) {
                console.log(`call ${msg}`)
            }
            const r = await ((NativeModules.PowerAuth[name] as Function).apply(null, args))
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
    async callBool(name: string, args: any[]): Promise<boolean> {
        const msg = this.traceCall || this.traceFail ? `PowerAuth.${name}(${prettyArgs(args)})` : undefined
        try {
            if (this.traceCall) {
                console.log(`call ${msg}`)
            }
            const r = await patchBool(((NativeModules.PowerAuth[name] as Function).apply(null, args)))
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
        const msg = this.traceCall || this.traceFail ? `PowerAuth.${name}(${prettyArgs([instanceId, ...args])})` : undefined
        try {
            if (this.traceCall) {
                console.log(`call ${msg}`)
            }
            const r = await ((NativeModules.PowerAuth[name] as Function).apply(null, [instanceId, ...args]))
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
    async callBool(name: string, instanceId: string, args: any[]): Promise<boolean> {
        const msg = this.traceCall || this.traceFail ? `PowerAuth.${name}(${prettyArgs([instanceId, ...args])})` : undefined
        try {
            if (this.traceCall) {
                console.log(`call ${msg}`)
            }
            const r = await patchBool((NativeModules.PowerAuth[name] as Function).apply(null, [instanceId, ...args]))
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
    static async thisCall<T>(name: string, instanceId: string, ...args): Promise<T> {
        return this.thisTrampoline.call(name, instanceId, [ ...args ])
    }

    /**
     * Perform call to the native function with given name, returning bool.
     * @param name Name of function to call.
     * @param instanceId PowerAuth instance identifier.
     * @param args Additional arguments for the function.
     * @returns Promise with boolean type.
     */
    static async thisCallBool(name: string, instanceId: string, ...args): Promise<boolean> {
        return this.thisTrampoline.callBool(name, instanceId, [ ...args ])
    }

    /**
     * Perform call to the native function with given name. The method is useful in case that
     * call to functions that doesn't require instance identifier is required.
     * @param name Name of function to call.
     * @param args Additional arguments for the function.
     * @returns 
     */
    static async staticCall<T>(name: string, ...args): Promise<T> {
        return this.staticTrampoline.call(name, [ ...args ])
    }

    static async staticCallBool(name: string, ...args): Promise<boolean> {
        return this.staticTrampoline.callBool(name, [ ...args ])
    }

    /**
     * Enable or disable low level debug features. The __DEV__ variable must be true.
     * @param traceFail If true, then detailed log entry about failure will be printed to the console.
     * @param traceCall If true, then each call to native code will be printed with a detailed information.
     */
    static setDebugFeatures(traceFail: boolean, traceCall: boolean) {
        if (__DEV__) {
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
    static processException(exception: any, message: string | null = null): PowerAuthError {
        // Initial checks:
        // - Check if exception is null. That can happen when non-native exception is processed.
        // - Check if the exception is already PowerAuthError type. If so, then return the same instance.
        if (exception == null) {
            return new PowerAuthError(null, message ?? "Operation failed with unspecified error")
        } else if (exception instanceof PowerAuthError) {
            // There's no additional message, we can return exception as it is.
            if (message == null) {
                return exception
            }
            // There's additional message, so wrap PowerAuthError into another PowerAuthError
            return new PowerAuthError(exception, message)
        } 
        // Otherwise handle the platform specific cases.
        if (Platform.OS == "android") {
            return this.processAndroidException(exception, message)
        } else if (Platform.OS == "ios") {
            return this.processIosException(exception, message)
        } else {
            return new PowerAuthError(null, "Unsupported platform")
        }
    }

    /**
     * Process iOS specific exception reported from the native module.
     * 
     * @param exception Original exception reported from iOS native module.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    private static processIosException(exception: any, message: string | null = null): PowerAuthError {
        return new PowerAuthError(exception, message)
    }

    /**
     * Process Android specific exception reported from the native module.
     * 
     * @param exception Original exception reported from Android native module.
     * @param message Optional message.
     * @returns Instance of PowerAuthError.
     */
    private static processAndroidException(exception: any, message: string | null = null): PowerAuthError {
        return new PowerAuthError(exception, message)
    }
}

/**
 * Function patch boolean value returned on iOS platform to be always true or false.
 * The reason for this is that on iOS, we marshal BOOL as NSNumber.
 * @param originalPromise Original promise which result needs to be patched.
 * @returns Patched promise that always resolve to true or false.
 */
function patchBool(originalPromise: Promise<boolean>): Promise<boolean> {
    if (Platform.OS === 'android') {
        return originalPromise
    }
    return new Promise((resolved, rejected) => {
        originalPromise
            .then(r => resolved(r ? true : false))
            .catch(f => rejected(f))
    })
}
/**
 * Function translate array of arguments into pretty string.
 * @param args Array with arguments.
 * @returns Pretty string created from arguments array.
 */
function prettyArgs(args: any[]): string {
    const v = JSON.stringify(args)
    return v.slice(1, v.length - 1)
}