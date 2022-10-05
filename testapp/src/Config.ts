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

import { Config, VerboseLevel } from "powerauth-js-test-client";
import { Platform } from "react-native";

export interface EnrollmentConfig {
    baseUrl: string
}

export interface InstanceConfig {
    powerAuthInstanceId?: string
}

export interface DebugConfig {
    pasVerboseLevel?: VerboseLevel
    pasDebugRequestResponse?: boolean
}

export interface TestConfig extends Config {
    enrollment: EnrollmentConfig
    instance?: InstanceConfig
    debug?: DebugConfig
}

const defaultHost = 'localhost'
const defaultPrefix = "RNPowerAuth"
const defaultSuffix = Platform.OS

function defaultConfig(): TestConfig {
    let host: string
    if (Platform.OS === 'android' && defaultHost === 'localhost') {
        // On Android, localhost points to the device's localhost, so
        // it has to be altered to preconfigured IP representing
        // developer's machine.
        host = '10.0.2.2'
    } else {
        // Otherwise use default
        host = defaultHost
    }
    return {
        connection: {
            baseUrl: `http://${host}:8080/powerauth-java-server`,
            autoCommit: true
        },
        application: {
            applicationName: `${defaultPrefix}-App`,
            applicationVersion: "default",
            enableRecoveryCodes: true
        },
        testUser: {
            userId: `${defaultPrefix}-User-${defaultSuffix}`,
            alternateUserId: `${defaultPrefix}-AnotherUser-${defaultSuffix}`,
            externalUserId: `${defaultPrefix}-ExternalUser`
        },
        enrollment: {
            baseUrl: `http://${defaultHost}:8080/enrollment-server`
        },
        instance: {
            powerAuthInstanceId: `${defaultPrefix}-instanceId`
        },
        debug: {
            pasVerboseLevel: VerboseLevel.Warning,
            pasDebugRequestResponse: false

        }
    }
}

export async function getTestConfig(): Promise<TestConfig> {
    return defaultConfig()
}