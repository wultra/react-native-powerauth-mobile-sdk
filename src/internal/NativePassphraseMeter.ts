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

import { NativeModules } from "react-native"
import { PinTestResult } from '../index'
import { RawPasswordType } from './NativeTypes';
/**
 * Password interface implemented in the native code.
 */
export interface PowerAuthPassphraseMeterIfc {
    /**
     * Test strength of PIN.
     * @param pin PIN to test.
     * @returns `PinTestResult` object.
     * @throws `PowerAuthErrorCode.WRONG_PARAM` if PIN contains other characters than digits or length is less than 4.
     */
    testPin(pin: RawPasswordType): Promise<PinTestResult>
}

export const NativePassphraseMeter = NativeModules.PowerAuthPassphraseMeter as PowerAuthPassphraseMeterIfc