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

export interface ExpectedErrorInfo {
    /**
     * Error's name, in case that Error object is expected. You can also use
     * `PowerAuthError` if such error is expected. If not provided, then 
     */
    errorName?: string
    /**
     * If error's message must be specified.
     */
    errorMessage?: string
    /**
     * Expected error code if error is PowerAuthError instance.
     */
    errorCode?: string
}
export type ExpectedError = Error | ExpectedErrorInfo | string | undefined
export type ExpectResult = Promise<void> | undefined

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

    resolve(): ExpectResult {
        this.doResolve(this.received, true)
        this.doResolve(this.expected, false)
        return this.resultPromise
    }

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

function _R(received: any, expected: any, action: (r: Resolver) => void): ExpectResult {
    return new Resolver(received, expected, action).resolve()
}

export const expect = (received: any) => ({

    toBe: (expected: any): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (received !== expected) {
                throw new Error(`Expected '${expected}' but received '${received}'`)
            }            
        }))
    },
    toNotBe: (expected: any) => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (received === expected) {
                throw new Error(`Expected to be different than '${expected}' but is equal`)
            }
        }))
    },
    toBeTruthy: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received !== true) {
                throw new Error(`Expected true but received '${received}'`)
            }
        }))
    },
    toBeFalsy: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received !== false) {
                throw new Error(`Expected false but received '${received}'`)
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
                throw new Error(`Expected to be undefined but received '${received}'`)
            }
        }))
    },
    toBeNullish: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received !== undefined && received !== null) {
                throw new Error(`Expected to be undefined or null but received '${received}'`)
            }
        }))
    },
    toBeNotNullish: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received === undefined || received === null) {
                throw new Error(`Expected to be other that undefined or null but received '${received}'`)
            }
        }))
    },
    toBeNull: (): ExpectResult => {
        return _R(received, undefined, (r) => r.evaluate((received, _) => {
            if (received !== null) {
                throw new Error(`Expected null but received '${received}'`)
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
                throw new Error(`Expected less than '${expected}' but received '${received}'`)
            }
        }))
    },
    toBeLessThanOrEqual: (expected: number): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (typeof(received) !== 'number') {
                throw new Error(`Expected number but received '${typeof(received)}'`)
            }
            if (received > expected) {
                throw new Error(`Expected less or equal than '${expected}' but received '${received}'`)
            }
        }))
    },
    toBeGreaterThan: (expected: number): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (typeof(received) !== 'number') {
                throw new Error(`Expected number but received '${typeof(received)}'`)
            }
            if (received <= expected) {
                throw new Error(`Expected less than '${expected}' but received '${received}'`)
            }
        }))
    },
    toBeGreaterThanOrEqual: (expected: number): ExpectResult => {
        return _R(received, expected, (r) => r.evaluate((received, expected) => {
            if (typeof(received) !== 'number') {
                throw new Error(`Expected number but received '${typeof(received)}'`)
            }
            if (received < expected) {
                throw new Error(`Expected less or equal than '${expected}' but received '${received}'`)
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


function errorInfo(name: string, code: string | undefined, message: string | undefined): string {
    const components = [ name ]
    if (code !== undefined) components.push(`code: ${code}`)
    if (message !== undefined) components.push(`message: '${message}'`)
    return `{ ${components.join(', ')} }`
}

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
