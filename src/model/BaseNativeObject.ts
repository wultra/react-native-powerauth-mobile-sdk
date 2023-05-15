/*
 * Copyright 2023 Wultra s.r.o.
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

import { PowerAuthError, PowerAuthErrorCode } from './PowerAuthError';
import { NativeWrapper } from '../internal/NativeWrapper';
import { RawNativeObject } from '../internal/NativeTypes';

/**
 * Internal class that implements automatic native object re-creation.
 */
export class BaseNativeObject {
    /**
     * Construct object with optional object identifier. If identifier is not provided,
     * then it's created in the next call to `withObjectId()` method.
     * @param objectId Optional object identifier.
     */
    constructor(private objectId: string | undefined = undefined) {
    }

    /**
     * Function called when native object needs to be initialized. The derived class must
     * override this function. The function must return native object identifier.
     */
    protected onCreate(): Promise<string> {
        return Promise.reject(new Error("Missing implementation"))
    }

    /**
     * Function called when native object is manually released by the application. The derived class must
     * override this function.
     * @param objectId Native object identifier.
     */
    protected onRelease(objectId: string): Promise<void> {
        return Promise.reject(new Error("Missing implementation"))
    }

    /**
     * Function called when native object is re-created after automatic native object cleanup. The default 
     * implementation does nothing, so the derived class can override it and implement its own functionality.
     */
    protected onAutomaticCleanup() {
        // Derived class may implement its own cleanup here.
    }

    /**
     * Acquire native object ID and execute action with this identifier.
     * @param action Action to execute after objectId is acquired.
     * @param recoveringFromError If true, then this is 2nd attempt to execute action after recovery from action.
     * @returns Promise result type.
     */
    protected async withObjectId<T>(action: (objectId: string) => Promise<T>, recoveringFromError: boolean = false): Promise<T> {
        try {
            if (!this.objectId) {
                this.objectId = await this.onCreate()
            }
            return await action(this.objectId)
        } catch (error: any) {
            if (!recoveringFromError && error.code == PowerAuthErrorCode.INVALID_NATIVE_OBJECT) {
                // Underlying native object has been already destroyed.
                // We can recover from this situation by resetting identifier and retry the operation
                this.objectId = undefined
                // Call cleanup callback if it's defined
                this.onAutomaticCleanup()
                // Now try to repeat action.
                return this.withObjectId(action, true)
            }
            // Otherwise simply process the exception and report the error.
            throw NativeWrapper.processException(error)
        }
    }

    /**
     * Initialize native object if it's not initialized yet and convert this object into `RawNativeObject` 
     * that is passable to the native code.
     */
    protected resolveRawObject(): Promise<RawNativeObject> {
        return this.withObjectId(id => Promise.resolve(Object.freeze({objectId: id})))
    }

    /**
     * Convert instance of this object into `RawNativeObject` that is passable to the native code.
     * Be aware that this function throws an exception if object identifier is not available.
     */
    protected toRawObject(): RawNativeObject {
        if (this.objectId === undefined) {
            throw new PowerAuthError(undefined, "Native object is not initialized", PowerAuthErrorCode.REACT_NATIVE_ERROR)
        }
        return Object.freeze({objectId: this.objectId})
    }

    /**
     * Release the underlying native object.
     */
    public release(): Promise<void> {
        if (this.objectId) {
            const objId = this.objectId
            this.objectId = undefined
            return this.onRelease(objId)
        }
        return Promise.resolve()
    }
}