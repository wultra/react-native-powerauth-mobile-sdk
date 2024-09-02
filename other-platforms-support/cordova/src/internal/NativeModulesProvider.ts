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

//@ts-nocheck

import { NativeModulesProviderIfc } from "./NativeModulesProviderIfc";
import { NativeObjectRegisterIfc } from "../debug/NativeObjectRegisterIfc";
import { PowerAuthEncryptorIfc } from "./NativeEncryptor";
import { NativeObject } from "./NativeObject";
import { PowerAuthPassphraseMeterIfc } from "./NativePassphraseMeter";
import { PowerAuthPasswordIfc } from "./NativePassword";

class Provider implements NativeModulesProviderIfc {
    PowerAuthObjectRegister = new NativeObjectRegisterImpl() as NativeObjectRegisterIfc & NativeObject;
    PowerAuthEncryptor = {} as PowerAuthEncryptorIfc;
    PowerAuthPassphraseMeter = {} as PowerAuthPassphraseMeterIfc;
    PowerAuthPassword = {} as PowerAuthPasswordIfc;
    PowerAuth = new NativePowerAuth();
}

class NativeObjectRegisterImpl implements NativeObjectRegisterIfc {

    async debugDump(instanceId: string | undefined): Promise<Array<any>> {
        console.log("debugDump not implemented yet")
        return []
    }
    /**
     * Manipulate with object register. The function is implemented in DEBUG build of the library.
     * @param command Command to execute.
     * @param data Command data.
     * @returns Command result.
     */
    async debugCommand(command: any, data: any): Promise<any> {
        console.log("debugCommand not implemented yet")
        return "not implemented yet";
    }
}

export const NativeModulesProvider = new Provider() as NativeModulesProviderIfc;