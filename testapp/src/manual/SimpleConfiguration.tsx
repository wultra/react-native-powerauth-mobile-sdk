// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-native';
import {
  PowerAuth,
  PowerAuthConfiguration,
} from 'react-native-powerauth-mobile-sdk';
import { ConfigurationStatus, Page, Result, describe } from './components';
import {
  initialEnrollmentUrl,
  initialSdkConfiguration,
  loadServerConfiguration,
  validateConfiguration,
} from './configuration';

export function SimpleConfiguration({ onBack }: { onBack(): void }) {
  const sdk = useRef(new PowerAuth('config-instance')).current;
  const lock = useRef(true);
  const [busy, setBusy] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [configurationKnown, setConfigurationKnown] = useState(false);
  const [sdkConfig, setSdkConfig] = useState(initialSdkConfiguration);
  const [loadedFromServer, setLoadedFromServer] = useState(false);
  const endpoint = initialEnrollmentUrl;
  const [status, setStatus] = useState('Checking configuration…');
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      const current = await sdk.isConfigured();
      if (active) {
        setConfigured(current);
        setConfigurationKnown(true);
        setStatus(current ? 'SDK is configured.' : 'Instance is not configured.');
      }
    })().catch((e) => {
      if (active) {
        setError(true);
        setStatus(describe(e));
      }
    }).finally(() => {
      lock.current = false;
      if (active) {
        setBusy(false);
      }
    });
    return () => {
      active = false;
    };
  }, [sdk]);
  async function loadFromServer() {
    if (lock.current) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      setSdkConfig(await loadServerConfiguration(sdk));
      setLoadedFromServer(true);
      setStatus('Configuration loaded.');
    } catch (e) {
      setError(true);
      setStatus(describe(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function run(deconfigure: boolean) {
    if (lock.current) {
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(false);
    try {
      if (deconfigure) {
        await sdk.deconfigure();
        setConfigured(false);
        setStatus('Instance is not configured.');
      } else {
        if (!(await sdk.isConfigured())) {
          validateConfiguration(sdkConfig, endpoint);
          await sdk.configure(new PowerAuthConfiguration(sdkConfig.trim(), endpoint.trim()), {
            connectionTimeout: 30,
          });
        }
        setConfigured(await sdk.isConfigured());
        setConfigurationKnown(true);
        setStatus('Configuration loaded.');
      }
    } catch (e) {
      setError(true);
      setStatus(describe(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Page title="Simple Configuration" busy={busy} onBack={onBack}>
      <ConfigurationStatus loadedFromServer={loadedFromServer} available={!!sdkConfig.trim()} />
      {configurationKnown && (
        configured ? (
          <Button title="Deconfigure" disabled={busy} onPress={() => run(true)} />
        ) : (
          <>
            <Button title="Get Configuration from Server" disabled={busy} onPress={loadFromServer} />
            <Button title="Initialize Configuration" disabled={busy} onPress={() => run(false)} />
          </>
        )
      )}
      <Result text={busy ? 'Working…' : status} error={error} />
    </Page>
  );
}
