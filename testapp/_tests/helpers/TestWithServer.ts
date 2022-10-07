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

import { Logger, PowerAuthTestServer, VerboseLevel } from "powerauth-js-test-client";
import { TestSuite } from "../../src/testbed";

/**
 * Test suite base for tests that require connection to PowerAuth Server RESTFul API. 
 */
export class TestWithServer extends TestSuite {

    private serverInstance?: PowerAuthTestServer

    /**
     * Contains instance of `PowerAuthTestServer`. If instnace is not known yet, then throws error.
     */
    get serverApi(): PowerAuthTestServer {
        if (!this.serverInstance) {
            throw new Error('PowerAuthTestServer instance is not set')
        }
        return this.serverInstance
    }

    async beforeAll() {
        await super.beforeAll()
        Logger.setVerboseLevel(this.context.config.debug?.pasVerboseLevel ?? VerboseLevel.Warning)
        Logger.setDebugRequestResponse(this.context.config.debug?.pasDebugRequestResponse ?? false)
        if (this.printDebugMessages) this.debugInfo('Connecting to server...')
        const server = new PowerAuthTestServer(this.config)
        await server.connect()
        this.serverInstance = server
    }

    async afterAll() {
        await super.afterAll()
        this.serverInstance = undefined
    }
}