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

import { NativeObjectHandle } from "../internal/NativeObjectHandle"
import { NativeWrapper } from "../internal/NativeWrapper"
import { BaseReleasableObject } from "./BaseNativeObject"
import { PowerAuthRawPasswordType } from "./PowerAuthNativeTypes"

/**
 * Native-backed data required to finish a two-step password change.
 *
 * The old password remains only on the native side. This object is consumed automatically by
 * `PowerAuth.finishPasswordChange()`. Call `release()` when abandoning the operation.
 */
export class PowerAuthPasswordChangeData implements BaseReleasableObject {
    private readonly handle: NativeObjectHandle

    private constructor(objectId: string) {
        this.handle = new NativeObjectHandle(objectId)
    }

    /** @internal */
    static async begin(
        powerAuthInstanceId: string,
        oldPassword: PowerAuthRawPasswordType
    ): Promise<PowerAuthPasswordChangeData> {
        const objectId = await NativeWrapper.thisCall<string>(
            "beginPasswordChange",
            powerAuthInstanceId,
            oldPassword
        )
        return new PowerAuthPasswordChangeData(objectId)
    }

    /** @internal */
    async executeAndRelease<T>(operation: (objectId: string) => Promise<T>): Promise<T> {
        try {
            return await this.handle.withObjectId(operation)
        } finally {
            await this.release()
        }
    }

    /** Releases the underlying native password-change data. */
    release(): Promise<void> {
        return this.handle.release()
    }
}
