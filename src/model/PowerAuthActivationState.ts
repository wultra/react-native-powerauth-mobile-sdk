/*
 * Copyright 2021 Wultra s.r.o.
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
 * The `PowerAuthActivationState` enum defines all possible states of activation.
 * The state is a part of information received together with the rest
 * of the `PowerAuthActivationStatus` object.
 */
export enum PowerAuthActivationState {
    /**
     * The activation is just created.
     */
    CREATED = "CREATED",
    /**
     * The activation is not completed yet on the server.
     */
    PENDING_COMMIT = "PENDING_COMMIT",
    /**
     * The shared secure context is valid and active.
     */
    ACTIVE = "ACTIVE",
    /**
     * The activation is blocked.
     */
    BLOCKED = "BLOCKED",
    /**
     * The activation doesn't exist anymore.
     */
    REMOVED = "REMOVED",
    /**
     * The activation is technically blocked. You cannot use it anymore
     * for the signature calculations.
     */
    DEADLOCK = "DEADLOCK"
}