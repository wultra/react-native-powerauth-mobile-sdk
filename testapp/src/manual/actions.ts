// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.

import { Buffer } from 'buffer';
import {
  PowerAuth,
  PowerAuthActivation,
  PowerAuthActivationCodeUtil,
  PowerAuthAlgorithm,
  PowerAuthAuthentication,
  PowerAuthBiometricStatus,
  PowerAuthCryptoUtils,
  PowerAuthErrorCode,
  PowerAuthSecureVaultKeyId,
  PowerAuthSignatureKeyId,
} from 'react-native-powerauth-mobile-sdk';

/** Flutter develop: 7b1d6e466929c5d4035f62858133d8dcf45c9568, test_screen.dart. */
export interface ManualState {
  configured: boolean;
  hasValidActivation?: boolean;
  hasPendingActivation?: boolean;
  canStartActivation?: boolean;
  hasBiometryFactor?: boolean;
  biometricStatus?: PowerAuthBiometricStatus;
  currentAlgorithm?: PowerAuthAlgorithm;
  hasProtocolUpgradeAvailable?: boolean;
}

export interface ManualField {
  key: string;
  label: string;
  secure?: boolean;
  numeric?: boolean;
  multiline?: boolean;
  defaultValue?: string;
}

export type ManualRequirement =
  | 'none'
  | 'configured'
  | 'active'
  | 'pending'
  | 'biometry'
  | 'newBiometry'
  | 'upgrade'
  | 'upgradeBiometry'
  | 'create';

export interface ManualAction {
  id: string;
  section: string;
  label: string;
  fields: ManualField[];
  requirement: ManualRequirement;
  confirmation?: string;
  /** Refresh activation state after mutations, without synchronizing time after time-reset. */
  refreshState?: boolean;
  initialValues?: () => Promise<Record<string, string>>;
  execute: (sdk: PowerAuth, values: Record<string, string>) => Promise<unknown>;
}

export function disabledReason(action: ManualAction, state: ManualState): string | undefined {
  const requirement = action.requirement;
  if (requirement === 'none') {
    return undefined;
  }
  if (!state.configured) {
    return 'Initialize the SDK first.';
  }
  if (requirement === 'configured') {
    return undefined;
  }
  if (requirement === 'create') {
    if (state.hasValidActivation) {
      return 'Remove the existing activation first.';
    }
    return state.hasPendingActivation
      ? 'Persist or remove the pending activation first.'
      : undefined;
  }
  if (requirement === 'pending') {
    return state.hasPendingActivation ? undefined : 'Create an activation first.';
  }
  if (!state.hasValidActivation) {
    return 'A valid activation is required.';
  }
  if (requirement === 'newBiometry' && state.hasBiometryFactor) {
    return 'Biometry factor is already added.';
  }
  if (
    (requirement === 'biometry' || requirement === 'upgradeBiometry') &&
    !state.hasBiometryFactor
  ) {
    return 'Add a biometry factor first.';
  }
  if (
    (requirement === 'upgrade' || requirement === 'upgradeBiometry') &&
    !state.hasProtocolUpgradeAvailable
  ) {
    return 'Protocol upgrade is not available.';
  }
  return undefined;
}

const password: ManualField = { key: 'password', label: 'Password', secure: true, numeric: true };
const data: ManualField = {
  key: 'data',
  label: 'Data',
  multiline: true,
  defaultValue: '{jsonbody: "yes"}',
};
const uri: ManualField = { key: 'uri', label: 'URI ID', defaultValue: '/pa/signature/validate' };
const body: ManualField = { ...data, key: 'body', label: 'Request Body' };
const nonce: ManualField = { key: 'nonce', label: 'Nonce (Base64, 16 bytes)' };
const offlineData: ManualField = { ...data, defaultValue: 'e2pzb25ib2R5OiAieWVzIn0=' };
const toBase64 = (value: string) => Buffer.from(value, 'utf8').toString('base64');
const prompt = (title: string, message: string) => ({ promptTitle: title, promptMessage: message });
const biometry = (title: string) =>
  PowerAuthAuthentication.biometry(prompt(title, `Authenticate for ${title.toLowerCase()}.`));

