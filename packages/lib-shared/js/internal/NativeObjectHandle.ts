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
 * Owns one already-created native object identifier.
 *
 * Unlike `BaseNativeObject`, this handle never recreates an expired, released, or consumed
 * native object. It is intended for stateful and sensitive objects with an explicit lifetime.
 */
export class NativeObjectHandle {
    private objectId: string | undefined
    private releasePromise: Promise<void> | undefined

    constructor(objectId: string) {
        this.objectId = objectId
    }

    async withObjectId<T>(action: (objectId: string) => Promise<T>): Promise<T> {
        const objectId = this.objectId
        if (!objectId) {
            throw new PowerAuthError(
                undefined,
                "Native object is no longer valid",
                PowerAuthErrorCode.INVALID_NATIVE_OBJECT
            )
        }
        try {
            return await action(objectId)
        } catch (error: any) {
            throw NativeWrapper.processException(error)
        }
    }

    /** Invalidates this handle and releases its native object at most once. */
    release(): Promise<void> {
        if (!this.releasePromise) {
            this.releasePromise = this.releaseNativeObject()
        }
        return this.releasePromise
    }

    private async releaseNativeObject(): Promise<void> {
        const objectId = this.objectId
        this.objectId = undefined
        if (objectId) {
            try {
                await PowerAuthNativeObject.releaseNativeObject(objectId)
            } catch {
                console.warn("Failed to release native object")
            }
        }
    }
}
