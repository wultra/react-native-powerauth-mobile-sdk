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

import "./internal/PlatformDependencies";

export * from "../../lib-shared/js/index";

// Keep globals exposed by the previous Cordova declaration-based build.
export { PowerAuthTimeSynchronizationService } from "../../lib-shared/js/PowerAuthTimeSynchronizationService";
export { PowerAuthNativeObject } from "../../lib-shared/js/model/PowerAuthNativeObject";
