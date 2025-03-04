//
// Copyright 2025 Wultra s.r.o.
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

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Button,
  Appearance,
  NativeEventSubscription,
} from 'react-native';
import { TestExecutor } from './TestExecutor';

const Separator = (): React.ReactNode => (
  <View style={styles.separator} />
);

const App: React.FC = () => {
  const [isDark, setIsDark] = useState(Appearance.getColorScheme() === 'dark');
  const [inProgress, setInProgress] = useState(false);
  const [promptMessage, setPromptMessage] = useState<string | undefined>(undefined);
  const [testsDone, setTestsDone] = useState(0);
  const [testsSkipped, setTestsSkipped] = useState(0);
  const [testsFailed, setTestsFailed] = useState(0);
  const [testsCount, setTestsCount] = useState(0);

  const subscription = useRef<NativeEventSubscription | null>(null);
  const executor = useRef<TestExecutor | null>(null);

  const onPressNotInteractive = () => {
    executor.current?.runTests(false);
  };

  const onPressInteractive = () => {
    executor.current?.runTests(true);
  };

  const onPressCancel = () => {
    executor.current?.cancelTests();
  };

  useEffect(() => {
    subscription.current = Appearance.addChangeListener(() => {
      setIsDark(Appearance.getColorScheme() === 'dark');
    });

    executor.current = new TestExecutor(
      async (_context, message, duration) => {
        setPromptMessage(message);
        await new Promise<void>(resolve => setTimeout(resolve, duration));
        setPromptMessage(' ');
      },
      (progress) => {
        setTestsCount(progress.total);
        setTestsDone(progress.succeeded);
        setTestsSkipped(progress.skipped);
        setTestsFailed(progress.failed);
      },
      (progress) => {
        setInProgress(progress);
      }
    );

    // Cleanup on unmount
    return () => {
      subscription.current?.remove();
      executor.current?.cancelTests();
      executor.current = null;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.promptContainer}>
        <Text style={styles.promptText}>
          {promptMessage ?? ' '}
        </Text>
      </View>
      <View style={styles.progressContainer}>
        <Text style={isDark ? styles.progressTextDark : styles.progressTextLight}>
          {testsDone + testsFailed + testsSkipped} / {testsCount}
        </Text>
      </View>
      <Separator />
      { !inProgress ? (
          <View style={styles.fixToText}>
            <Button title="Run regular" onPress={onPressNotInteractive} />
            <Button title="Run interactive" onPress={onPressInteractive} />
          </View>
        ) : (
          <View style={styles.fixToText}>
            <Button title="Cancel" onPress={onPressCancel} />
          </View>
        )
      }
    </SafeAreaView>
  );
};

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
});

export default App;
