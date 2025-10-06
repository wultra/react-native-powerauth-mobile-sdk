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

/**
 * Object representing encryption HTTP header with data required for PowerAuth End-To-End encrypted request.
 */
export interface PowerAuthEncryptionHttpHeader {
    /**
     * Property representing PowerAuth HTTP Authorization Header. The current implementation
     * contains value "X-PowerAuth-Encryption" for standard encryption.
     */
    readonly key: string
    /** 
     * Computed value of the PowerAuth HTTP Encryption Header, to be used in HTTP request "as is". 
     */
    readonly value: string
}