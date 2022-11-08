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

import { PowerAuthError } from "react-native-powerauth-mobile-sdk";
import { describeError } from "./private/ErrorHelper";

/**
 * Object contains data error evaluation.
 */
export interface ExpectedErrorInfo {
    /**
     * Error's name, in case that Error object is expected. You can also use
     * `PowerAuthError` if such error type is expected. If not provided, then `PowerAuthError`
     * name is expected by default.
     */
    errorName?: string
    /**
     * If error's message is specified, then the error evaluation also compare the message.
     */
    errorMessage?: string
    /**
     * Expected error code if error is `PowerAuthError` instance.
     */
    errorCode?: string
}

/**
 * Type representing an expected error. You can expect an exact Error object,
 * error string, or `ExpectedErrorInfo` object that can declare an additional
 * expected properties of error.
 */
export type ExpectedError = Error | ExpectedErrorInfo | string | undefined
/**
 * A result from expect() function.
 */
export type ExpectResult = Promise<void> | undefined
/**
 * Error used internally in this expect implementation.
 */
class ExpectFailure extends Error {
    reason: any
    constructor(reason: any) {
        if (reason instanceof Error) {
            super(reason.message)
        } else if (reason instanceof PowerAuthError) {
            super(reason.message)
        } else if (typeof reason === 'string') {
            super(reason)
        } else {
            super()
        }
        this.name = "ExpectFailure"
        this.reason = reason
    }
}
/**
 * Helper class that resolve the values during the evaluation in expect implementation.
 * If expected or received value is a function, then the resolver execute such function
 * to get the actual value. If the function is asynchronous, then waits for its completion.
 */
class Resolver {
    private onContinue: (resolver: Resolver) => void

    private expected: any
    private received: any

    private expectedResolved: any
    private receivedResolved: any

    private resultPromise: ExpectResult
    private onSuccess?: () => void
    private onFailure?: (failure: any) => void

    private valuesToResolve: number = 2
    private valuesResolved: number = 0

    constructor(received: any, expected: any, action: (resolver: Resolver) => void) {
        this.onContinue = action
        this.expected = expected
        this.received = received
    }

    /**
     * Resolve values in this resolver.
     * @returns Promise or nothing, depending on whether expected or received is asynchronous.
     */
    resolve(): ExpectResult {
        this.doResolve(this.received, true)
        this.doResolve(this.expected, false)
        return this.resultPromise
    }

    /**
     * Evaluate values that suppose not to fail during the execution.
     * @param action Action to execute if received and expected values are known.
     */
    evaluate(action: (received: any, expected: any) => void) {
        let doSuccess = false
        try {
            if (this.receivedResolved instanceof ExpectFailure) {
                // This is failure, so it doesn't make sense to call action with evaluation
                throw new Error(`Expected '${this.expectedResolved}' bud failed during the resolve: ${describeError(this.receivedResolved.reason, true)}`)
            }
            action(this.receivedResolved, this.expectedResolved)
            doSuccess = true
        } catch (error) {
            // Report error to promise, or re-throw an error
            if (typeof this.received === 'function') {
                console.error(`Failure in evaluating: ${this.received}`)
            }
            if (this.onFailure !== undefined) {
                this.onFailure(error)
            } else {
                throw error
            }
        }
        // If everything goes as expected, then finally report to promise success
        if (doSuccess && this.onSuccess !== undefined) {
            this.onSuccess()
        }
    }

    /**
     * Evaluate result as failure.
     * @param action Action to execute if received failed with the error.
     */
    evaluateFail(action: (received: any, expected: any) => void) {
        let doSuccess = false
        try {
            if (this.receivedResolved instanceof ExpectFailure) {
                // This is a failure, so it has to be evaluated
                action(this.receivedResolved.reason, this.expectedResolved)
                doSuccess = true
            } else {
                throw new Error(`Expected to fail but received '${this.receivedResolved}'`)
            }
        } catch (error) {
            // Report error to promise, or re-throw an error
            if (typeof this.received === 'function') {
                console.error(`Failure in evaluating: ${this.received}`)
            }
            if (this.onFailure !== undefined) {
                this.onFailure(error)
            } else {
                throw error
            }
        }
        // If everything goes as expected, then finally report to promise success
        if (doSuccess && this.onSuccess !== undefined) {
            this.onSuccess()
        }
    }

