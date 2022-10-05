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

import { TestContext, UserInteraction, TestPromptDuration } from "../../src/testbed";

export interface PromptWithDuration {
    prompt: string
    duration: TestPromptDuration
}

export class CustomInteraction implements UserInteraction {
    promptList: PromptWithDuration[] = []

    reset() {
        this.promptList = []
    }

    async showPrompt(context: TestContext, message: string, duration: TestPromptDuration): Promise<void> {
        this.promptList.push({prompt: message, duration: duration})
    }
}