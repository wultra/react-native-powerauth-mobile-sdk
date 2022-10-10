//
// Copyright 2022 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { PowerAuthError } from "./index";
import { NativeWrapper } from "./internal/NativeWrapper";

/**
 * The `PowerAuthDebug` class provides a various functionality that can
 * help application develoepr with debugging the problem with React Native PowerAuth mobile SDK.
 */
export class PowerAuthDebug {
    /**
     * Enable or disable detailed log with calls to native code. Be aware that this feature is
     * effective only if global __DEV__ constant is `true`.
     * @param traceFailure If set to `true`, then SDK will print a detailed error if native call fails.
     * @param traceEachCall If set to `true`, then SDK will print a detailed information about each call to the native code.
     */
    static traceNativeCodeCalls(traceFailure: boolean, traceEachCall: boolean = false) {
        if (__DEV__) {
            NativeWrapper.setDebugFeatures(traceFailure, traceEachCall)
        }
    }

    /**
     * Function converts any error into human readable string.
     * @param error Error to descrive.
     * @returns Error translated to human readable string.
     */
    static describeError(error: any): string {
        if (typeof error === 'string') {
            return error
        }
        if (error instanceof PowerAuthError) {
            const components = [ 'PowerAuthError' ]
            if (error.code) components.push(error.code)
            if (error.message) components.push(error.message)
            if (error.originalException) components.push(`Reason = { ${this.describeError(error.originalException)} }`)
            return components.join(': ')
        }
        if (error instanceof Error) {
            return `${error.name}: ${error.message}`
        }
        return `${error}`
    }
}