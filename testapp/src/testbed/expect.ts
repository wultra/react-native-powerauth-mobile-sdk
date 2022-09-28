/*
 * Copyright 2022 Wultra s.r.o.
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

import { ErrorInfo } from "react"

class CatchedFailure {
    reason: any
    constructor(reason: any) {
        this.reason = reason
    }
}

export interface ExpectedErrorInfo {
    errorName: string
    errorMessage?: string
    errorCode?: string
}
export type ExpectedError = Error | ExpectedErrorInfo | string | undefined

function evaluateError(error: any, expected: ExpectedError) {
    if (expected === undefined) {
        return // OK
    }
    if (typeof expected === 'string') {
        if (error !== expected) {
            throw new Error(`Expected to throw ${expected} but received ${error}`)
        }
    }
    let info: ErrorInfo
}

export const expect = (received: any) => ({
    
    toBe: (expected: any) => {
      if (received !== expected) {
        throw new Error(`Expected ${expected} but received ${received}`);
      }
      return true;
    },
    toBeTruthy: () => {
        if (received !== true) {
            throw new Error(`Expected true but received ${received}`)
        }
    },
    toBeFalsy: () => {
        if (received !== false) {
            throw new Error(`Expected false but received ${received}`)
        }
    },
    toBeDefined: () => {
        if (received === undefined) {
            throw new Error(`Expected to be defined`)
        }
    },
    toBeUndefined: () => {
        if (received === undefined) {
            throw new Error(`Expected to be undefined but received ${received}`)
        }
    },
    toBeNull: () => {
        if (received !== null) {
            throw new Error(`Expected null value but received ${received}`)
        }
    },
    
    toBeLessThan: (value: number) => {
        if (typeof(received) !== 'number') {
            throw new Error(`Expected number but received ${typeof(received)}`)
        }
        if (received >= value) {
            throw new Error(`Expected less than ${value} but received ${received}`)
        }
    },
    toBeLessThanOrEqual: (value: number) => {
        if (typeof(received) !== 'number') {
            throw new Error(`Expected number but received ${typeof(received)}`)
        }
        if (received > value) {
            throw new Error(`Expected less or equal than ${value} but received ${received}`)
        }
    },
    toBeGreaterThan: (value: number) => {
        if (typeof(received) !== 'number') {
            throw new Error(`Expected number but received ${typeof(received)}`)
        }
        if (received <= value) {
            throw new Error(`Expected less than ${value} but received ${received}`)
        }
    },
    toBeGreaterThanOrEqual: (value: number) => {
        if (typeof(received) !== 'number') {
            throw new Error(`Expected number but received ${typeof(received)}`)
        }
        if (received < value) {
            throw new Error(`Expected less or equal than ${value} but received ${received}`)
        }
    },

    toThrowAsync: async (expected: ExpectedError= undefined) => {
        if (typeof received !== 'function') {
            throw new Error(`Expected function that throws but received ${received}`)
        }
        const value = received()
        if (!(value instanceof Promise)) {
            throw new Error(`Expected function returning Promise but returned ${value}`)
        }
        try {
            const result = await value
            throw new Error(`Expected to fail but returned ${result}`)
        } catch (error) {
            evaluateError(error, expected)
        }
    },
    toThrowSync: (expected: ExpectedError = undefined) => {
        if (typeof received !== 'function') {
            throw new Error(`Expected function that throws but received ${received}`)
        }
        try {
            const result = received()
            throw new Error(`Expected to fail but returned ${result}`)
        } catch (error) {
            evaluateError(error, expected)
        }
    }
});
