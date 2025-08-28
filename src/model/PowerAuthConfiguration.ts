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
 * Interface that contains configuration data for a single `PowerAuth` instance.
 */
export interface PowerAuthConfigurationType {
    /**
     * String with the cryptographic configuration.
     */
    readonly configuration: string
    /**
     * Base URL to the PowerAuth enrollment server. Usualy ends with `/enrollment-server`.
     */
    readonly baseEndpointUrl: string
}

/**
 * Class representing a configuration of a single `PowerAuth` instance. The class implements
 * `ConfigurationType` interface, so can be used 
 */
export class PowerAuthConfiguration implements PowerAuthConfigurationType {
    configuration: string
    baseEndpointUrl: string
     
    /**
     * Construct configuration with required parameters.
     * 
     * @param configuration String with the cryptographic configuration.
     * @param baseEndpointUrl Base URL to the PowerAuth enrollment server. Usualy ends with `/enrollment-server`.
     */
    public constructor(configuration: string, baseEndpointUrl: string) {
        this.configuration = configuration
        this.baseEndpointUrl = baseEndpointUrl
    }
}

/**
 * Create frozen configuration from provided configuration object.
 * @param input Application provided configuration.
 * @returns Frozen configuration object.
 */
export function buildConfiguration(input: PowerAuthConfigurationType): PowerAuthConfigurationType {
    return Object.freeze({
        configuration: input.configuration,
        baseEndpointUrl: input.baseEndpointUrl
    })
}
