/*
 * Copyright 2025 Wultra s.r.o.
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

import { NativeWrapper } from "./internal/NativeWrapper";

/**
 * The `PowerAuthTimeSynchronizationService` allows you to synchronize the
 * local device time with the PowerAuth Server and then get the synchronized time.
 */
export class PowerAuthTimeSynchronizationService {
    
    /** 
     * Creates a new instance of `PowerAuthTimeSynchronizationService`.
     *
     * @param instanceId Identifier of `PowerAuth` instance bound to this service.
     */
    constructor(private instanceId: string) {
        
    }

    /** Returns whether the service has its time synchronized with the server. */
    isTimeSynchronized(): Promise<boolean> {
        return NativeWrapper.thisCallBool("isTimeSynchronized", this.instanceId);
    }

    /** 
     * Return the current local time synchronized with the server. The returned value is in milliseconds since the
     * reference date 1.1.1970 (e.g. unix timestamp.)
     *
     * If the local time is not synchronized, then returns the current device local time.
     *
     * You can test `isTimeSynchronized` method if this is not sufficient for your purposes.
     */
    currentTime(): Promise<number> {
        return NativeWrapper.thisCall("currentTime", this.instanceId);
    }

    /** Synchronize the local time with the time on the server. */
    synchronizeTime(): Promise<void> {
        return NativeWrapper.thisCall("synchronizeTime", this.instanceId);
    }

    /** Reset the time synchronization. The time must be synchronized again after this call. */
    resetTimeSynchronization(): Promise<void> {
        return NativeWrapper.thisCall("resetTimeSynchronization", this.instanceId);
    }

    /** 
     * Contains calculated local time difference against the server in milliseconds. The value of the property
     * is informational and is provided only for the testing or the debugging purposes.
     */
    localTimeAdjustment(): Promise<number> {
        return NativeWrapper.thisCall("localTimeAdjustment", this.instanceId);
    }

    /**
     * Contains value representing a maximum absolute deviation of synchronized time against the actual time on the server in milliseconds.
     * 
     * Depending on this value you can determine whether this deviation is within your expected margins. If the current
     * synchronized time is out of your expectations, then try to synchronize the time again.
     */
    localTimeAdjustmentPrecision(): Promise<number> {
        return NativeWrapper.thisCall("localTimeAdjustmentPrecision", this.instanceId);
    }
}