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

/**
 * Interface that contains configuration for RESTful API client used internally by SDK.
 */
export interface PowerAuthClientConfigurationType {
    /**
     * Defines whether unsecured connection is allowed. If not provided, then `false` is applied.
     */
    readonly enableUnsecureTraffic?: boolean
    /**
     * Connection timeout in seconds. If not provided, then the connection timeout is set to 20 seconds.
     */
    readonly connectionTimeout?: number
    /**
     * Read timeout in seconds. Be aware that this parameter is ignored on Apple platforms.
     * If not provided, then the read timeout is set to 20 seconds.
     */
    readonly readTimeout?: number
    /**
     * Custom HTTP headers that will be added to each HTTP request produced by this library.
     */
    readonly customHttpHeaders?: HttpHeader[];
}

export interface HttpHeader {
    key: string
    value: string
}

/**
 * Class that is used to provide RESTful API client configuration.
 */
export class PowerAuthClientConfiguration implements PowerAuthClientConfigurationType {
    enableUnsecureTraffic: boolean
    connectionTimeout: number
    readTimeout: number
    customHttpHeaders: HttpHeader[]

    constructor() {
        const d = buildClientConfiguration()
        this.enableUnsecureTraffic = d.enableUnsecureTraffic
        this.connectionTimeout = d.connectionTimeout
        this.readTimeout = d.readTimeout
        this.customHttpHeaders = d.customHttpHeaders
    }
    /**
     * @returns `PowerAuthClientConfiguration` with default values.
     */
    public static default(): PowerAuthClientConfigurationType {
        return buildClientConfiguration()
    }
}

/**
 * Function create a frozen object implementing `ClientConfigurationType` with all properties set.
 * @param input Optional application's configuration. If not provided, then the default values are set.
 * @returns Frozen `ClientConfigurationType` interface with all properties set.
 */
export function buildClientConfiguration(input: PowerAuthClientConfigurationType | undefined = undefined): Required<PowerAuthClientConfigurationType> {
    return Object.freeze({
        enableUnsecureTraffic: input?.enableUnsecureTraffic ?? false,
        connectionTimeout: input?.connectionTimeout ?? 20.0,
        readTimeout: input?.readTimeout ?? 20.0,
        customHttpHeaders: input?.customHttpHeaders ?? []
    })
}