    /**
     * Store expected or received value.
     * @param something A value to store.
     * @param asReceived If true, this is value of received property, otherwise expected.
     */
    private keepValue(something: any, asReceived: boolean) {
        this.valuesResolved++
        if (asReceived) {
            this.receivedResolved = something
        } else {
            this.expectedResolved = something
        }
        if (this.valuesResolved === this.valuesToResolve) {
            this.onContinue(this)
        } else if (this.valuesResolved > this.valuesToResolve) {
            throw new Error(`Received or expected value resolved for multiple times.`)
        }
    }

    /**
     * Wrap and capture result from the promise.
     * @param promise Promise to wrap and capture its result.
     * @param asReceived If true, then the future value will be stored as received, otherwise expected.
     */
    private wrapPromise(promise: Promise<any>, asReceived: boolean) {
        if (this.resultPromise === undefined) {
            this.resultPromise = new Promise<void>((success, failure) => {
                this.onSuccess = success
                this.onFailure = failure
            }).then()
        }
        promise
            .then((success) => this.keepValue(success, asReceived))
            .catch((failure) => this.keepValue(new ExpectFailure(failure), asReceived))
        
    }

    /**
     * Resolve value as expected or received.
     * @param something Value to resolve.
     * @param asReceived If true, then the future value will be stored as received, otherwise expected.
     */
    private doResolve(something: any, asReceived: boolean) {
        if (typeof something === 'function') {
            try {
                const returned = something()
                if (returned instanceof Promise) {
                    this.wrapPromise(returned, asReceived)
                } else {
                    this.keepValue(returned, asReceived)
                }
            } catch (error) {
                this.keepValue(new ExpectFailure(error), asReceived)
            }
        } else {
            // Not a function, so keep the value directly
            this.keepValue(something, asReceived)
        }
    }
}

/**
 * Helper runction that resolve both received and expected values.
 * @param received Received object to resolve.
 * @param expected Expected object to resolve.
 * @param action Action to execute when both values are resolved.
 * @returns Promise or nothing, depending on whether expected or received is asynchronous.
 */
function _R(received: any, expected: any, action: (r: Resolver) => void): ExpectResult {
    return new Resolver(received, expected, action).resolve()
}

/**
 * A simple `expect()` implementation.
 * @param received Object to evaluate.
 * @returns Promise or nothing, depending on whether expected or received is asynchronous.
 */
