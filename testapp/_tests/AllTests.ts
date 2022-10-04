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

import { TestSuite } from "../src/testbed/TestSuite";
import { PowerAuthActivationCodeUtilTests } from "./PowerAuthActivationCodeUtil.test";
import { PowerAuthActivationTests } from "./PowerAuthActivation.test";
import { PowerAuth_ActivationTests } from "./PowerAuth_Activation.test";
import { TestRunnerTests } from "./testbed/TestRunner.test";
import { TestSuiteTests } from "./testbed/TestSuite.test";
import { PowerAuth_RecoveryTests } from "./PowerAuth_Recovery.test";
import { PowerAuth_PasswordTests } from "./PowerAuth_Password.test";
import { PowerAuth_BiometryTests } from "./PowerAuth_Biometry.test";
import { PowerAuth_SignatureTests } from "./PowerAuth_Signature.test";
import { PowerAuth_TokenTests } from "./PowerAuth_Token.test";

export function getLibraryTests(): TestSuite[] {
    return [
        new PowerAuthActivationTests(),
        new PowerAuthActivationCodeUtilTests(),
        new PowerAuth_ActivationTests(),
        new PowerAuth_RecoveryTests(),
        new PowerAuth_PasswordTests(),
        new PowerAuth_BiometryTests(),
        new PowerAuth_SignatureTests(),
        new PowerAuth_TokenTests(),
    ];
}

export function getTestbedTests(): TestSuite[] {
    return [
        new TestRunnerTests(),
        new TestSuiteTests()
    ];
}