/** Password input is consumed immediately and never returned in action results. */
async function withPassword<T>(
  sdk: PowerAuth,
  values: Record<string, string>,
  operation: (value: ReturnType<PowerAuth['createPassword']>) => Promise<T>,
  key = 'password',
): Promise<T> {
  const nativePassword = sdk.createPassword();
  try {
    // Creating explicitly lets finally release even when adding a character fails.
    for (const character of values[key]) {
      await nativePassword.addCharacter(character);
    }
    values[key] = '';
    return await operation(nativePassword);
  } finally {
    values[key] = '';
    await nativePassword.release();
  }
}

async function expectReleased(operation: () => Promise<unknown>): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === PowerAuthErrorCode.INVALID_NATIVE_OBJECT
    ) {
      return;
    }
    throw error;
  }
  throw new Error('Native object remained usable after release.');
}

async function secureVault(
  sdk: PowerAuth,
  authentication: PowerAuthAuthentication,
  keyId: PowerAuthSecureVaultKeyId,
): Promise<unknown> {
  const key = await sdk.fetchSecureVaultKey(authentication, keyId);
  try {
    const derived = await key.deriveKey(1000, 32);
    const repeated = await key.deriveKey(1000, 32);
    const bytes = Buffer.from(derived, 'base64').length;
    if (bytes !== 32 || derived !== repeated) {
      throw new Error('Secure Vault derivation is unstable or returned the wrong key size.');
    }
    await key.release();
    await expectReleased(() => key.deriveKey(1000, 32));
    return {
      keyId,
      index: 1000,
      derivedSizeBytes: bytes,
      stableDerivation: true,
      releaseVerified: true,
    };
  } finally {
    await key.release();
  }
}

