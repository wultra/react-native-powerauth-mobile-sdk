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

import { Platform } from "react-native";
import { parseRnCallStack } from "./private/CallStack";
import { TestEvent, TestEventType, TestMonitor } from "./TestMonitor";
import { TestProgress } from "./TestProgress";

export interface TestLogPadding {
    errorPadding: string;
    logPadding: string;
    infoPadding: string;
    warnPadding: string;
}

function parseStack(stack: string | undefined): string {
    if (stack === undefined) {
        return '';
    }
    const p = '     ▶️ ';
    const parsed = parseRnCallStack(stack, p);
    return `\n${parsed}\n${p}`;
}

export class TestLog implements TestMonitor {

    paddings: TestLogPadding = {
        errorPadding: "",
        logPadding:   "  ",
        infoPadding:  " ",
        warnPadding:  " "
    }

    platform: string

    constructor() {
        if (Platform.OS === 'android') {
            this.platform = 'Android :  ';
        } else if (Platform.OS === 'ios') {
            this.platform = '    iOS :  ';
        } else {
            this.platform = `${Platform.OS} :  `;
        }
    }

    reportEvent(event: TestEvent): void {
        const desc = event.eventDescription;
        const test = event.testName ?? `<?T ${event.suite}>`;
        const msg = event.message ?? '';
        const ep = this.paddings.errorPadding + this.platform;
        const ip = this.paddings.infoPadding + this.platform;
        const lp = this.paddings.logPadding + this.platform;
        const wp = this.paddings.warnPadding + this.platform;
        const p = this.platform;
        switch (event.eventType) {
            case TestEventType.BATCH_INFO:
                console.info (`${ip}## ${desc} ## - ${msg}`);
                break;
            case TestEventType.BATCH_FAIL:
                console.error(`${ep}## ${desc} ## - ${event.failureDescription}${parseStack(event.failCallstack)}`);
                break;

            case TestEventType.SUITE_START:
                console.info (`${ip}[[ ${desc} ]] - STARTED`);
                break;
            case TestEventType.SUITE_SKIP:
                console.warn (`${wp}[[ ${desc} ]] - SKIPPED`);
                break;
            case TestEventType.SUITE_FAIL:
                console.error(`${ep}[[ ${desc} ]] - FAILED: ${event.failureDescription}${parseStack(event.failCallstack)}`);
                break;
            case TestEventType.SUITE_SUCCESS:
                console.info (`${ip}[[ ${desc} ]] - SUCCESS`);
                break;
            case TestEventType.SUITE_INFO:
                console.log  (`${lp} [ ${desc} ] - ${msg}`);
                break;
            case TestEventType.SUITE_WARN:
                console.warn (`${wp} [ ${desc} ] - ${msg}`);
                break;

            case TestEventType.TEST_START:
                console.info (`${ip} [ ${desc} ] - STARTED`);
                break;
            case TestEventType.TEST_SKIPPED:
                console.warn (`${wp} [ ${desc} ] - SKIPPED`);
                break;
            case TestEventType.TEST_FAIL:
                console.error(`${ep} [ ${desc} ] - FAILED: ${event.failureDescription}${parseStack(event.failCallstack)}`);
                break;
            case TestEventType.TEST_SUCCESS:
                console.info (`${ip} [ ${desc} ] - SUCCESS`);
                break;
            case TestEventType.TEST_INFO:
                console.log  (`${lp} [ ${desc} ] - ${msg}`);
                break;
            case TestEventType.TEST_WARN:
                console.warn (`${wp} [ ${desc} ] - ${msg}`);
                break;
        }
    }

    reportTestSuitesProgress(progress: TestProgress): void {
        // log doesn't care about progress
    }
    
    reportAllTestsProgress(progress: TestProgress): void {
        // log doesn't care about progress
    }
}