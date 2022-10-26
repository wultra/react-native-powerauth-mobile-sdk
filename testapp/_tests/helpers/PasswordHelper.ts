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

import { PowerAuth, PowerAuthPassword } from "react-native-powerauth-mobile-sdk";

/**
 * Function creates PowerAuthPassword object and imports provided passphrase from the string. 
 * In the regular app, you let user to type the password character by character, so don't use such
 * function in your application.
 * @param password String with password to import.
 * @param destroyOnUse Password will be destroyed on use.
 * @param owner If provided, then the password will be associated with given PowerAuth instance.
 * @param pass If provided, then the string will be imported to this object.
 * @returns PowerAuthPassword with imported passphrase.
 */
export async function importPassword(password: string, destroyOnUse: boolean = true, owner: PowerAuth | undefined = undefined, pass: PowerAuthPassword | undefined = undefined): Promise<PowerAuthPassword> {
    const p = pass ?? owner?.createPassword(destroyOnUse) ?? new PowerAuthPassword(destroyOnUse)
    let pos = 0;
    while (pos < password.length) {
        const cp = password.codePointAt(pos)
        if (cp) {
            await p.addCharacter(cp)
            pos += String.fromCodePoint(cp).length    
        } else {
            throw new Error('Failed to extract codepoint')
        }
    }
    return p
}