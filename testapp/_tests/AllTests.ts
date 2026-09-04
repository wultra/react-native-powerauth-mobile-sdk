//
// Copyright 2022 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { TestSuite } from "mobile-testbed";
import { PowerAuthAlgorithm } from "react-native-powerauth-mobile-sdk";
import { TestRunnerTests } from "./testbed/TestRunner.test";
import { TestSuiteTests } from "./testbed/TestSuite.test";
import { PowerAuthActivationCodeUtilTests } from "./PowerAuthActivationCodeUtil.test";
import { PowerAuthUtilsTests } from "./PowerAuthUtils.test";
import { PowerAuthActivationTests } from "./PowerAuthActivation.test";
import { PowerAuth_ActivationTests } from "./PowerAuth_Activation.test";
import { PowerAuth_PasswordTests } from "./PowerAuth_Password.test";
import { PowerAuth_BiometryTests } from "./PowerAuth_Biometry.test";
import { PowerAuth_BiometryInteractiveTests } from "./PowerAuth_BiometryInteractive.test";
import { PowerAuth_SignatureTests } from "./PowerAuth_Signature.test";
import { PowerAuth_AdvancedSignatureTests } from "./PowerAuth_AdvancedSignature.test";
import { PowerAuth_TokenTests } from "./PowerAuth_Token.test";
import { PowerAuth_KDFTests } from "./PowerAuth_KDF.test";
import { PowerAuth_ConfigureTests } from "./PowerAuth_Configure.test";
import { NativeObjectRegisterTests } from "./NativeObjectRegister.test";
import { PowerAuthPasswordTests } from "./PowerAuthPassword.test";
import { PowerAuth_LegacyAuthBiometryTests, PowerAuth_LegacyAuthTests } from "./PowerAuth_LegacyAuth.test";
import { PowerAuthPassphraseMeterTests } from "./PowerAuthPassphraseMeter.test";
import { ConfigurationObjectsTests } from "./ConfigurationObjects.test";
import { PowerAuth_EncryptorTests } from "./PowerAuth_Encryptor.test";
import { PowerAuth_TimeSyncTests } from "./PowerAuth_TimeSync.test";
import { PowerAuth_UserInfoTest } from "./PowerAuth_UserInfo.test";
import { PowerAuth_CryptoUtilsTest } from "./PowerAuth_CryptoUtils.test";
import { PowerAuth_ErrorDataTests } from "./PowerAuth_ErrorData.test";
import { PowerAuth_ProtocolUpgradeTests } from "./PowerAuth_ProtocolUpgrade.test";
import { PowerAuth_SecureVaultTests } from "./PowerAuth_SecureVault.test";
import { TestWithActivation } from "./helpers/TestWithActivation";

interface AlgorithmPass {
    name: string
    algorithm?: PowerAuthAlgorithm
}

type ActivationTestConstructor<T extends TestWithActivation = TestWithActivation> =
    new (suiteName?: string) => T

function getAlgorithmPasses(): [AlgorithmPass, AlgorithmPass] {
    return [
        {
            name: "legacy",
            algorithm: PowerAuthAlgorithm.LEGACY
        },
        {
            name: "default"
        }
    ]
}

function suiteForPass<T extends TestWithActivation>(
    TestClass: ActivationTestConstructor<T>,
    pass: AlgorithmPass
): T {
    return new TestClass(`${TestClass.name} [${pass.name}]`).withAlgorithm(pass.algorithm)
}

function getAlgorithmPassTests(pass: AlgorithmPass): TestSuite[] {
    const isLegacy = pass.algorithm === PowerAuthAlgorithm.LEGACY
    return [
        suiteForPass(PowerAuth_ActivationTests, pass),
        suiteForPass(PowerAuth_PasswordTests, pass),
        suiteForPass(PowerAuth_SignatureTests, pass),
        ...(isLegacy ? [] : [
            suiteForPass(PowerAuth_AdvancedSignatureTests, pass),
            suiteForPass(PowerAuth_SecureVaultTests, pass)
        ]),
        suiteForPass(PowerAuth_TokenTests, pass),
        ...(isLegacy ? [suiteForPass(PowerAuth_KDFTests, pass)] : []),
        suiteForPass(PowerAuth_EncryptorTests, pass),
        suiteForPass(PowerAuth_UserInfoTest, pass),
        suiteForPass(PowerAuth_LegacyAuthTests, pass),
        suiteForPass(PowerAuth_ErrorDataTests, pass)
    ]
}

export function getLibraryTests(): TestSuite[] {
    const [legacyPass, defaultPass] = getAlgorithmPasses()
    return [
        new ConfigurationObjectsTests(),
        new PowerAuth_ConfigureTests(),
        new PowerAuth_ProtocolUpgradeTests(),
        new PowerAuth_TimeSyncTests(),
        ...getAlgorithmPassTests(legacyPass),
        ...getAlgorithmPassTests(defaultPass),
        new PowerAuthActivationTests(),
        new PowerAuthActivationCodeUtilTests(),
        new PowerAuthUtilsTests(),
        new PowerAuthPasswordTests(),
        new PowerAuthPassphraseMeterTests(),
        new NativeObjectRegisterTests(),
        new PowerAuth_CryptoUtilsTest()
    ]
}

export function getInteractiveLibraryTests(): TestSuite[] {
    const [legacyPass, defaultPass] = getAlgorithmPasses()
    return [
        suiteForPass(PowerAuth_BiometryTests, legacyPass),
        suiteForPass(PowerAuth_BiometryInteractiveTests, legacyPass),
        suiteForPass(PowerAuth_LegacyAuthBiometryTests, legacyPass),
        suiteForPass(PowerAuth_BiometryTests, defaultPass),
        suiteForPass(PowerAuth_BiometryInteractiveTests, defaultPass),
        suiteForPass(PowerAuth_LegacyAuthBiometryTests, defaultPass)
    ]
}

export function getTestbedTests(): TestSuite[] {
    return [
        new TestRunnerTests(),
        new TestSuiteTests()
    ]
}
