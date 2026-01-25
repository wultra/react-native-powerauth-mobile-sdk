// Copyright 2026 Wultra s.r.o.
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

type AnyObject = Record<string, unknown>

function isObject(value: unknown): value is AnyObject {
    return typeof value === 'object' && value !== null
}

function getConstructorName(value: unknown): string | undefined {
    if (!isObject(value)) {
        return undefined
    }
    const ctor = value.constructor
    if (typeof ctor === 'function' && typeof ctor.name === 'string' && ctor.name.length > 0) {
        return ctor.name
    }
    return undefined
}

/**
 * Function translate an error object into string.
 * @param error Error to describe.
 * @param curlyBrackets If true, then the description is wrapped into curly brackets.
 * @returns String description from given error.
 */
export function describeError(error: unknown, curlyBrackets: boolean = false): string {
    // Native `Error`
    if (error instanceof Error) {
        return curlyBrackets ? `{ ${error.name}: ${error.message} }` : `${error.name}: ${error.message}` 
    }

    // Rwrite for generic error-like object (supports PowerAuthError-like objects
    // but without importing the SDK)
    if (isObject(error)) {
        const name = (typeof error.name === 'string' && error.name.length > 0) ? error.name : getConstructorName(error)
        const code = (typeof error.code === 'string' && error.code.length > 0) ? error.code : undefined
        const message = (typeof error.message === 'string' && error.message.length > 0) ? error.message : undefined
        const errorData = error.errorData ?? error.userInfo
        const originalException = error.originalException ?? error.originalError ?? error.cause

        // Branch for structured SDK errors
        if (code !== undefined || errorData !== undefined || originalException !== undefined) {
            const components: string[] = []
            if (code) components.push(code)
            if (message) components.push(message)
            if (errorData !== undefined) components.push(`data=${JSON.stringify(errorData)}`)
            if (originalException !== undefined) components.push(`reason=${describeError(originalException, true)}`)
            const msg = components.join(': ')
            const label = name ?? 'Error'
            return curlyBrackets ? `{ ${label}: ${msg} }` : `${label}: ${msg}`
        }
    }

    // String errors
    if (typeof error === 'string') {
        return curlyBrackets ? `{ string: '${error}' }` : `'${error}'`
    }
    return JSON.stringify(error)
}
