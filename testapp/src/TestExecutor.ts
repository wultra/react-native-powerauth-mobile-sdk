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

import { getInteractiveLibraryTests, getLibraryTests, getTestbedTests } from '../_tests/AllTests'
import { getTestConfig } from './Config'
import { TestContext, UserPromptDuration, UserInteraction, TestProgressObserver, TestProgress } from './testbed'
import { TestLog } from './testbed/TestLog'
import { TestMonitorGroup } from './testbed/TestMonitor'
import { TestRunner } from './testbed/TestRunner'
 
export class TestServer {

  constructor() {
    // we want to re-route console outputs for easier "test infrastructure" and debugging on CI
    const logF = console.log;
    const warnF = console.warn;
    const errorF = console.error;
    const infoF = console.info;
    
    console.log = (...params) => {
      this.log(params)
      logF(...params);
    }
    
    console.warn = (...params) => {
      this.log(params)
      warnF(...params);
    }
    
    console.info = (...params) => {
      this.log(params)
      infoF(...params);
    }
    
    console.error = (...params) => {
      this.log(params)
      errorF(...params);
    }
  }

  log(data: any[]) {
    this.call("log", data)
  }

  reportStatus(data: TestProgress) {
    this.call("reportStatus", data)
  }

  private call(method: string, object: any) {
    // the server code is in the git root as "test-listener.js"
    fetch("http://localhost:8083/" + method, { method: "POST", body: JSON.stringify(object) }).catch((e) => {
      // do we need to react?
    })
  }
}

export class TestExecutor implements UserInteraction {

  private isRunning = false
  private readonly onShowPrompt: (context: TestContext, message: string, duration: number) => Promise<void>
  private readonly onProgress: TestProgressObserver
  private readonly onCompletion: (inProgress: boolean) => void
  private testRunner?: TestRunner
  private testServer = new TestServer();

  constructor(
    onShowPrompt: (context: TestContext, message: string, duration: number) => Promise<void>,
    onProgress: TestProgressObserver,
    onCompletion: (inProgress: boolean)=>void) {
    this.onShowPrompt = onShowPrompt
    this.onProgress = (progress) => {
      onProgress(progress)
      this.testServer.reportStatus(progress)
    }
    this.onCompletion = onCompletion
    this.runTests(false)
  }
  
  async runTests(interactive: boolean) {
    if (this.isRunning) {
      console.warn('Tests are still in progress...');
      return
    }
    this.onCompletion(true)
    this.isRunning = true
    
    const cfg = await getTestConfig()
    const logger = new TestLog()
    const monitor = new TestMonitorGroup([ logger ])
    const runner = this.testRunner = new TestRunner('Automatic tests', cfg, monitor, this)
    runner.allTestsCounter.addObserver(this.onProgress)
    const tests = interactive ? getInteractiveLibraryTests() :  getLibraryTests().concat(getTestbedTests())
    await runner.runTests(tests)
    this.isRunning = false
    this.testRunner = undefined
    this.onCompletion(false)
  }

  cancelTests() {
    this.testRunner?.cancelRunningTests()
  }

  stillRunnint(): boolean {
    return this.isRunning
  }

  async showPrompt(context: TestContext, message: string, duration: UserPromptDuration): Promise<void> {
    let sleepDuration: number
    if (duration === UserPromptDuration.QUICK) {
       sleepDuration = 500
    } else if (duration === UserPromptDuration.SHORT) {
      sleepDuration = 2000
    } else {
      sleepDuration = 5000
    }
    return await this.onShowPrompt(context, message, sleepDuration)
  }

  async sleepWithProgress(context: TestContext, durationMs: number): Promise<void> {
    let remaining = durationMs
    while (remaining > 0) {
      if (remaining >= 1000) {
        const timeInSeconds = Math.round(remaining * 0.001)
        if (timeInSeconds > 1) {
          await this.onShowPrompt(context, `Sleeping for ${timeInSeconds} seconds...`, 1000)
        } else {
          await this.onShowPrompt(context, `Finishing sleep...`, 1000)
        }
        remaining -= 1000
      } else {
        // Otherwise just sleep for the remaining time
        await new Promise<void>(resolve => setTimeout(resolve, remaining)) 
        remaining = 0
      }
    }
  }
}