export const expect = (received: any) => ({
    
    toBe: (expected: any): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (received !== expected) {
                throw new Error(`Expected ${_D(expected)} but received ${_D(received)}`)
            }            
        }))
    },
    toNotBe: (expected: any) => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (received === expected) {
                throw new Error(`Expected to be different than ${_D(expected)} but is equal`)
            }
        }))
    },
    toEqual: (expected: any) => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (!compareObjects(expected, received)) {
                throw new Error(`Expected ${_D(expected)} to be equal, but received ${_D(received)}`)
            }            
        }))
    },
    toNotEqual: (expected: any) => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (compareObjects(expected, received)) {
                throw new Error(`Expected to be different than ${_D(expected)}, but objects are equal.`)
            }            
        }))
    },
    toBeTruthy: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received != true) {
                throw new Error(`Expected true but received ${_D(received)}`)
            }
        }))
    },
    toBeFalsy: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received != false) {
                throw new Error(`Expected false but received ${_D(received)}`)
            }
        }))
    },
    toBeDefined: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received === undefined) {
                throw new Error(`Expected to be defined`)
            }
        }))
    },
    toBeUndefined: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received !== undefined) {
                throw new Error(`Expected to be undefined but received ${_D(received)}`)
            }
        }))
    },
    toBeNullish: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received !== undefined && received !== null) {
                throw new Error(`Expected to be undefined or null but received ${_D(received)}`)
            }
        }))
    },
    toBeNotNullish: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received === undefined || received === null) {
                throw new Error(`Expected to be other that undefined or null but received ${_D(received)}`)
            }
        }))
    },
    toBeNull: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received !== null) {
                throw new Error(`Expected null but received ${_D(received)}`)
            }
        }))
    },
    toBeNotNull: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received === undefined) {
                throw new Error(`Expected to be not-null but it's undefined`)
            }
            if (received === null) {
                throw new Error(`Expected to be not-null`)
            }
        }))
    },
    toBeLessThan: (expected: number): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (typeof(received) !== 'number') {
                throw new Error(`Expected number but received '${typeof(received)}'`)
            }
            if (received >= expected) {
                throw new Error(`Expected less than ${_D(expected)} but received ${_D(received)}`)
            }
        }))
    },
    toBeLessThanOrEqual: (expected: number): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (typeof(received) !== 'number') {
                throw new Error(`Expected number but received '${typeof(received)}'`)
            }
            if (received > expected) {
                throw new Error(`Expected less or equal than ${_D(expected)} but received ${_D(received)}`)
            }
        }))
    },
    toBeGreaterThan: (expected: number): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (typeof(received) !== 'number') {
                throw new Error(`Expected number but received '${typeof(received)}'`)
            }
            if (received <= expected) {
                throw new Error(`Expected less than ${_D(expected)} but received ${_D(received)}`)
            }
        }))
    },
    toBeGreaterThanOrEqual: (expected: number): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (typeof(received) !== 'number') {
                throw new Error(`Expected number but received '${typeof(received)}'`)
            }
            if (received < expected) {
                throw new Error(`Expected less or equal than ${_D(expected)} but received ${_D(received)}`)
            }
        }))
    },
    toContain: (...expected: any[]): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            const isArr = Array.isArray(received)
            const isMapOrSet = received instanceof Map || received instanceof Set
            const arrayToIterate = Array.isArray(expected[0]) ? expected[0] : expected
            arrayToIterate.forEach((item: any) => {
                let found = false
                if (isArr) {
                    found = received.indexOf(item) >= 0
                } else if (isMapOrSet) {
                    found = received.has(item)
                } else {
                    throw new Error(`Expcted to be array, map or set, but received ${_D(received)}`)
                }
                if (!found) {
                    throw new Error(`Expected to contain ${_D(item)} but received ${_D(received)}`)
                }
            })
        }))
    },
    toNotContain: (...expected: any[]): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            const isArr = Array.isArray(received)
            const isMapOrSet = received instanceof Map || received instanceof Set
            const arrayToIterate = Array.isArray(expected[0]) ? expected[0] : expected
            arrayToIterate.forEach((item: any) => {
                let found = false
                if (isArr) {
                    found = received.indexOf(item) >= 0
                } else if (isMapOrSet) {
                    found = received.has(item)
                } else {
                    throw new Error(`Expcted to be array, map or set, but received ${_D(received)}`)
                }
                if (found) {
                    throw new Error(`Expected to not contain ${_D(item)} but received ${_D(received)}`)
                }
            })
        }))
    },
    toBeEmpty: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            let empty = false
            if (Array.isArray(received)) {
                empty = received.length == 0
            } else if (received instanceof Map || received instanceof Set) {
                empty = received.size == 0
            } else if (typeof received === 'string') {
                empty = received.length == 0
            } else {
                throw new Error(`Expcted to be string, array, map or set, but received ${_D(received)}`)
            }
            if (!empty) {
                throw new Error(`Expected to be empty but received ${_D(received)}`)
            }
        }))
    },
    toThrow: (expected: ExpectedError = undefined): ExpectResult => {
        return _R(received, expected, (r) => r.evaluateFail((failure, expected) => {
            evaluateError(failure, expected)
        }))
    },
    toSucceed: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((_failure, _expected) => {}))
    },
})

