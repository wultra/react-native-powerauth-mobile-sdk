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

/**
 * Class that is used to provide RESTful API client configuration.
 */
export class PowerAuthClientConfiguration {
    /**
     * Defines whether unsecured connection is allowed.
     */
    enableUnsecureTraffic: boolean = false
    /**
     * Connection timeout in seconds.
     */
    connectionTimeout: number = 20.0
    /**
     * Read timeout in seconds. Be aware that this parameter is ignored on Apple platforms.
     */
    readTimeout: number = 20.0

    /**
     * @returns `PowerAuthClientConfiguration` with default values.
     */
    public static default(): PowerAuthClientConfiguration {
        return new PowerAuthClientConfiguration()
    }
}