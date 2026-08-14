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

import type { NativePowerAuthIfc } from "../../../lib-shared/src/internal/NativePowerAuthIfc";
import { Utils } from "../../../lib-shared/src/internal/Utils";

declare const cordova: {
    exec(
        success: (response: any) => void,
        failure: (error: any) => void,
        pluginName: string,
        action: string,
        args: any[],
    ): void;
};

export abstract class NativeCordovaModule implements NativePowerAuthIfc {

    protected abstract readonly pluginName: string;

    callNative<T>(name: string, args: any[]): Promise<T> {
        return new Promise<T>(
            (resolve, reject) => {
                cordova.exec(
                    // success callback
                    (response) => { 
                        if (Utils.platformOs === "android") {
                            resolve(response);
                        } else {
                            const parsed = JSON.parse(response);
                            resolve(parsed.result);     
                        }                    
                    },
                    // error callback
                    (error) => {
                        if (Utils.platformOs === "android") {
                            reject(error)
                        } else {
                            reject(JSON.parse(error)) 
                        }
                    },
                    // native platform plugin name
                    this.pluginName,
                    // function name
                    name,
                    // function arguments
                    args
                );
            }
        );
    }
}
