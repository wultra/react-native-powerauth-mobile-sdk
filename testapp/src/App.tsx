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

import React, { Component } from 'react'
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Button,
  Appearance,
  NativeEventSubscription,
} from 'react-native'
import { getInteractiveLibraryTests, getLibraryTests, getTestbedTests } from '../_tests/AllTests'
import { getTestConfig } from './Config'
import { TestContext, UserPromptDuration, UserInteraction, TestCounter, TestProgressObserver } from './testbed'
import { TestLog } from './testbed/TestLog'
import { TestMonitorGroup } from './testbed/TestMonitor'
import { TestRunner } from './testbed/TestRunner'
 

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

interface AppState {
  isDark: boolean
  inProgress: boolean
  promptMessage?: string

  testsDone: number
  testsSkipped: number
  testsFailed: number
  testsCount: number
}

const Separator = () => (
  <View style={styles.separator} />
);

class App extends Component<{}, AppState> {
  
  state = {
    isDark: Appearance.getColorScheme() === 'dark',
    inProgress: false, 
    promptMessage: undefined,
    testsDone: 0,
    testsSkipped: 0,
    testsFailed: 0,
    testsCount: 0
  }

  subscription?: NativeEventSubscription
  executor?: TestExecutor

  onPressNotInteractive = () => {
    this.executor?.runTests(false)
  }

  onPressInteractive = () => {
    this.executor?.runTests(true)
  }

  onPressCancel = () => {
    this.executor?.cancelTests()
  }

  componentDidMount() {
    // Patch appearance
    this.subscription = Appearance.addChangeListener((preferences) => {
      this.setState({isDark: Appearance.getColorScheme() === 'dark'})
    })
    // Create test executor
    this.executor = new TestExecutor(async (_context, message, duration) => {
      this.setState({ promptMessage: message })
      await new Promise<void>(resolve => setTimeout(resolve, duration)) 
      this.setState({ promptMessage: ' '})
    }, (progress) => {
      this.setState({
        testsCount: progress.total,
        testsDone: progress.succeeded,
        testsSkipped: progress.skipped,
        testsFailed: progress.failed
      })
    }, (progress) => {
      this.setState({inProgress: progress})
    })
  }

  componentWillUnmount() {
    this.subscription?.remove()
    this.executor?.cancelTests()
    this.executor = undefined
  }

  render() {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.promptContainer}>
          <Text style={styles.promptText}>
            { this.state.promptMessage ?? ' ' }
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <Text style={this.state.isDark ? styles.progressTextDark : styles.progressTextLight}>
            {this.state.testsDone + this.state.testsFailed + this.state.testsSkipped} / {this.state.testsCount}
          </Text>
        </View>
        <Separator />
        { !this.state.inProgress ? 
            <View style={styles.fixToText}>
              <Button title="Run regular" onPress={() => this.onPressNotInteractive() } />
              <Button title="Run interactive" onPress={() => this.onPressInteractive() } />
            </View> :
            <View style={styles.fixToText}>
              <Button title="Cancel" onPress={() => this.onPressCancel() } />
            </View>
        }
      </SafeAreaView>
     )
   }
 }
 
 const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 16
  },
  separator: {
    marginVertical: 8,
    borderBottomColor: '#737373',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fixToText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  promptText: {
    marginVertical: 16,
    fontSize: 20,
    textAlign: 'center',
    color: '#FF0000'
  },
  promptContainer: {
    height: 120
  },
  progressContainer: {
    height: 40
  },
  progressTextDark: {
    textAlign: 'center',
    color: '#FFFFFF'
  },
  progressTextLight: {
    textAlign: 'center',
    color: '#000000'
  }
})
 
export default App;