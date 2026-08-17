/*
 * Copyright 2026 Wultra s.r.o.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { NativeModulesProvider } from "../../../lib-shared/js/internal/NativeModulesProvider";
import { Utils } from "../../../lib-shared/js/internal/Utils";
import { CordovaNativeModulesProvider } from "./NativeModulesProvider";

declare const cordova: { platformId: string };

NativeModulesProvider.provider = new CordovaNativeModulesProvider();
Utils.provider = { platformOs: cordova.platformId };
