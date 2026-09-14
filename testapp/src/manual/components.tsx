// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function Page({
  title,
  busy,
  onBack,
  children,
}: React.PropsWithChildren<{ title: string; busy: boolean; onBack(): void }>) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) {
        onBack();
      }
      return true;
    });
    return () => subscription.remove();
  }, [busy, onBack]);
  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Button title="Back" onPress={onBack} disabled={busy} />
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {busy && <ActivityIndicator accessibilityLabel="Operation in progress" />}
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Field({
  label,
  value,
  onChange,
  secure = false,
  multiline = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  secure?: boolean;
  multiline?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        secureTextEntry={secure}
        multiline={multiline && !secure}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        style={[styles.input, multiline && !secure && styles.multiline]}
      />
    </View>
  );
}
export function Result({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <Text
      selectable
      accessibilityLiveRegion="polite"
      style={[styles.result, error && styles.error]}
    >
      {text}
    </Text>
  );
}
export function describe(value: unknown): string {
  if (value === undefined) {
    return 'Completed successfully.';
  }
  // PowerAuthError wraps native failures without extending JavaScript Error.
  if (value && typeof value === 'object' && ('code' in value || 'message' in value)) {
    const code = 'code' in value && value.code != null ? String(value.code) : '';
    const message = 'message' in value && value.message != null ? String(value.message) : '';
    if (code || message) {
      return [code, message].filter(Boolean).join(': ');
    }
  }
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f5f7fa' },
  flex: { flex: 1 },
  header: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#ccd5df', gap: 8 },
  title: { fontSize: 23, fontWeight: '700', color: '#142438' },
  content: { padding: 16, gap: 14, paddingBottom: 48 },
  heading: { fontSize: 20, fontWeight: '600', color: '#142438', marginTop: 12 },
  text: { fontSize: 15, color: '#25384c' },
  muted: { fontSize: 13, color: '#526477' },
  field: { gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#8c9fb2',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#fff',
    color: '#142438',
    fontSize: 16,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  result: {
    padding: 12,
    backgroundColor: '#e6eef6',
    color: '#142438',
    borderRadius: 6,
    fontSize: 14,
  },
  error: { backgroundColor: '#fce7e7', color: '#8c1515' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  card: { padding: 12, backgroundColor: '#fff', borderRadius: 8, gap: 8 },
  overlay: { flex: 1, backgroundColor: '#f5f7fa' },
});