async function endToEndEncryption(sdk: PowerAuth): Promise<unknown> {
  const encryptor = await sdk.getEncryptorForActivationScope();
  try {
    const initialState = {
      encrypt: await encryptor.canEncryptRequest(),
      decrypt: await encryptor.canDecryptResponse(),
    };
    if (!initialState.encrypt || initialState.decrypt) {
      throw new Error('Unexpected initial encryptor state.');
    }
    const encrypted = await encryptor.encryptRequest(toBase64('{}'));
    const encryptedState = {
      encrypt: await encryptor.canEncryptRequest(),
      decrypt: await encryptor.canDecryptResponse(),
    };
    if (encryptedState.encrypt || !encryptedState.decrypt) {
      throw new Error('Unexpected encryptor state after encryption.');
    }
    const config = await sdk.configuration;
    const version = (await sdk.currentAlgorithm) === PowerAuthAlgorithm.LEGACY ? 'v3' : 'v4';
    const endpoint = `/pa/${version}/user/info`;
    const headers: Record<string, string> = { 'content-type': 'application/json; charset=UTF-8' };
    for (const header of encrypted.requestHeaders) {
      headers[header.name] = header.value;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let responseBody: string;
    try {
      // The native encryptor serializes a UTF-8 JSON envelope, returned by RN as Base64.
      // Sending this as a string preserves its wire bytes on both iOS and Android.
      const response = await fetch(`${config.baseEndpointUrl.replace(/\/+$/, '')}${endpoint}`, {
        method: 'POST',
        headers,
        body: Buffer.from(encrypted.requestBody, 'base64').toString('utf8'),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Encrypted HTTP request failed with status ${response.status}.`);
      }
      responseBody = await response.text();
    } finally {
      clearTimeout(timeout);
    }
    const cleartext = await encryptor.decryptResponse(toBase64(responseBody));
    await expectReleased(() => encryptor.canEncryptRequest());
    return {
      initialState,
      encryptedState,
      releaseVerified: true,
      endpoint,
      decryptedResponse: JSON.parse(Buffer.from(cleartext, 'base64').toString('utf8')),
    };
  } finally {
    await encryptor.release();
  }
}

const activationSection = 'Activation Management';
const signatureSection = 'Signatures & Other';

export const actions: ManualAction[] = [
  {
    id: 'create-activation',
    section: activationSection,
    label: 'Create Activation (Code)',
    requirement: 'create',
    fields: [{ key: 'code', label: 'Activation Code' }],
    refreshState: true,
    execute: async (sdk, values) => {
      if (await sdk.hasValidActivation()) {
        throw new Error('Remove the existing activation first.');
      }
      return sdk.createActivation(
        PowerAuthActivation.createWithActivationCode(values.code, 'flutter-test'),
      );
    },
  },
  ...[false, true].map(
    (bio): ManualAction => ({
      id: bio ? 'persist-biometry' : 'persist-password',
      section: activationSection,
      label: `Persist Activation (${bio ? 'Password+Bio' : 'Password'})`,
      requirement: 'pending',
      fields: [password],
      refreshState: true,
      execute: (sdk, values) =>
        withPassword(sdk, values, async (value) => {
          await sdk.persistActivation(
            bio
              ? PowerAuthAuthentication.persistWithPasswordAndBiometry(
                  value,
                  prompt(
                    'Persist Activation',
                    'Please confirm activation persistence with biometry.',
                  ),
                )
              : PowerAuthAuthentication.persistWithPassword(value),
          );
          return 'Activation persisted successfully.';
        }),
    }),
  ),
  ...[false, true].map(
    (bio): ManualAction => ({
      id: bio ? 'upgrade-biometry' : 'upgrade-password',
      section: activationSection,
      label: `Protocol Upgrade (${bio ? 'Migrate Biometry' : 'PWD'})`,
      requirement: bio ? 'upgradeBiometry' : 'upgrade',
      fields: [password],
      refreshState: true,
      execute: (sdk, values) =>
        withPassword(sdk, values, (value) => sdk.startProtocolUpgrade(value, bio)),
    }),
  ),
  {
    id: 'remove-password',
    section: activationSection,
    label: 'Remove Activation (Password)',
    requirement: 'active',
    fields: [password],
    refreshState: true,
    execute: (sdk, values) =>
      withPassword(sdk, values, async (value) => {
        await sdk.removeActivationWithAuthentication(PowerAuthAuthentication.password(value));
        return 'Activation removed on the server and locally.';
      }),
  },
  {
    id: 'remove-biometry',
    section: activationSection,
    label: 'Remove Activation (Biometry)',
    requirement: 'biometry',
    fields: [],
    refreshState: true,
    execute: async (sdk) => {
      await sdk.removeActivationWithAuthentication(biometry('Remove Activation'));
      return 'Activation removed on the server and locally.';
    },
  },
  {
    id: 'remove-local',
    section: activationSection,
    label: 'Remove Activation (Local Only)',
    requirement: 'configured',
    fields: [],
    refreshState: true,
    confirmation:
      'Remove local activation?',
    execute: async (sdk) => {
      await sdk.removeActivationLocal();
      return 'Local activation removed. The server activation is unchanged.';
    },
  },
  {
    id: 'add-biometry',
    section: 'Biometry Management',
    label: 'Add Biometry Factor',
    requirement: 'newBiometry',
    fields: [password],
    refreshState: true,
    execute: (sdk, values) =>
      withPassword(sdk, values, async (value) => {
        await sdk.addBiometryFactor(
          value,
          prompt('Add Biometry', 'Please authenticate to add biometry.'),
        );
        return 'Biometry factor added.';
      }),
  },
  {
    id: 'remove-biometry-factor',
    section: 'Biometry Management',
    label: 'Remove Biometry Factor',
    requirement: 'biometry',
    fields: [],
    refreshState: true,
    confirmation: 'Remove biometry factor?',
    execute: async (sdk) => {
      await sdk.removeBiometryFactor();
      return 'Biometry factor removed.';
    },
  },
  {
    id: 'validate-password',
    section: 'Password Stuff',
    label: 'Validate Password',
    requirement: 'active',
    fields: [password],
    execute: (sdk, values) =>
      withPassword(sdk, values, async (value) => {
        const change = await sdk.beginPasswordChange(value);
        await change.release();
        return 'Password is valid.';
      }),
  },
  {
    id: 'change-password',
    section: 'Password Stuff',
    label: 'Change Password (Online)',
    requirement: 'active',
    fields: [
      { ...password, label: 'Old Password' },
      { ...password, key: 'newPassword', label: 'New Password' },
    ],
    execute: (sdk, values) =>
      withPassword(sdk, values, async (oldPassword) => {
        const change = await sdk.beginPasswordChange(oldPassword);
        try {
          await withPassword(
            sdk,
            values,
            (value) => sdk.finishPasswordChange(value, change),
            'newPassword',
          );
          return 'Password changed successfully.';
        } finally {
          await change.release();
        }
      }),
  },
  {
    id: 'legacy-key',
    section: 'Secure Vault',
    label: 'Test Legacy Encryption Key (PWD)',
    requirement: 'active',
    fields: [password],
    execute: (sdk, values) =>
      withPassword(sdk, values, async (value) => ({
        index: 1000,
        keySizeBytes: Buffer.from(
          await sdk.fetchEncryptionKey(PowerAuthAuthentication.password(value), 1000),
          'base64',
        ).length,
      })),
  },
  ...[false, true].map(
    (bio): ManualAction => ({
      id: bio ? 'vault-biometry' : 'vault-password',
      section: 'Secure Vault',
      label: `Test Secure Vault (${bio ? 'Bio' : 'PWD'})`,
      requirement: bio ? 'biometry' : 'active',
      fields: bio ? [] : [password],
      execute: (sdk, values) =>
        bio
          ? secureVault(
              sdk,
              biometry('Secure Vault'),
              PowerAuthSecureVaultKeyId.KNOWLEDGE_OR_BIOMETRY,
            )
          : withPassword(sdk, values, (value) =>
              secureVault(
                sdk,
                PowerAuthAuthentication.password(value),
                PowerAuthSecureVaultKeyId.KNOWLEDGE,
              ),
            ),
    }),
  ),
  {
    id: 'e2ee',
    section: 'End-to-End Encryption',
    label: 'Test Activation-Scoped E2EE Round Trip',
    requirement: 'active',
    fields: [],
    execute: endToEndEncryption,
  },
  ...[false, true].map(
    (verify): ManualAction => ({
      id: verify ? 'digital-roundtrip' : 'digital-sign',
      section: signatureSection,
      label: verify
        ? 'Calculate and Verify Digital Signature'
        : 'Sign Data with Device Private Key',
      requirement: verify ? 'active' : 'configured',
      fields: [password, data],
      execute: (sdk, values) =>
        withPassword(sdk, values, async (value) => {
          const bytes = toBase64(values.data);
          const signature = await sdk.calculateDigitalSignature(
            PowerAuthAuthentication.password(value),
            bytes,
            PowerAuthSignatureKeyId.DEVICE_EC,
          );
          if (verify) {
            await sdk.verifyDigitalSignature(signature, bytes, PowerAuthSignatureKeyId.DEVICE_EC);
          }
          return { signature, ...(verify ? { verified: true } : {}) };
        }),
    }),
  ),
  {
    id: 'jws-password',
    section: signatureSection,
    label: 'Calculate JWS Signature (PWD)',
    requirement: 'active',
    fields: [password, data],
    execute: (sdk, values) =>
      withPassword(sdk, values, (value) =>
        sdk.calculateJwsSignature(
          PowerAuthAuthentication.password(value),
          toBase64(values.data),
          undefined,
          false,
          PowerAuthSignatureKeyId.DEVICE,
        ),
      ),
  },
  {
    id: 'csr',
    section: signatureSection,
    label: 'Create Certificate Signing Request',
    requirement: 'active',
    fields: [
      password,
      { key: 'commonName', label: 'Common Name', defaultValue: 'example.com' },
      {
        key: 'sans',
        label: 'SANs (comma-separated)',
        defaultValue: 'DNS: example.com,DNS: www.example.com',
      },
    ],
    execute: (sdk, values) =>
      withPassword(sdk, values, (value) =>
        sdk.createCertificateSigningRequest(
          PowerAuthAuthentication.password(value),
          { CN: values.commonName },
          values.sans
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => (item.includes(':') ? item : `DNS: ${item}`)),
          PowerAuthSignatureKeyId.DEVICE_EC,
        ),
      ),
  },
  {
    id: 'jws-roundtrip',
    section: signatureSection,
    label: 'Calculate and Verify JWS Signature',
    requirement: 'active',
    fields: [password, data],
    execute: (sdk, values) =>
      withPassword(sdk, values, async (value) => {
        const signature = await sdk.calculateJwsSignature(
          PowerAuthAuthentication.password(value),
          toBase64(values.data),
          undefined,
          false,
          PowerAuthSignatureKeyId.DEVICE,
        );
        await sdk.verifyJwsSignature(signature, false, true, PowerAuthSignatureKeyId.DEVICE);
        return { signature, verified: true };
      }),
  },
  {
    id: 'jws-biometry',
    section: signatureSection,
    label: 'Calculate JWS Signature (Bio)',
    requirement: 'biometry',
    fields: [data],
    execute: (sdk, values) =>
      sdk.calculateJwsSignature(
        biometry('JWS Signature'),
        toBase64(values.data),
        undefined,
        false,
        PowerAuthSignatureKeyId.DEVICE,
      ),
  },
  ...[false, true].map(
    (bio): ManualAction => ({
      id: bio ? 'offline-biometry' : 'offline-password',
      section: signatureSection,
      label: `Compute Offline Signature (${bio ? 'Bio' : 'PWD'})`,
      requirement: bio ? 'biometry' : 'active',
      fields: [...(bio ? [] : [password]), uri, offlineData, nonce],
      initialValues: async () => ({ nonce: await PowerAuthCryptoUtils.randomBytes(16) }),
      execute: (sdk, values) => {
        if (!/^[A-Za-z0-9+/]{22}==$/.test(values.nonce)) {
          return Promise.reject(new Error('Nonce must encode exactly 16 bytes in Base64.'));
        }
        const sign = (authentication: PowerAuthAuthentication) =>
          sdk.offlineAuthenticationCode(
            authentication,
            values.uri,
            values.nonce,
            values.data.replace(/\\n/g, '\n'),
          );
        return bio
          ? sign(biometry('Offline Signature'))
          : withPassword(sdk, values, (value) => sign(PowerAuthAuthentication.password(value)));
      },
    }),
  ),
  {
    id: 'verify-server',
    section: signatureSection,
    label: 'Verify Server Signature',
    requirement: 'active',
    fields: [
      { ...data, defaultValue: '' },
      { key: 'signature', label: 'Signature (Base64)', multiline: true },
    ],
    execute: async (sdk, values) => {
      await sdk.verifyDigitalSignature(
        values.signature,
        toBase64(values.data),
        PowerAuthSignatureKeyId.MASTER_EC,
      );
      return 'Server signature verified.';
    },
  },
  ...(['GET', 'POST'] as const).flatMap((method) =>
    [false, true].map(
      (bio): ManualAction => ({
        id: `${method.toLowerCase()}-${bio ? 'biometry' : 'password'}`,
        section: signatureSection,
        label: `Compute ${method} Signature Header (${bio ? 'Bio' : 'PWD'})`,
        requirement: bio ? 'biometry' : 'active',
        fields: [...(bio ? [] : [password]), uri, ...(method === 'POST' ? [body] : [])],
        execute: (sdk, values) => {
          const sign = async (authentication: PowerAuthAuthentication) => {
            const header =
              method === 'GET'
                ? await sdk.authenticationHeaderForRequestWithParams(
                    authentication,
                    method,
                    values.uri,
                  )
                : await sdk.authenticationHeaderForRequestWithBody(
                    authentication,
                    method,
                    values.uri,
                    values.body,
                  );
            return {
              header,
              ...(method === 'POST' ? { payloadBase64: toBase64(values.body) } : {}),
            };
          };
          return bio
            ? sign(biometry(`${method} Signature`))
            : withPassword(sdk, values, (value) => sign(PowerAuthAuthentication.password(value)));
        },
      }),
    ),
  ),
  ...(
    [
      [
        'time-synchronized',
        'Is Time Synchronized',
        async (sdk: PowerAuth) => ({
          synchronized: await sdk.timeSynchronizationService.isTimeSynchronized(),
        }),
      ],
      [
        'time-adjustment',
        'Get Local Time Adjustment',
        async (sdk: PowerAuth) => ({
          milliseconds: await sdk.timeSynchronizationService.localTimeAdjustment(),
        }),
      ],
      [
        'time-precision',
        'Get Local Time Adjustment Precision',
        async (sdk: PowerAuth) => ({
          milliseconds: await sdk.timeSynchronizationService.localTimeAdjustmentPrecision(),
        }),
      ],
      [
        'time-current',
        'Get Current Time',
        async (sdk: PowerAuth) => {
          const milliseconds = await sdk.timeSynchronizationService.currentTime();
          return { milliseconds, iso: new Date(milliseconds).toISOString() };
        },
      ],
      [
        'time-sync',
        'Synchronize Time',
        async (sdk: PowerAuth) => {
          await sdk.timeSynchronizationService.synchronizeTime();
          return 'Time synchronized successfully.';
        },
      ],
      [
        'time-reset',
        'Reset Time Synchronization',
        async (sdk: PowerAuth) => {
          await sdk.timeSynchronizationService.resetTimeSynchronization();
          return 'Time synchronization reset.';
        },
      ],
    ] satisfies Array<[string, string, (sdk: PowerAuth) => Promise<unknown>]>
  ).map(
    ([id, label, execute]): ManualAction => ({
      id,
      label,
      execute,
      section: 'Time Synchronization',
      requirement: 'configured',
      fields: [],
    }),
  ),
  {
    id: 'parse-code',
    section: 'Validation Utilities',
    label: 'Parse Activation Code',
    requirement: 'none',
    fields: [{ key: 'code', label: 'Activation Code (with optional signature)' }],
    execute: (_sdk, values) => PowerAuthActivationCodeUtil.parseActivationCode(values.code),
  },
  {
    id: 'validate-code',
    section: 'Validation Utilities',
    label: 'Validate Activation Code',
    requirement: 'none',
    fields: [{ key: 'code', label: 'Activation Code (no signature)' }],
    execute: async (_sdk, values) => ({
      valid: await PowerAuthActivationCodeUtil.validateActivationCode(values.code),
    }),
  },
  ...[false, true].map(
    (correct): ManualAction => ({
      id: correct ? 'correct-character' : 'validate-character',
      section: 'Validation Utilities',
      label: correct ? 'Correct Typed Character' : 'Validate Typed Character',
      requirement: 'none',
      fields: [
        {
          key: 'character',
          label: correct ? 'Enter ONE character (e.g., 0, 1, a)' : 'Enter ONE character',
        },
      ],
      execute: async (_sdk, values) => {
        if (values.character.length !== 1) {
          throw new Error('Please enter exactly one character.');
        }
        if (!correct) {
          return {
            valid: await PowerAuthActivationCodeUtil.validateTypedCharacter(
              values.character.charCodeAt(0),
            ),
          };
        }
        const codePoint = await PowerAuthActivationCodeUtil.correctTypedCharacter(
          values.character.charCodeAt(0),
        );
        return { character: String.fromCharCode(codePoint), codePoint };
      },
    }),
  ),
];
