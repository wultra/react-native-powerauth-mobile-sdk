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

import Foundation
import PowerAuth2

@objc(PowerAuthPassphraseMeterModule)
final class PowerAuthPassphraseMeterModule: PAJSModule {

    @objc(testPin:resolve:reject:)
    func testPin(_ pin: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        guard let corePin = objectRegister.touchPassword(pin, reject: reject) else {
            return
        }
        var resolveResult: [String: Any]?
        var rejectMessage: String?
        _ = corePin.validateComplexity { passphrase, length in
            if length < 4 {
                rejectMessage = "PIN is too short"
                return 0
            }
            let result = PAJSPinTester.testPasscode(passphrase, length: length)
            if result.contains(.wrongInput) {
                rejectMessage = "Not a PIN"
                return 0
            }
            // Some issues found, so prepare array with issues.
            var issues = [String]()
            if result.contains(.notUnique) {
                issues.append("NOT_UNIQUE")
            }
            if result.contains(.repeatingChars) {
                issues.append("REPEATING_CHARS")
            }
            if result.contains(.hasPattern) {
                issues.append("PATTERN_FOUND")
            }
            if result.contains(.possiblyDate) {
                issues.append("POSSIBLY_DATE")
            }
            if result.contains(.frequentlyUsed) {
                issues.append("FREQUENTLY_USED")
            }
            // Prepare weak flag
            let weakIssues: PAJSPinTester.Result
            if length <= 4 {
                weakIssues = [.frequentlyUsed, .notUnique]
            } else if length <= 6 {
                weakIssues = [.frequentlyUsed, .notUnique, .repeatingChars]
            } else {
                weakIssues = [.frequentlyUsed, .notUnique, .repeatingChars, .hasPattern]
            }
            resolveResult = [
                "issues": issues,
                "shouldWarnUserAboutWeakPin": result != .ok && !result.isDisjoint(with: weakIssues),
            ]
            return 0
        }
        if let resolveResult = resolveResult {
            resolve(resolveResult)
        } else {
            reject(PAJSErrorCode.wrongParameter, rejectMessage, nil)
        }
    }
}
