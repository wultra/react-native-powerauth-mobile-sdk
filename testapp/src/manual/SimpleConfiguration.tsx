// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-native';
import {
  PowerAuth,
  PowerAuthConfiguration,
  PowerAuthConfigurationType,
} from 'react-native-powerauth-mobile-sdk';
import { Field, Page, Result, describe } from './components';
import {
  initialEnrollmentUrl,
  initialSdkConfiguration,
  loadServerConfiguration,
  validateConfiguration,
} from './configuration';

export function SimpleConfiguration({ onBack }: { onBack(): void }) {
  const sdk = useRef(new PowerAuth('config-instance')).current;
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [configuration, setConfiguration] = useState<PowerAuthConfigurationType>();
  const [sdkConfig, setSdkConfig] = useState(initialSdkConfiguration);
  const [endpoint, setEndpoint] = useState(initialEnrollmentUrl);
  const [status, setStatus] = useState('Checking configuration…');
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    (async () => {
      if (await sdk.isConfigured()) {
        const current = await sdk.configuration;
        if (active) {
          setConfiguration(current);
          setStatus('Configuration loaded.');
        }
      } else if (active) {
        setStatus('Instance is not configured.');
      }
    })().catch((e) => {
      if (active) {
        setError(true);
        setStatus(describe(e));
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
      setSdkConfig(await loadServerConfiguration());
      setStatus('Configuration loaded. Review the enrollment URL, then Initialize Configuration.');
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
        setConfiguration(undefined);
        setStatus('Instance is not configured.');
      } else {
        if (!(await sdk.isConfigured())) {
          validateConfiguration(sdkConfig, endpoint);
          await sdk.configure(new PowerAuthConfiguration(sdkConfig.trim(), endpoint.trim()), {
            connectionTimeout: 30,
          });
        }
        setConfiguration(await sdk.configuration);
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
      {configuration ? (
        <>
          <Result
            text={`baseEndpointUrl: ${configuration.baseEndpointUrl}\nconfiguration: ${configuration.configuration.slice(0, 50)}`}
          />
          <Button title="Deconfigure" disabled={busy} onPress={() => run(true)} />
        </>
      ) : (
        <>
          <Button title="Get Configuration from Server" disabled={busy} onPress={loadFromServer} />
          <Field
            label="SDK configuration"
            value={sdkConfig}
            onChange={setSdkConfig}
            disabled={busy}
            multiline
          />
          <Field label="Enrollment URL" value={endpoint} onChange={setEndpoint} disabled={busy} />
          <Button title="Initialize Configuration" disabled={busy} onPress={() => run(false)} />
        </>
      )}
      <Result text={busy ? 'Working…' : status} error={error} />
    </Page>
  );
}
