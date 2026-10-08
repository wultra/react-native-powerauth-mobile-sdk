/*
 * Copyright 2026 Wultra s.r.o.
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

import { PowerAuthError, PowerAuthErrorCode } from "../model/PowerAuthError"
import { PowerAuthNativeObject } from "../model/PowerAuthNativeObject"
import { NativeWrapper } from "./NativeWrapper"

/**
 * Owns the lifecycle of one object stored in the native object register.
 *
 * The handle never recreates an expired, released, or consumed native object. After the
 * handle is released, every subsequent use reports `INVALID_NATIVE_OBJECT`.
 */
export class NativeObjectHandle {
    private objectId: string | undefined
    private initialization: Promise<string> | undefined
    private releasePromise: Promise<void> | undefined
    private releaseRequested = false

    private constructor(
        objectId: string | undefined,
        private readonly initializer: (() => Promise<string>) | undefined
    ) {
        this.objectId = objectId
    }

    /** Creates a handle for an already-created native object. */
    static fromNative(objectId: string): NativeObjectHandle {
        return new NativeObjectHandle(objectId, undefined)
    }

    /**
     * Creates a handle whose native object is created on first use. Concurrent first uses
     * share one initialization. A failed initialization is retried on the next use.
     */
    static lazy(initializer: () => Promise<string>): NativeObjectHandle {
        return new NativeObjectHandle(undefined, initializer)
    }

    async withObjectId<T>(action: (objectId: string) => Promise<T>): Promise<T> {
        try {
            return await action(await this.getObjectId())
        } catch (error: any) {
            throw NativeWrapper.processException(error)
        }
    }

    /**
     * Invalidates this handle and releases its native object at most once. If the native
     * object is still being created, the release waits for the creation and then releases
     * the created object.
     */
    release(): Promise<void> {
        // A lazy handle owns no native object before its initialization starts.
        if (!this.releaseRequested && this.objectId === undefined && this.initialization === undefined) {
            return Promise.resolve()
        }
        if (!this.releasePromise) {
            this.releaseRequested = true
            this.releasePromise = this.releaseNativeObject()
        }
        return this.releasePromise
    }

    private async getObjectId(): Promise<string> {
        if (this.releaseRequested) {
            throw invalidNativeObjectError()
        }
        if (this.objectId !== undefined) {
            return this.objectId
        }
        if (!this.initializer) {
            throw invalidNativeObjectError()
        }
        const initialization = this.initialization ??= this.initializer()
        try {
            const objectId = await initialization
            if (this.releaseRequested) {
                throw invalidNativeObjectError()
            }
            this.objectId = objectId
            return objectId
        } catch (error) {
            if (this.initialization === initialization && !this.releaseRequested) {
                this.initialization = undefined
            }
            throw error
        }
    }

    private async releaseNativeObject(): Promise<void> {
        let objectId = this.objectId
        if (objectId === undefined && this.initialization) {
            try {
                objectId = await this.initialization
            } catch {
                return
            }
        }
        this.objectId = undefined
        if (objectId !== undefined) {
            try {
                await PowerAuthNativeObject.releaseNativeObject(objectId)
            } catch {
                console.warn("Failed to release native object")
            }
        }
    }
}

function invalidNativeObjectError(): PowerAuthError {
    return new PowerAuthError(
        undefined,
        "Native object is no longer valid",
        PowerAuthErrorCode.INVALID_NATIVE_OBJECT
    )
}
