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
import { Platform } from "react-native";
import { AppConfig } from './IntegrationUtils'
import { HttpTestReporter } from 'mobile-test-reporter'
import type { PlatformOS } from 'mobile-test-reporter'
import { TestContext, TestMonitor, UserPromptDuration, UserInteraction, TestProgressObserver, TestLog, TestMonitorGroup, TestRunner } from 'mobile-testbed'

export class TestExecutor implements UserInteraction {

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
    this.onProgress = (progress) => {
      onProgress(progress)
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

    const batchName = interactive ? 'Interactive tests' : 'Automatic tests'
    const platformOS = toPlatformOS(Platform.OS)

    if (!platformOS) {
      console.error(`Unsupported platform: ${Platform.OS}`)

      this.isRunning = false
      this.testRunner = undefined
      this.onCompletion(false)

      return
    }
    const runtime = (globalThis as any).cordova ? 'cordova' : 'react-native'
    const appName = runtime === 'cordova' ? 'testapp-cordova' : 'testapp'

    console.info(`TestExecutor: platform=${platformOS} runtime=${runtime} collectorUrl='${AppConfig.testCollectorUrl}' interactive=${interactive}`)

    const logger = new TestLog(platformOS)
    const monitors: TestMonitor[] = [ logger ]
    let reporter: HttpTestReporter | undefined
    if (AppConfig.testCollectorUrl) {
      try {
        reporter = new HttpTestReporter({
          collectorUrl: AppConfig.testCollectorUrl,
          runName: batchName,
          interactive,
          client: {
            platformOS,
            runtime,
            appName
          }
        })
      } catch (e) {
        console.error(`Test collector URL is invalid: '${AppConfig.testCollectorUrl}'.`)
        console.error(`Details: ${e}`)
        this.isRunning = false
        this.testRunner = undefined
        this.onCompletion(false)
        return
      }
    }

    if (reporter) {
      try {
        await reporter.startRun()
        monitors.push(reporter)
      } catch (e) {
        console.error(`Test collector is not reachable at '${AppConfig.testCollectorUrl}'.`)
        console.error(`Details: ${e}`)
        this.isRunning = false
        this.testRunner = undefined
        this.onCompletion(false)
        return
      }
    }

    const monitor = new TestMonitorGroup(monitors)
    const runner = this.testRunner = new TestRunner(batchName, monitor, this, platformOS)
    runner.allTestsCounter.addObserver(this.onProgress)
    const tests = interactive ? getInteractiveLibraryTests() :  getLibraryTests().concat(getTestbedTests())

    let runSuccess = false
    try {
      runSuccess = await runner.runTests(tests)
    } finally {
      try {
        await reporter?.completeRun(runSuccess, {
          suitesTotal: runner.allSuitesCounter.total,
          suitesSucceeded: runner.allSuitesCounter.succeeded,
          suitesFailed: runner.allSuitesCounter.failed,
          suitesSkipped: runner.allSuitesCounter.skipped,
          testsTotal: runner.allTestsCounter.total,
          testsSucceeded: runner.allTestsCounter.succeeded,
          testsFailed: runner.allTestsCounter.failed,
          testsSkipped: runner.allTestsCounter.skipped
        })
      } catch (e) {
        console.error(`Failed to report test results: ${e}`)
      }
      this.isRunning = false
      this.testRunner = undefined
      this.onCompletion(false)
    }
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

function toPlatformOS(value: string): PlatformOS | undefined {
  return value === 'android' || value === 'ios' ? value : undefined
}
