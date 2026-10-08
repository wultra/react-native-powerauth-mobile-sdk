// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
import {
  PowerAuth,
  PowerAuthAlgorithm,
  PowerAuthBiometryConfiguration,
  PowerAuthConfiguration,
  PowerAuthKeychainConfiguration,
  PowerAuthUtils,
} from 'react-native-powerauth-mobile-sdk';
import { actions, disabledReason, ManualAction, ManualState } from './manual/actions';
import {
  initialEnrollmentUrl,
  initialSdkConfiguration,
  loadServerConfiguration,
  validateConfiguration,
} from './manual/configuration';
import { button, describe, element } from './dom';

export class ManualTesting {
  private sdk: PowerAuth;
  private instance: string;
  private state: ManualState = { configured: false };
  private known = false;
  private busy = true;
  private algorithm?: PowerAuthAlgorithm;
  private authenticateSetup = true;
  private sdkConfig = initialSdkConfiguration;
  private loadedFromServer = false;
  private result = '';
  private failed = false;
  private status = '';
  private dialog?: HTMLDivElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly onBack: () => void,
    private readonly simple = false,
  ) {
    this.instance = simple ? 'config-instance' : 'dev';
    this.sdk = new PowerAuth(this.instance);
    this.render();
    this.refresh().catch((error) => {
      this.failed = true;
      this.result = describe(error);
    }).finally(() => {
      this.busy = false;
      this.render();
    });
  }

  back() {
    if (this.busy) {
      return;
    }
    if (this.dialog) {
      this.closeDialog();
      this.render();
    } else {
      this.onBack();
    }
  }

  private async refresh(fetchStatus = false) {
    this.known = false;
    const configured = await this.sdk.isConfigured();
    this.state = { configured };
    this.known = true;
    if (!configured || this.simple) {
      this.status = configured ? 'SDK is configured.' : 'SDK is not configured.';
      return;
    }
    const warnings: string[] = [];
    const details: Record<string, unknown> = { instance: this.instance, configured };
    const read = async <K extends keyof ManualState>(key: K, call: () => Promise<ManualState[K]>) => {
      try {
        this.state[key] = await call();
      } catch (error) {
        warnings.push(`${key}: ${describe(error)}`);
      }
    };
    await read('hasValidActivation', () => this.sdk.hasValidActivation());
    if (fetchStatus && this.state.hasValidActivation) {
      try {
        details.activationStatus = await this.sdk.fetchActivationStatus();
      } catch (error) {
        warnings.push(describe(error));
      }
    }
    await Promise.all([
      read('hasValidActivation', () => this.sdk.hasValidActivation()),
      read('hasPendingActivation', () => this.sdk.hasPendingActivation()),
      read('canStartActivation', () => this.sdk.canStartActivation()),
      read('hasBiometryFactor', () => this.sdk.hasBiometryFactor()),
      read('biometricStatus', () => this.sdk.getBiometricStatus()),
      read('currentAlgorithm', () => this.sdk.currentAlgorithm),
      read('hasProtocolUpgradeAvailable', () => this.sdk.hasProtocolUpgradeAvailable()),
    ]);
    this.status = describe({ ...details, ...this.state });
    if (warnings.length) {
      this.status += '\n' + warnings.join('\n');
    }
  }

  private async run(operation: () => Promise<unknown>, refreshAfter = true) {
    if (this.busy) {
      return;
    }
    this.busy = true;
    this.failed = false;
    this.result = '';
    this.render();
    try {
      this.result = describe(await operation());
    } catch (error) {
      this.failed = true;
      this.result = describe(error);
    } finally {
      if (refreshAfter) {
        try {
          await this.refresh();
        } catch (error) {
          this.known = false;
          this.failed = true;
          this.result = describe(error);
        }
      }
      this.busy = false;
      this.render();
    }
  }

  private select(label: string, value: string, options: { value: string; label: string }[], change: (value: string) => void) {
    const field = element('label', label);
    const select = element('select');
    select.setAttribute('aria-label', label);
    for (const option of options) {
      const item = element('option', option.label);
      item.value = option.value;
      select.append(item);
    }
    select.value = value;
    select.disabled = this.busy || !!this.dialog;
    select.addEventListener('change', () => change(select.value));
    field.append(select);
    return field;
  }

  private closeDialog() {
    if (!this.dialog) {
      return;
    }
    this.dialog.querySelectorAll('input, textarea').forEach((input) => {
      (input as HTMLInputElement | HTMLTextAreaElement).value = '';
    });
    this.dialog.remove();
    this.dialog = undefined;
  }

  private async openAction(action: ManualAction) {
    if (this.busy || this.dialog || disabledReason(action, this.state)) {
      return;
    }
    if (!action.fields.length && !action.confirmation) {
      await this.run(() => action.execute(this.sdk, {}), action.refreshState ?? false);
      return;
    }
    await this.run(async () => {
      const defaults = await action.initialValues?.() ?? {};
      const dialog = this.dialog = element('div');
      dialog.className = 'modal';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.setAttribute('aria-label', action.label);
      dialog.append(element('h2', action.label));
      const form = element('form');
      if (action.confirmation) {
        form.append(element('p', action.confirmation));
      }
      const inputs = new Map<string, HTMLInputElement | HTMLTextAreaElement>();
      for (const field of action.fields) {
        const label = element('label', field.label);
        const input = field.multiline && !field.secure ? element('textarea') : element('input');
        if (input instanceof HTMLInputElement) {
          input.type = field.secure ? 'password' : 'text';
        }
        input.name = field.key;
        input.setAttribute('aria-label', field.label);
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.setAttribute('autocapitalize', 'none');
        input.required = true;
        input.value = defaults[field.key] ?? field.defaultValue ?? '';
        if (field.numeric) {
          input.inputMode = 'numeric';
          input.value = input.value.replace(/[^0-9]/g, '');
          input.addEventListener('input', () => { input.value = input.value.replace(/[^0-9]/g, ''); });
        }
        inputs.set(field.key, input);
        label.append(input);
        form.append(label);
      }
      const submit = element('button', action.confirmation ? 'Confirm' : 'Submit');
      submit.type = 'submit';
      form.append(submit, button('Cancel', () => this.back()));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (this.busy || !form.reportValidity()) {
          return;
        }
        const values = Object.fromEntries([...inputs].map(([key, input]) => [key, input.value]));
        this.closeDialog();
        this.run(async () => {
          try {
            return await action.execute(this.sdk, values);
          } finally {
            for (const field of action.fields) {
              if (field.secure) {
                values[field.key] = '';
              }
            }
          }
        }, action.refreshState ?? false);
      });
      dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          this.back();
        }
      });
      dialog.append(form);
      document.body.append(dialog);
      (form.querySelector('input, textarea, button') as HTMLElement | null)?.focus();
      return '';
    }, false);
  }

  private render() {
    const blocked = this.busy || !!this.dialog;
    this.root.replaceChildren(
      button('Back', () => this.back(), blocked),
      element('h1', this.simple ? 'Simple Configuration' : 'PowerAuth Testing'),
    );
    this.root.setAttribute('aria-busy', String(this.busy));
    if (!this.simple) {
      this.root.append(this.select('PowerAuth instance', this.instance,
        ['dev', 'testID2', 'invalid-instance'].map((id) => ({ value: id, label: id })),
        (id) => { this.run(async () => {
          if (await this.sdk.isConfigured()) {
            await this.sdk.deconfigure();
          }
          this.instance = id;
          this.sdk = new PowerAuth(id);
          return '';
        }); }));
    }
    const configStatus = element('p', this.loadedFromServer
      ? '✓ SDK configuration loaded from server'
      : this.sdkConfig ? 'SDK configuration provided by environment' : 'SDK configuration not loaded');
    configStatus.className = this.loadedFromServer ? 'success' : '';
    configStatus.setAttribute('role', 'status');
    this.root.append(configStatus);
    if (this.known && !this.state.configured) {
      this.root.append(button('Get Configuration from Server', () => { this.run(async () => {
        this.sdkConfig = await loadServerConfiguration(this.sdk);
        this.loadedFromServer = true;
        return '';
      }); }, blocked));
      if (!this.simple) {
        this.root.append(this.select('Communication algorithm', this.algorithm ?? '', [
          { value: '', label: 'Native default' },
          ...Object.values(PowerAuthAlgorithm).map((value) => ({ value, label: value })),
        ], (value) => {
          this.algorithm = Object.values(PowerAuthAlgorithm).find((item) => item === value);
        }));
        const label = element('label', 'Authenticate on biometric key setup');
        label.className = 'checkbox';
        const checkbox = element('input');
        checkbox.type = 'checkbox';
        checkbox.checked = this.authenticateSetup;
        checkbox.disabled = blocked;
        checkbox.addEventListener('change', () => { this.authenticateSetup = checkbox.checked; });
        label.prepend(checkbox);
        this.root.append(label);
      }
      this.root.append(button(this.simple ? 'Initialize Configuration' : 'Initialize SDK', () => {
        this.run(async () => {
          if (!(await this.sdk.isConfigured())) {
            validateConfiguration(this.sdkConfig, initialEnrollmentUrl);
            const biometry = new PowerAuthBiometryConfiguration();
            biometry.authenticateOnBiometricKeySetup = this.authenticateSetup;
            await this.sdk.configure(
              new PowerAuthConfiguration(this.sdkConfig.trim(), initialEnrollmentUrl.trim(), this.algorithm),
              this.simple ? { connectionTimeout: 30 } : { enableUnsecureTraffic: false },
              biometry,
              new PowerAuthKeychainConfiguration(),
            );
          }
          return 'SDK is configured.';
        });
      }, blocked));
    }
    if (this.simple && this.known && this.state.configured) {
      this.root.append(button('Deconfigure', () => { this.run(() => this.sdk.deconfigure()); }, blocked));
    }
    if (this.busy || this.result) {
      const result = element('pre', this.busy ? 'Working…' : this.result);
      result.setAttribute('role', this.failed ? 'alert' : 'status');
      result.className = this.failed ? 'error' : '';
      this.root.append(result);
    }
    if (this.status) {
      this.root.append(element('pre', this.status));
    }
    this.root.append(button('Refresh Status', () => { this.run(() => this.refresh(true), false); }, blocked));
    if (!this.simple) {
      for (const section of new Set(actions.map((action) => action.section))) {
        this.root.append(element('h2', section));
        for (const action of actions.filter((item) => item.section === section)) {
          this.root.append(button(action.label, () => { this.openAction(action); }, blocked || !!disabledReason(action, this.state)));
        }
      }
      this.root.append(element('h2', 'PowerAuth Utils'), button('Fetch environment info', () => {
        this.run(() => PowerAuthUtils.getEnvironmentInfo(), false);
      }, blocked));
    }
  }
}
