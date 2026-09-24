// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
import Config from 'react-native-config';
import type { PowerAuth } from 'react-native-powerauth-mobile-sdk';
import { fetchServerConfiguration } from './serverConfiguration';

export const initialSdkConfiguration = Config.SDK_CONFIG || '';
export const initialEnrollmentUrl = Config.ENROLLMENT_SERVER_URL || Config.ENROLLMENT_URL || '';

export function validateConfiguration(configuration: string, endpoint: string) {
  if (!configuration.trim()) {
    throw new Error('Get the SDK configuration from the server or set SDK_CONFIG in .env.');
  }
  if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(endpoint.trim())) {
    throw new Error('Set a valid HTTPS ENROLLMENT_SERVER_URL in .env, then rebuild the app.');
  }
}

export async function loadServerConfiguration(sdk: Pick<PowerAuth, 'isConfigured'>): Promise<string> {
  if (await sdk.isConfigured()) {
    throw new Error('Deconfigure the SDK before loading configuration from the server.');
  }
  return fetchServerConfiguration({
    url: Config.POWERAUTH_CLOUD_URL || '',
    applicationId: Config.POWERAUTH_CLOUD_APP_ID || '',
    username: Config.POWERAUTH_CLOUD_USERNAME || '',
    password: Config.POWERAUTH_CLOUD_PASSWORD || '',
  });
}
