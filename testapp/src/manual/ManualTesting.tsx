// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, Modal, Switch, Text, View } from 'react-native';
import {
  PowerAuth,
  PowerAuthActivationStatus,
  PowerAuthAlgorithm,
  PowerAuthBiometryConfiguration,
  PowerAuthConfiguration,
  PowerAuthKeychainConfiguration,
  PowerAuthUtils,
} from 'react-native-powerauth-mobile-sdk';
import { ManualAction, ManualState, actions, disabledReason } from './actions';
import { ConfigurationStatus, Dropdown, Field, Page, Result, describe, styles } from './components';
import {
  initialEnrollmentUrl,
  initialSdkConfiguration,
  loadServerConfiguration,
  validateConfiguration,
} from './configuration';

type Snapshot = ManualState & {
  activationId?: string;
  activationFingerprint?: string;
  activationStatus?: PowerAuthActivationStatus;
};
const instances = ['dev', 'testID2', 'invalid-instance'];

export function ManualTesting({ onBack }: { onBack(): void }) {
  const sdk = useRef(new PowerAuth('dev'));
  const lock = useRef(true);
  const alive = useRef(true);
  const [instance, setInstance] = useState('dev');
  const [algorithm, setAlgorithm] = useState<PowerAuthAlgorithm>();
  const [authenticateSetup, setAuthenticateSetup] = useState(true);
  const [sdkConfig, setSdkConfig] = useState(initialSdkConfiguration);
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const endpoint = initialEnrollmentUrl;
  const [configurationKnown, setConfigurationKnown] = useState(false);
  const [state, setState] = useState<Snapshot>({ configured: false });
  const [busy, setBusy] = useState(true);
  const [result, setResult] = useState('');
  const [error, setError] = useState(false);
  const [statusErrors, setStatusErrors] = useState('');
  const [dialog, setDialog] = useState<ManualAction>();
  const [showResult, setShowResult] = useState(false);
  const [actionRunning, setActionRunning] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const refresh = useCallback(async (fetchStatus = true) => {
    const configured = await sdk.current.isConfigured();
    setConfigurationKnown(true);
    if (!configured) {
      setState({ configured: false });
      setStatusErrors('');
      return;
    }
    const next: Snapshot = { configured };
    const errors: string[] = [];
    async function read<K extends keyof Snapshot>(key: K, call: () => Promise<Snapshot[K]>) {
      try {
        next[key] = await call();
      } catch (e) {
        errors.push(`${key}: ${describe(e)}`);
      }
    }
    // A status fetch can discover or complete an upgrade; read local state afterwards.
    await read('hasValidActivation', () => sdk.current.hasValidActivation());
    if (fetchStatus && next.hasValidActivation) {
      await read('activationStatus', () => sdk.current.fetchActivationStatus());
    }
    await Promise.all([
      read('hasValidActivation', () => sdk.current.hasValidActivation()),
      read('canStartActivation', () => sdk.current.canStartActivation()),
      read('hasPendingActivation', () => sdk.current.hasPendingActivation()),
      read('activationId', () => sdk.current.getActivationIdentifier()),
      read('activationFingerprint', () => sdk.current.getActivationFingerprint()),
      read('hasBiometryFactor', () => sdk.current.hasBiometryFactor()),
      read('biometricStatus', () => sdk.current.getBiometricStatus()),
      read('currentAlgorithm', () => sdk.current.currentAlgorithm),
      read('hasProtocolUpgradeAvailable', () => sdk.current.hasProtocolUpgradeAvailable()),
    ]);
    if (alive.current) {
      setState(next);
      setStatusErrors(errors.join('\n'));
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    refresh(false).catch((e) => {
      if (alive.current) {
        setError(true);
        setResult(describe(e));
      }
    }).finally(() => {
      lock.current = false;
      if (alive.current) {
        setBusy(false);
      }
    });
    return () => {
      alive.current = false;
    };
  }, [refresh]);

  async function run(label: string, operation: () => Promise<unknown>, refreshAfter = true) {
    if (lock.current) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(false);
    setResult(`${label}…`);
    try {
      const output = await operation();
      if (alive.current) {
        setResult(`${label}\n${describe(output)}`);
      }
    } catch (e) {
      if (alive.current) {
        setError(true);
        setResult(`${label}\n${describe(e)}`);
      }
    } finally {
      if (refreshAfter && alive.current) {
        try {
          await refresh();
        } catch (e) {
          setStatusErrors(describe(e));
          setState({ configured: false });
          setConfigurationKnown(false);
        }
      }
      lock.current = false;
      if (alive.current) {
        setBusy(false);
      }
    }
  }

  async function initialize() {
    await run('Initialize SDK', async () => {
      if (!(await sdk.current.isConfigured())) {
        validateConfiguration(sdkConfig, endpoint);
        const biometry = new PowerAuthBiometryConfiguration();
        biometry.authenticateOnBiometricKeySetup = authenticateSetup;
        await sdk.current.configure(
          new PowerAuthConfiguration(sdkConfig.trim(), endpoint.trim(), algorithm),
          { enableUnsecureTraffic: false },
          biometry,
          new PowerAuthKeychainConfiguration(),
        );
      }
      return 'PowerAuth configured successfully.';
    });
  }

  function switchInstance(next: string) {
    if (next === instance) {
      return;
    }
    run(
      'Select PowerAuth Instance',
      async () => {
        if (await sdk.current.isConfigured()) {
          await sdk.current.deconfigure();
        }
        sdk.current = new PowerAuth(next);
        setInstance(next);
        setConfigurationKnown(false);
        await refresh(false);
        return `Selected ${next}.`;
      },
      false,
    );
  }

  async function openAction(action: ManualAction) {
    if (lock.current || disabledReason(action, state)) {
      return;
    }
    if (action.fields.length || action.confirmation) {
      await run(
        `Prepare ${action.label}`,
        async () => {
          const defaults = Object.fromEntries(
            action.fields.map((field) => [field.key, field.defaultValue ?? '']),
          );
          Object.assign(defaults, await action.initialValues?.());
          setValues(defaults);
          setDialog(action);
          return 'Ready for input.';
        },
        false,
      );
    } else {
      await execute(action, {});
    }
  }

  async function execute(action: ManualAction, input: Record<string, string>) {
    if (lock.current) {
      return;
    }
    setActionRunning(true);
    setDialog(undefined);
    setValues({});
    try {
      await run(
        action.label,
        () => action.execute(sdk.current, input),
        action.refreshState ?? false,
      );
    } finally {
      for (const field of action.fields) {
        if (field.secure) {
          input[field.key] = '';
        }
      }
      setShowResult(true);
      setActionRunning(false);
    }
  }

  const status = [
    ['Instance ID', instance],
    ['Is Initialized', state.configured],
    ['Is Configured', state.configured],
    ['Current Algorithm', state.currentAlgorithm],
    ['Has Valid Activation', state.hasValidActivation],
    ['Can Start Activation', state.canStartActivation],
    ['Has Pending Activation', state.hasPendingActivation],
    ['Activation ID', state.activationId],
    ['Activation Fingerprint', state.activationFingerprint],
    [
      'Activation Status',
      state.activationStatus
        ? `${state.activationStatus.state} (${state.activationStatus.remainingAttempts} auth. attempts left)`
        : undefined,
    ],
    ['Protocol Upgrade Available', state.hasProtocolUpgradeAvailable],
    ['Has Biometry Factor', state.hasBiometryFactor],
    [
      'Biometric Authentication Available',
      state.biometricStatus?.isAuthenticationWithBiometricsAvailable,
    ],
    ['Biometry Type', state.biometricStatus?.biometryType],
    ['Biometric System Status', state.biometricStatus?.systemStatus],
  ]
    .map(([key, value]) => `${key}: ${value ?? 'Unknown'}`)
    .join('\n');
  const sections = [...new Set(actions.map((action) => action.section))];
  return (
    <Page title="PowerAuth Testing App" busy={busy || !!dialog || showResult} onBack={onBack}>
      <Dropdown
        label="PowerAuth instance"
        value={instance}
        options={instances.map((id) => ({ value: id, label: id }))}
        onChange={switchInstance}
        disabled={busy}
      />
      <ConfigurationStatus loadedFromServer={loadedFromServer} available={!!sdkConfig.trim()} />
      {configurationKnown && !state.configured && (
        <>
          <Button
            title="Get Configuration from Server"
            disabled={busy}
            onPress={() =>
              run(
                'Get Configuration from Server',
                async () => {
                  setSdkConfig(await loadServerConfiguration(sdk.current));
                  setLoadedFromServer(true);
                  return 'Configuration loaded.';
                },
                false,
              )
            }
          />
          <Dropdown
            label="Communication algorithm"
            value={algorithm ?? ''}
            options={[
              { value: '', label: 'Native default' },
              ...Object.values(PowerAuthAlgorithm).map((item) => ({ value: item, label: item })),
            ]}
            disabled={busy}
            onChange={(value) => setAlgorithm(Object.values(PowerAuthAlgorithm).find((item) => item === value))}
          />
          <View style={styles.row}>
            <Text style={styles.text}>Authenticate on biometric key setup</Text>
            <Switch
              accessibilityLabel="Authenticate on biometric key setup"
              value={authenticateSetup}
              disabled={busy}
              onValueChange={setAuthenticateSetup}
            />
          </View>
          <Button title="Initialize SDK" disabled={busy} onPress={initialize} />
        </>
      )}
      {busy && <ActivityIndicator accessibilityLabel="Operation in progress" />}
      {!!result && <Result text={result} error={error} />}
      {error && (
        <Button
          title="Dismiss error"
          onPress={() => {
            setError(false);
            setResult('Error dismissed.');
          }}
        />
      )}
      <Text style={styles.heading}>Activation Status</Text>
      <Result text={status} />
      {!!statusErrors && <Result text={`Status refresh warnings\n${statusErrors}`} error />}
      <Button
        title="Refresh Status"
        disabled={busy}
        onPress={() => run('Refresh Status', () => refresh(), false)}
      />
      {sections.map((section) => (
        <View key={section} style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>
            {section}
          </Text>
          {actions
            .filter((action) => action.section === section)
            .map((action) => {
              const reason = disabledReason(action, state);
              return (
                <View key={action.id} style={styles.field}>
                  <Button
                    title={action.label}
                    disabled={busy || !!reason}
                    onPress={() => openAction(action)}
                  />
                </View>
              );
            })}
        </View>
      ))}
      <Text style={styles.heading}>PowerAuth Utils</Text>
      <Button
        title="Fetch environment info"
        disabled={busy}
        onPress={() =>
          run('Fetch environment info', () => PowerAuthUtils.getEnvironmentInfo(), false)
        }
      />
      <Modal
        visible={!!dialog || actionRunning || showResult}
        animationType="slide"
        onRequestClose={() => {
          if (actionRunning) {
            return;
          }
          setDialog(undefined);
          setValues({});
          setShowResult(false);
        }}
      >
        <Page
          title={dialog?.label ?? 'Operation result'}
          busy={actionRunning}
          onBack={() => {
            setDialog(undefined);
            setValues({});
            setShowResult(false);
          }}
        >
          {dialog ? (
            <>
              {!!dialog.confirmation && <Result text={dialog.confirmation} />}
              {dialog.fields.map((field) => (
                <Field
                  key={field.key}
                  label={field.label}
                  secure={field.secure}
                  numeric={field.numeric}
                  multiline={field.multiline}
                  value={values[field.key] ?? ''}
                  onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                />
              ))}
              <Button
                title={dialog.confirmation ? 'Confirm' : 'Submit'}
                onPress={() => execute(dialog, values)}
                disabled={busy || dialog.fields.some((field) => !(values[field.key] ?? '').length)}
              />
              <Button
                title="Cancel"
                disabled={busy}
                onPress={() => {
                  setDialog(undefined);
                  setValues({});
                }}
              />
            </>
          ) : (
            <>
              <Result text={result} error={error} />
              {!!statusErrors && <Result text={`Status refresh warnings\n${statusErrors}`} error />}
              <Button title="Done" disabled={actionRunning} onPress={() => setShowResult(false)} />
            </>
          )}
        </Page>
      </Modal>
    </Page>
  );
}
