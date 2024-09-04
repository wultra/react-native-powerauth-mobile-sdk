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
import { NativeCordovaModule } from "./NativeCordovaModule";
import { NativePowerAuth } from "./NativePowerAuth"

class Provider implements NativeModulesProviderIfc {
    PowerAuthObjectRegister = new NativeObjectRegisterImpl() as NativeObjectRegisterIfc & NativeObject;
    PowerAuthEncryptor = new NativePowerAuthEncryptorImpl() as PowerAuthEncryptorIfc;
    PowerAuthPassphraseMeter = new PowerAuthPassphraseMeterImpl() as PowerAuthPassphraseMeterIfc;
    PowerAuthPassword = new PowerAuthPasswordImpl() as PowerAuthPasswordIfc;
    PowerAuth = new NativePowerAuth();
}

class NativeObjectRegisterImpl extends NativeCordovaModule implements NativeObjectRegisterIfc {

    readonly pluginName = "PowerAuthObjectRegister";

    async debugDump(instanceId: string | undefined): Promise<Array<any>> {
        return await this.callNative("debugDump", [instanceId])
    }
    
    async debugCommand(command: any, data: any): Promise<any> {
        return await this.callNative("debugCommand", [command, data])
    }

    async isValidNativeObject(objectId: string): Promise<boolean> {
        return await this.callNative("isValidNativeObject", [objectId])
    }
}

class NativePowerAuthEncryptorImpl extends NativeCordovaModule implements PowerAuthEncryptorIfc {

    readonly pluginName = "PowerAuthEncryptorModule";

    async initialize(scope: string, ownerId: string, autoreleaseTime: number): Promise<string> {
        return await this.callNative("initialize", [scope, ownerId, autoreleaseTime])
    }

    async release(encryptorId: string): Promise<void> {
        return await this.callNative("release", [encryptorId]);
    }

    async canEncryptRequest(encryptorId: string): Promise<boolean> {
        return await this.callNative("canEncryptRequest", [encryptorId]);
    }

    async encryptRequest(encryptorId: string, data: string | undefined, format: string | undefined): Promise<EncryptedRequestData> {
        return await this.callNative("encryptRequest", [encryptorId, data, format]);
    }

    async canDecryptResponse(encryptorId: string): Promise<boolean> {
        return await this.callNative("canDecryptResponse", [encryptorId]);
    }

    async decryptResponse(encryptorId: string, cryptogram: PowerAuthCryptogram, outputFormat: string | undefined): Promise<string> {
        return await this.callNative("decryptResponse", [encryptorId, cryptogram, outputFormat]);
    }
}

class PowerAuthPassphraseMeterImpl extends NativeCordovaModule implements PowerAuthPassphraseMeterIfc {

    readonly pluginName = "PowerAuthPassphraseMeterModule";
    
    async testPin(pin: RawPasswordType): Promise<PinTestResult> {
        return await this.callNative("testPin", [pin]);
    }
}

class PowerAuthPasswordImpl extends NativeCordovaModule implements PowerAuthPasswordIfc {

    readonly pluginName = "PowerAuthPasswordModule";

    async initialize(destroyOnUse: boolean, ownerId: string | undefined, autoreleaseTime: number): Promise<string> {
        return await this.callNative("initialize", [destroyOnUse, ownerId, autoreleaseTime]);
    }

    async release(objectId: string): Promise<void> {
        return await this.callNative("release", [objectId]);
    }

    async clear(objectId: string): Promise<void> {
        return await this.callNative("clear", [objectId]);
    }
    
    async length(objectId: string): Promise<number> {
        return await this.callNative("length", [objectId]);
    }

    async isEqual(objectId1: string, objectId2: string): Promise<boolean> {
        return await this.callNative("isEqual", [objectId1, objectId2]);
    }

    async addCharacter(objectId: string, character: number): Promise<number> {
        return await this.callNative("addCharacter", [objectId, character]);
    }
    
    async insertCharacter(objectId: string, character: number, position: number): Promise<number> {
        return await this.callNative("insertCharacter", [objectId, character, position]);
    }

    async removeCharacter(objectId: string, position: number): Promise<number> {
        return await this.callNative("removeCharacter", [objectId, position]);
    }
    
    async removeLastCharacter(objectId: string): Promise<number> {
        return await this.callNative("removeLastCharacter", [objectId]);
    }
}

export const NativeModulesProvider = new Provider() as NativeModulesProviderIfc;