export default expect

/**
 * Build error description from provided parameters.
 * @param name Error name.
 * @param code Optional error code.
 * @param message Optional error message.
 * @returns Description created from the provided parameters.
 */
function errorInfo(name: string, code: string | undefined, message: string | undefined): string {
    const components = [ name ]
    if (code !== undefined) components.push(`code: ${code}`)
    if (message !== undefined) components.push(`message: '${message}'`)
    return `{ ${components.join(', ')} }`
}

/**
 * Evaluate whether error is kind of expected error. If error is something else than expected,
 * then throws an appropriate evaluation error.
 * @param error Error object to evaluate.
 * @param expected Expected error.
 */
function evaluateError(error: any, expected: ExpectedError) {
    if (expected === undefined) {
        return // OK
    }
    // Extract important values from error
    let receivedErrorName: string
    let receivedErrorCode: string | undefined
    let receivedMessage: string | undefined
    if (error instanceof Error) {
        receivedErrorName = error.name
        receivedErrorCode = undefined
        receivedMessage = error.message
    } else if (error instanceof PowerAuthError) {
        receivedErrorName = 'PowerAuthError'
        receivedErrorCode = error.code
        receivedMessage = error.message
    } else if (typeof error === 'string') {
        receivedErrorName = error
    } else {
        throw new Error(`Received unexpected error ${error}`)
    }
    const ri = errorInfo(receivedErrorName, receivedErrorCode, receivedMessage)
    if (typeof expected === 'string') {
        // String is expected
        if (error !== expected) {
            throw new Error(`Expected exception '${expected}' but received ${ri}`)
        }
        return
    }
    // Compare error
    let expectedErrorName: string
    let expectedErrorCode: string | undefined
    let expectedMessage: string | undefined
    if (expected instanceof Error) {
        expectedErrorName = expected.name
        expectedErrorCode = undefined
        expectedMessage = expected.message
    } else {
        expectedErrorName = expected.errorName ?? 'PowerAuthError'
        expectedErrorCode = expected.errorCode
        expectedMessage = expected.errorMessage
    }
    let isUnexpected = expectedErrorName !== receivedErrorName
    if (expectedErrorCode !== undefined) {
        isUnexpected = isUnexpected || (expectedErrorCode !== receivedErrorCode)
    }
    if (expectedMessage !== undefined) {
        isUnexpected = isUnexpected || (expectedMessage !== receivedMessage)
    }
    if (isUnexpected) {
        const ei = errorInfo(expectedErrorName, expectedErrorCode, expectedMessage)
        throw new Error(`Expected ${ei} but received ${ri}`)
    }
}

/**
 * Compare whether received object is equal to expected. The function does a deep comparison
 * of two objects
 * @param expected 
 * @param received 
 * @returns 
 */
function compareObjects(expected: any, received: any): boolean {
    if (Object.is(expected, received)) {
        return true
    }
    if (Array.isArray(expected)) {
        if (!Array.isArray(received) || expected.length !== received.length) return false
        // Deep compare
        for (const index in expected) {
            if (!compareObjects(expected[index], received[index])) return false
        }
        return true
    }
    if ((expected instanceof Object) && (received instanceof Object)) {
        for (const key in expected) {
            if (!compareObjects(expected[key], received[key])) return false
        }
        return true
    }
    return false
}

/**
 * Describe object to string.
 * @param object Object to describe.
 * @returns String description of object.
 */
function _D(object: any): string {
    if (typeof object === 'function') {
        return `${object}`
    }
    return JSON.stringify(object)
}