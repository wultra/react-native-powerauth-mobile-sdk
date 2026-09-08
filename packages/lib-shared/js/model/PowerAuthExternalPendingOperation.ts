/*
 * Copyright 2024 Wultra s.r.o.
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
 * ### iOS specific
 * 
 * The `PowerAuthExternalPendingOperationType` defines types of operation
 * started in another application that share activation data.
 */
export type PowerAuthExternalPendingOperationType = "ACTIVATION" | "PROTOCOL_UPGRADE"

/**
 * ### iOS specific
 * 
 * The `PowerAuthExternalPendingOperation` interface contains data that can identify an external
 * application that started the critical operation.
 */
export interface PowerAuthExternalPendingOperation {
    /**
     * Type of operation running in another application.
     */
    externalOperationType: PowerAuthExternalPendingOperationType
    /**
     * Identifier of external application that started the operation. This is the same identifier
     * you provided to `PowerAuthSharingConfiguration` during the PowerAuth initialization.
     */
    externalApplicationId: string
}