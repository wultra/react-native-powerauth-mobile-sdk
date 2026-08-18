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
 * The `PowerAuthRecoveryActivationData` object contains information about recovery code and PUK, created
 * during the activation process.
 */
export interface PowerAuthRecoveryActivationData {
    /**
     * Contains recovery code.
     */
    recoveryCode: string
    /**
     * Contains PUK, valid with recovery code.
     */
    puk: string
}