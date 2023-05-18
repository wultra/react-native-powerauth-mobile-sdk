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

import { expect } from "../src/testbed";
import { TestWithActivation } from "./helpers/TestWithActivation";

export class PowerAuth_KDFTests extends TestWithActivation {
    async testFetchEncryptionKey() {
        const key1a = await this.sdk.fetchEncryptionKey(this.credentials.knowledge, 1000)
        expect(key1a).toBeDefined()
        const key1b = await this.sdk.fetchEncryptionKey(this.credentials.knowledge, 1000)
        expect(key1b).toBe(key1a)

        const key2a = await this.sdk.fetchEncryptionKey(this.credentials.knowledge, 1001)
        expect(key2a).toBeDefined()
        const key2b = await this.sdk.fetchEncryptionKey(this.credentials.knowledge, 1001)
        expect(key2a).toBe(key2b)

        expect(key1a).toNotBe(key2a)
    }
}