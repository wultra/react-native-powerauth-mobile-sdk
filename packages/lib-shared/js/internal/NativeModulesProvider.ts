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

import type { NativeModulesProviderIfc } from "./NativeModulesProviderIfc";

/** Platform-specific native modules configured by the public package entry point. */
export class NativeModulesProvider {
    static provider: NativeModulesProviderIfc;

    static get PowerAuthObjectRegister() { return this.provider.PowerAuthObjectRegister; }
    static get PowerAuthEncryptor() { return this.provider.PowerAuthEncryptor; }
    static get PowerAuthPassphraseMeter() { return this.provider.PowerAuthPassphraseMeter; }
    static get PowerAuthPassword() { return this.provider.PowerAuthPassword; }
    static get PowerAuthCryptoUtils() { return this.provider.PowerAuthCryptoUtils; }
    static get PowerAuthStorageUtils() { return this.provider.PowerAuthStorageUtils; }
    static get PowerAuth() { return this.provider.PowerAuth; }
}
