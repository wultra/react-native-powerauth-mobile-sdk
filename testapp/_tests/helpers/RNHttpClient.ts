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

import { TestConfig } from "../../src/Config";

export type RNClientHeaders = Headers | string[][] | {[key: string]: string};

export class RNHttpClient {
    
    readonly baseUrl: string

    constructor(config: TestConfig) {
        let url = config.enrollment.baseUrl
        if (url.endsWith('/')) {
            url = url.substring(0, url.length - 1)
        }
        this.baseUrl = url
    }

    async post(path: string, body: string | undefined, headers: Headers | undefined): Promise<any> {
        const u = this.baseUrl + path
        headers?.append('content-type', 'application/json')
        headers?.append('accept', 'application/json')
        const response = await fetch(u, {
            method: 'POST',
            headers: headers,
            body: body
        })
        if (!response.ok) {
            const errorResponse = await response.json()
            throw Error(`Request failed:\n - Response: ${JSON.stringify(response)}\n - Body: ${JSON.stringify(errorResponse)}`)
        }
        return await response.json()
    }
}