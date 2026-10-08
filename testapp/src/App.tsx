// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import Config from 'react-native-config';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AutomatedTests from './AutomatedTests';
import { ManualTesting } from './manual/ManualTesting';
import { SimpleConfiguration } from './manual/SimpleConfiguration';

type Screen = 'home' | 'manual' | 'simple' | 'automatic';

function Example() {
  // The local E2E collector still launches the existing suite without UI input.
  const [screen, setScreen] = useState<Screen>(
    Config.TESTAPP_MODE !== 'manual' && Config.TEST_COLLECTOR_URL ? 'automatic' : 'home',
  );
  const home = () => setScreen('home');
  if (screen === 'automatic') {
    return <AutomatedTests onBack={home} />;
  }
  if (screen === 'manual') {
    return <ManualTesting onBack={home} />;
  }
  if (screen === 'simple') {
    return <SimpleConfiguration onBack={home} />;
  }
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.content}>
        <Text style={styles.title}>PowerAuth Example</Text>
        <Button title="PowerAuth Testing" onPress={() => setScreen('manual')} />
        <Button title="Simple Configuration" onPress={() => setScreen('simple')} />
        <Button title="Automatic & Interactive Tests" onPress={() => setScreen('automatic')} />
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#142438' },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <Example />
    </SafeAreaProvider>
  );
}
