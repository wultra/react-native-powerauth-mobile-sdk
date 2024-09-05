//
// Copyright 2024 Wultra s.r.o.
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
import { TestContext, UserPromptDuration, UserInteraction, TestCounter, TestProgressObserver } from './testbed'
import { TestLog } from './testbed/TestLog'
import { TestMonitorGroup } from './testbed/TestMonitor'
import { TestRunner } from './testbed/TestRunner'
 
// TODO: this is copied from the react native app. improve - extract instead of copy
class TestExecutor implements UserInteraction {

  private isRunning = false
  private readonly onShowPrompt: (context: TestContext, message: string, duration: number) => Promise<void>
  private readonly onProgress: TestProgressObserver
  private readonly onCompletion: (inProgress: boolean) => void
  private testRunner?: TestRunner
  

  constructor(
    onShowPrompt: (context: TestContext, message: string, duration: number) => Promise<void>,
    onProgress: TestProgressObserver,
    onCompletion: (inProgress: boolean)=>void) {
    this.onShowPrompt = onShowPrompt
    this.onProgress = onProgress
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
    try {
    await runner.runTests(tests)
    } catch (e) {
      console.log("Run Tests failed");
      console.error(e);
    }
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

declare var cordova: any;

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    
  // Cordova is now initialized. Have fun!

  const statusEl = document.getElementById('tests-status');
  const progressEl = document.getElementById('tests-progress');

  console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
  document.getElementById('deviceready').classList.add('ready');
  document.getElementById('deviceready').addEventListener('click', async function (e) {
    
  })

  const executor = new TestExecutor(async (_context, message, duration) => {
    console.log(message)
    await new Promise<void>(resolve => setTimeout(resolve, duration)) 
  }, (progress) => {
    progressEl.innerHTML = `${progress.succeeded} succeeded<br>${progress.failed} failed<br>${progress.skipped} skipped<br>out of total  ${progress.total}`;
  }, (progress) => {
    statusEl.innerHTML = progress ? "Tests running" : "Tests finished";
  })
}