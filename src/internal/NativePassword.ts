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

import { NativeModulesProvider } from "./NativeModulesProvider"

/**
 * Password interface implemented in the native code.
 */
export interface PowerAuthPasswordIfc {
    
    /**
     * Initialize native password object.
     * @param destroyOnUse If `true`, then native password will be destroyed after its use for the cryptograhic operation.
     * @param ownerId If specified, then native password will be destroyed together with owning PowerAuth instance.
     * @param autoreleaseTime Defines autorelease timeout in milliseconds. The value is used only for the testing purposes, and is ignored in the release build of library.
     * @returns Underlying native object identifier.
     */
    initialize(destroyOnUse: boolean, ownerId: string | undefined, autoreleaseTime: number): Promise<string>

    /**
     * Release native password object.
     * @param objectId Underlying object identifier.
     */
    release(objectId: string): Promise<void>

    /**
     * Clear password content.
     * @param objectId Underlying object identifier.
     */
    clear(objectId: string): Promise<void>
    
    /**
     * Get number of stored characters.
     * @param objectId Underlying object identifier.
     */
    length(objectId: string): Promise<number>

    /**
     * Compare two passwords.
     * @param objectId1 Underlying object identifier.
     * @param objectId2 Underlying object identifier.
     */
    isEqual(objectId1: string, objectId2: string): Promise<boolean>

    /**
     * Add character at the end of password and return the number of stored characters.
     * @param objectId Underlying object identifier.
     * @param character Character to add
     */
    addCharacter(objectId: string, character: number): Promise<number>
    
    /**
     * Insert character at the specified position and return the number of stored characters.
     * @param objectId Underlying object identifier.
     * @param character Character to add.
     * @param position Position where character will be added.
     */
    insertCharacter(objectId: string, character: number, position: number): Promise<number>

    /**
     * Remove character at given position.
     * @param objectId Underlying object identifier.
     * @param position 
     */
    removeCharacter(objectId: string, position: number): Promise<number>
    
    /**
     * Remove last character.
     * @param objectId Underlying object identifier.
     */
    removeLastCharacter(objectId: string): Promise<number>
}

export const NativePassword = NativeModulesProvider.PowerAuthPassword as PowerAuthPasswordIfc