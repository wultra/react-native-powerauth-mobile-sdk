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

/**
 * WARNING
 *
 * This file contains declaration of internal types that helps with
 * debugging and testing the library. The library must be compiled
 * with DEBUG build configuration to expose such functionality.
 */

/**
 * Information about underlying native object.
 */
export interface NativeObjectInfo {
    id: string              // object's identifier
    class: string           // obejct's class
    tag?: string            // object's tag
    isValid: boolean        // whether object is still valid
    policies: string[]      // list of policies
    createDate: number      // object's creation date
    lastUseDate?: number    // object's last usage date
    usageCount?: number     // obejct's usage counter
}

/**
 * Command type.
 */
export type NativeObjectCmd = 'create' | 'release' | 'releaseAll' | 'use' | 'find' | 'touch' | 'setPeriod'
/**
 * Native object types.
 */
export type NativeObjectType = 'data' | 'secure-data' | 'number' | 'password'
/**
 * Data accepted in debugCommand() function. 
 */
export interface NativeObjectCmdData {
    objectId?: string               // object id, accepted in 'release', 'use', 'find', 'touch'
    objectTag?: string              // object tag, accepted in 'create', 'releaseAll'
    objectType?: NativeObjectType   // object type accepted in 'create', 'release', 'use', 'find', 'touch'
    releasePolicy?: string[]        // use 'manual', 'after_use N', 'keep_alive T', 'expore T', accepted in 'create'
    cleanupPeriod?: number          // cleanup period in milliseconds <100, 60000>, accepted in 'setPeriod'
}
/**
 * Result returned from debugCommand()  
 */
export type NativeObjectCmdResult = boolean | string | undefined

/**
 * Debug interface exposed by native object register.
 */
export interface NativeObjectRegisterIfc {
    /**
     * Dump content of internal native object register. The function is implemented in DEBUG build of the library.
     * @param instanceId If provided, then returns only objects associated to PowerAuth instance identifier.
     * @returns Array with `NativeObjectInfo`
     */
    debugDump(instanceId: string | undefined): Promise<Array<NativeObjectInfo>>
    /**
     * Manipulate with object register. The function is implemented in DEBUG build of the library.
     * @param command Command to execute.
     * @param data Command data.
     * @returns Command result.
     */
    debugCommand(command: NativeObjectCmd, data: NativeObjectCmdData): Promise<NativeObjectCmdResult>
}
