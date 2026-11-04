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

@objc(PowerAuthCryptoUtilsModule)
final class PowerAuthCryptoUtilsModule: PAJSModule {

    @objc(hashSha256:resolve:reject:)
    func hashSha256(_ input: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        guard let inputBase64 = input as? String else {
            reject(PAJSErrorCode.wrongParameter, "Input cannot be converted to String.", nil)
            return
        }
        guard let decoded = Data(base64Encoded: inputBase64) else {
            reject(PAJSErrorCode.wrongParameter, "Input is not valid Base64.", nil)
            return
        }
        resolve(PowerAuthCoreCryptoUtils.hashSha256(decoded).base64EncodedString())
    }

    @objc(randomBytes:resolve:reject:)
    func randomBytes(_ length: Any?, resolve: @escaping PAJSResolveBlock, reject: @escaping PAJSRejectBlock) {
        let length = (length as? NSNumber)?.intValue ?? 0
        if length < 0 {
            reject(PAJSErrorCode.wrongParameter, "Length must be a non-negative integer", nil)
            return
        }
        // Handle zero-length explicitly to return valid Base64 for empty data and avoid calling underlying generator with 0
        if length == 0 {
            resolve("")
            return
        }
        guard let data = PowerAuthCoreCryptoUtils.randomBytes(UInt(length)) else {
            let error = NSError(domain: NSOSStatusErrorDomain, code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to generate random bytes"])
            PAJS.processError(error, reject: reject)
            return
        }
        resolve(data.base64EncodedString())
    }
}
