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

import { PowerAuthError } from "react-native-powerauth-mobile-sdk";

export function describeError(error: any, curlyBrackets: boolean = false): string {
    if (error instanceof PowerAuthError) {
        const components: string[] = []
        if (error.code) components.push(error.code)
        if (error.message) components.push(error.message)
        if (error.errorData) components.push(`data=${JSON.stringify(error.errorData)}`)
        if (error.originalException) components.push(`reason=${describeError(error.originalException, true)}`)
        const msg = components.join(': ')
        return curlyBrackets ? `{ PowerAuthError: ${msg} }` : `PowerAuthError: ${msg}`
    } else if (error instanceof Error) {
        return curlyBrackets ? `{ ${error.name}: ${error.message} }` : `${error.name}: ${error.message}` 
    } else if (typeof error === 'string') {
        return curlyBrackets ? `{ string: '${error}' }` : `'${error}'`
    }
    return JSON.stringify(error)
}
