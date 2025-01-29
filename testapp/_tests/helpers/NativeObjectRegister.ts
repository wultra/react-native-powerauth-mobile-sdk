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

import { NativeObjectCmdData, NativeObjectCmdResult, NativeObjectRegister, NativeObjectType } from "react-native-powerauth-mobile-sdk";

export interface ObjectsCount {
    valid: number
    invalid: number
}

/**
 * The Register class extends `NativeObjectRegister` functionality for this test suite purposes.
 * 
 * ### Warning
 * 
 * > You suppose do not replicate such functionality in your application's code, because it will not
 * > work in the release build.
 */
export class Register {
    static async findObject(objectId: string, type: NativeObjectType): Promise<boolean> {
        const r = await NativeObjectRegister.debugCommand('find', { objectId: objectId, objectType: type })
        if (typeof r === 'boolean') {
            return r
        } else {
            throw new Error('Unexpected result')
        }
    }

    static async useObject(objectId: string, type: NativeObjectType): Promise<boolean> {
        const r = await NativeObjectRegister.debugCommand('use', { objectId: objectId, objectType: type })
        if (typeof r === 'boolean') {
            return r
        } else {
            throw new Error('Unexpected result')
        }
    }

    static async touchObject(objectId: string, type: NativeObjectType): Promise<boolean> {
        const r = await NativeObjectRegister.debugCommand('touch', { objectId: objectId, objectType: type })
        if (typeof r === 'boolean') {
            return r
        } else {
            throw new Error('Unexpected result')
        }
    }

    static async removeObject(objectId: string, type: NativeObjectType): Promise<boolean> {
        const r = await NativeObjectRegister.debugCommand('release', { objectId: objectId, objectType: type })
        if (typeof r === 'boolean') {
            return r
        } else {
            throw new Error('Unexpected result')
        }
    }

    static async createObject(data: NativeObjectCmdData): Promise<string> {
        const r = await NativeObjectRegister.debugCommand('create', data)
        if (typeof r === 'string') {
            return r
        } else {
            throw new Error('Unexpected result')
        }
    }

    static setCleanupPeriod(periodInMs: number): Promise<NativeObjectCmdResult> {
        return NativeObjectRegister.debugCommand('setPeriod', { cleanupPeriod: periodInMs })
    }

    static async countObjects(tag: string): Promise<ObjectsCount> {
        const r = await NativeObjectRegister.debugDump(tag)
        return { 
            valid:   r.reduce((prev, item) => prev + (item.isValid ? 1 : 0), 0), 
            invalid: r.reduce((prev, item) => prev + (item.isValid ? 0 : 1), 0)
        }
    }
}
