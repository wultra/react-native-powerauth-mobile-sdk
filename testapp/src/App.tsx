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

import React, { Component } from 'react'
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
} from 'react-native'
import { getLibraryTests, getTestbedTests } from '../_tests/AllTests'
import { getTestConfig } from './Config'
import { TestLog } from './testbed/TestLog'
import { TestMonitorGroup } from './testbed/TestMonitor'
import { TestRunner } from './testbed/TestRunner'
 

class TestExecutor {
  isRunning = false

  constructor() {
    this.runTests()
  }
  
  async runTests() {
    if (this.isRunning) {
      console.warn('Tests are still running...');
      return
    }
    this.isRunning = true
    
    const cfg = await getTestConfig()
    const logger = new TestLog()
    const runner = new TestRunner('Automatic tests', cfg, logger, undefined)
    const allTests = getTestbedTests()
    await runner.runTests(allTests)
    this.isRunning = false
  }
}

class App extends Component {
  state = {
     count: 0
  }

  executor = new TestExecutor()

  onPress = async () => {
    this.executor.runTests()
  }

  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity
         style={styles.button}
         onPress={this.onPress}
        >
         <Text>Run tests</Text>
        </TouchableOpacity>
        <View>
          <Text>
            You clicked { this.state.count } times
          </Text>
        </View>
      </View>
     )
   }
 }
 
 const styles = StyleSheet.create({
   container: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
   },
   button: {
     alignItems: 'center',
     backgroundColor: '#DDDDDD',
     padding: 10,
     marginBottom: 10
   }
})
 
export default App;