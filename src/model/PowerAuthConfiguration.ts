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
     * `APPLICATION_KEY` as defined in PowerAuth specification - a key identifying an application version.
     */
    readonly applicationKey: string
    /**
     * `APPLICATION_SECRET` as defined in PowerAuth specification - a secret associated with an application version.
     */
    readonly applicationSecret: string
    /**
     * `KEY_SERVER_MASTER_PUBLIC` as defined in PowerAuth specification - a master server public key.
     */
    readonly masterServerPublicKey: string
    /**
     * Base URL to the PowerAuth Standard REST API (the URL part before `"/pa/..."`).
     */
    readonly baseEndpointUrl: string
}

/**
 * Class representing a configuration of a single `PowerAuth` instance. The class implements
 * `ConfigurationType` interface, so can be used 
 */
export class PowerAuthConfiguration implements PowerAuthConfigurationType {
    applicationKey: string
    applicationSecret: string
    masterServerPublicKey: string
    baseEndpointUrl: string
     
    /**
     * Construct configuration with required parameters.
     * 
     * @param applicationKey `APPLICATION_KEY` as defined in PowerAuth specification - a key identifying an application version.
     * @param applicationSecret `APPLICATION_SECRET` as defined in PowerAuth specification - a secret associated with an application version.
     * @param masterServerPublicKey `KEY_SERVER_MASTER_PUBLIC` as defined in PowerAuth specification - a master server public key.
     * @param baseEndpointUrl Base URL to the PowerAuth Standard REST API (the URL part before `"/pa/..."`).
     */
    public constructor(applicationKey: string, applicationSecret: string, masterServerPublicKey: string, baseEndpointUrl: string) {
        this.applicationKey = applicationKey
        this.applicationSecret = applicationSecret
        this.masterServerPublicKey = masterServerPublicKey
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
        applicationKey: input.applicationKey,
        applicationSecret: input.applicationSecret,
        masterServerPublicKey: input.masterServerPublicKey,
        baseEndpointUrl: input.baseEndpointUrl
    })
}
