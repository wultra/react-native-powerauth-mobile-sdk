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

import { TestContext } from "./TestSuite"

export enum TestPromptDuration {
    SHORT,
    LONG
}

export interface UserInteraction {
    showPrompt(context: TestContext, message: string, duration: TestPromptDuration): Promise<void>
}

export interface TestInteraction extends UserInteraction {
    reportWarning(context: TestContext, message: string): void
    reportInfo(context: TestContext, message: string): void
    reportSkip(context: TestContext, reason: string): void
    reportFailure(context: TestContext, reason: string): void
}