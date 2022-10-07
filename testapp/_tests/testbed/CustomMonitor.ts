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

import { TestEvent, TestMonitor } from "../../src/testbed/TestMonitor"
import { TestProgress } from "../../src/testbed/TestProgress"

export class CustomMonitor implements TestMonitor {
    
    eventList: TestEvent[] = []
    suiteProgress: TestProgress | undefined
    testsProgress: TestProgress | undefined

    reportEvent(event: TestEvent): void {
        this.eventList.push(event)
    }
    reportTestSuitesProgress(progress: TestProgress): void {
        this.suiteProgress = progress
    }
    reportAllTestsProgress(progress: TestProgress): void {
        this.testsProgress = progress
    }
}